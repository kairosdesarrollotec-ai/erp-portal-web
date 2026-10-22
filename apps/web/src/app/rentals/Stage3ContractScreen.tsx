import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import {
  evaluateNotary,
  approveNotaryException,
  formalizeContract,
  getContractTemplate,
  setCompanyDriverDailyRate,
  RentalCommandError,
  NotaryEvaluationResponse,
  ContractHolderType,
  ContractTemplateSelectionResponse,
} from './rentals-client';
import { usePermissions } from '../shared/usePermissions';
import { SignaturePad } from '../shared/SignaturePad';
import { computeGuaranteeBreakdown, formatPen } from './guarantee-breakdown';
import { describeRentalError } from './rental-errors';
import styles from './RentalStageForms.module.css';

/** DEC-ALQ-DRIVERRATE-001: monto > 0, maximo 2 decimales y hasta 8 enteros (DECIMAL(10,2)); mismo patron que el backend. */
const DAILY_RATE_PATTERN = /^(?!0+(\.0{1,2})?$)\d{1,8}(\.\d{1,2})?$/;

const NOTARY_RESULT_LABELS: Record<string, string> = {
  MANDATORY: 'Notaría obligatoria',
  DOUBLE_DEPOSIT: 'Doble depósito de garantía',
  THIRD_PATH_ELIGIBLE: 'Elegible para tercer camino (requiere aprobación)',
  MANUAL_REVIEW: 'Revisión manual requerida',
};

/**
 * ENTREGA-03 / ALQ-07 (excepción notarial) + ALQ-08 (garantía y contrato). Mapea a evaluate-notary,
 * approve-notary-exception, formalize-contract). Para los 4 modelos de
 * notaría obligatoria (Hilux, Colorado, Verna, Yaris - BR-ALQ-003) el
 * backend siempre devuelve MANDATORY y no hay alternativa que mostrar.
 */
export function Stage3ContractScreen() {
  const { id, state, rental, context, getIdToken, setRental } = useRentalWizard();
  const navigate = useNavigate();
  // Aprobar la excepcion notarial es un permiso explicito (RENTAL.APPROVE_NOTARY_EXCEPTION), no un rol.
  const { can } = usePermissions();
  const canApproveNotaryException = can('RENTAL', 'APPROVE_NOTARY_EXCEPTION');
  // La tarifa del conductor de la empresa se digita con el mismo permiso que formaliza el contrato (RENTAL.FORMALIZE_CONTRACT).
  const canSetDriverRate = can('RENTAL', 'FORMALIZE_CONTRACT');

  const [evaluation, setEvaluation] = useState<NotaryEvaluationResponse | null>(rental?.notaryEvaluation ?? null);
  const [justification, setJustification] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [payer, setPayer] = useState<'TITULAR' | 'AGENTE_EXTERNO'>('TITULAR');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [holderType, setHolderType] = useState<ContractHolderType>('NATURAL');
  const [withCompanyDriver, setWithCompanyDriver] = useState(false);
  const [driverRate, setDriverRate] = useState('');
  const [rateBusy, setRateBusy] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateSaved, setRateSaved] = useState(false);
  const [templateSel, setTemplateSel] = useState<ContractTemplateSelectionResponse | null>(null);
  const [templateState, setTemplateState] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');

  useEffect(() => {
    async function runEvaluation() {
      if (!rental || !context || rental.notaryEvaluation || evaluation) return;
      setEvaluating(true);
      try {
        const idToken = await getIdToken();
        const result = await evaluateNotary(idToken, id, context.companyId, context.branchId, rental.version);
        setRental(result.rental);
        setEvaluation(result.evaluation);
      } catch {
        setError('No pudimos evaluar la matriz notarial. Intenta de nuevo.');
      } finally {
        setEvaluating(false);
      }
    }
    void runEvaluation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rental?.id]);

  // Si el alquiler ya tiene una tarifa manual, se muestra en el campo.
  const manualRate = rental?.companyDriverCharge?.source === 'MANUAL' ? rental.companyDriverCharge.dailyRate : null;
  const [syncedManualRate, setSyncedManualRate] = useState<string | null>(null);
  if (manualRate && manualRate !== syncedManualRate) {
    setSyncedManualRate(manualRate);
    setDriverRate(manualRate);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadTemplate() {
      if (!rental || !context) return;
      setTemplateState('LOADING');
      try {
        const idToken = await getIdToken();
        const sel = await getContractTemplate(idToken, id, context.companyId, context.branchId, {
          holderType,
          withCompanyDriver,
        });
        if (cancelled) return;
        setTemplateSel(sel);
        setTemplateState('READY');
      } catch {
        if (cancelled) return;
        setTemplateSel(null);
        setTemplateState('ERROR');
      }
    }
    void loadTemplate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rental?.id, holderType, withCompanyDriver]);

  const needsException = evaluation && (evaluation.result === 'MANUAL_REVIEW' || evaluation.result === 'THIRD_PATH_ELIGIBLE');
  const exceptionResolved = !needsException || !!evaluation?.approvedBy;
  const depositMinimum = rental?.vehicleDepositMinimum ?? null;
  const paymentAmountNum = paymentAmount ? parseFloat(paymentAmount) : null;
  const depositBelowMinimum = depositMinimum != null && paymentAmountNum != null && paymentAmountNum < depositMinimum;
  const breakdown = computeGuaranteeBreakdown(paymentAmountNum, rental?.reservationCredit ?? null);
  const hasTemplate = templateState === 'READY' && !!templateSel?.template;
  // Con conductor de la empresa NO hay garantia (DEC-ALQ-COMPANY-DRIVER-004): se omite el cobro.
  const noDeposit = withCompanyDriver;
  const appliedCredit = rental?.reservationCredit?.applied ? parseFloat(rental.reservationCredit.creditAmount) || 0 : 0;
  const companyDriverCreditBalance = noDeposit ? appliedCredit : 0;
  // DEC-ALQ-DRIVERRATE-001 (F-02): tarifa diaria del conductor de la empresa. La variante solo se conoce en el contrato
  // formalizado; antes de formalizar vale lo marcado en el checkbox y la tarifa digitada se guarda justo despues.
  const contractIsCompanyDriver = !!rental?.contract?.contractVariant?.endsWith('_WITH_DRIVER');
  const showDriverRate = withCompanyDriver || contractIsCompanyDriver;
  const driverRateTrim = driverRate.trim();
  const driverRateValid = driverRateTrim === '' || DAILY_RATE_PATTERN.test(driverRateTrim);
  const driverCharge = rental?.companyDriverCharge ?? null;
  // Respuestas 2026-10-20 #2 (rentals.yaml 1.12.0): con conductor de la empresa la tarifa diaria es OBLIGATORIA (se digita a mano)
  // y solo se puede editar mientras el alquiler esté en PENDING_DELIVERY (o antes de formalizar); después, 409 COMPANY_DRIVER_RATE_CLOSED.
  const rateClosed =
    !!rental && ['ACTIVE', 'EXTENSION_PENDING', 'RETURN_IN_PROGRESS', 'CLOSED', 'CANCELLED'].includes(rental.status);
  const rateDefined = driverCharge?.source === 'MANUAL';
  const canFormalize =
    (!withCompanyDriver || (driverRateTrim !== '' && driverRateValid)) &&
    exceptionResolved &&
    !!signatureData &&
    (noDeposit || (!!paymentAmount && !depositBelowMinimum)) &&
    !rental?.contract &&
    hasTemplate;

  async function handleApproveException() {
    if (!rental || !context || justification.trim().length < 10) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await approveNotaryException(
        idToken,
        id,
        context.companyId,
        context.branchId,
        rental.version,
        justification.trim(),
      );
      setRental(updated);
      if (updated.notaryEvaluation) setEvaluation(updated.notaryEvaluation);
    } catch (err) {
      if (err instanceof RentalCommandError) setError(err.message);
      else setError('No pudimos aprobar la excepción.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFormalize() {
    if (!rental || !context) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      // templateVersionId se omite: el backend resuelve la plantilla ACTIVE
      // vigente de la empresa (BR-DOC-002).
      const updated = await formalizeContract(
        idToken,
        id,
        context.companyId,
        context.branchId,
        rental.version,
        `CONTRATO-${rental.id.slice(0, 8)}`,
        noDeposit ? null : paymentAmount,
        noDeposit ? null : 'PEN',
        undefined,
        signatureData ?? undefined,
        { holderType, withCompanyDriver },
      );
      // La tarifa digitada se guarda tras formalizar (antes no existe contrato con la variante del conductor).
      if (withCompanyDriver && driverRateTrim && canSetDriverRate) {
        try {
          const withRate = await setCompanyDriverDailyRate(
            idToken,
            id,
            context.companyId,
            context.branchId,
            updated.version,
            driverRateTrim,
          );
          setRental(withRate);
        } catch (rateErr) {
          setRental(updated);
          setConfirmOpen(false);
          setRateError(
            `El contrato quedó formalizado, pero no pudimos guardar la tarifa diaria: ${describeRentalError(rateErr, 'intenta de nuevo')} ` +
              'Digítala en «Servicio de conductor de la empresa» y pulsa «Guardar tarifa».',
          );
          return;
        }
      } else {
        setRental(updated);
      }
      setConfirmOpen(false);
      navigate(`/alquileres/${id}/entrega-04`, { state: context });
    } catch (err) {
      if (err instanceof RentalCommandError) {
        setError(describeRentalError(err, err.message));
      } else setError('No pudimos formalizar el contrato.');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDriverRate() {
    if (!rental || !context || !driverRateValid || !driverRateTrim) return;
    setRateBusy(true);
    setRateError(null);
    setRateSaved(false);
    try {
      const idToken = await getIdToken();
      const updated = await setCompanyDriverDailyRate(
        idToken,
        id,
        context.companyId,
        context.branchId,
        rental.version,
        driverRateTrim,
      );
      setRental(updated);
      setRateSaved(true);
    } catch (err) {
      setRateError(describeRentalError(err, 'No pudimos guardar la tarifa diaria.'));
    } finally {
      setRateBusy(false);
    }
  }

  if (state === 'LOADING') return <p className={styles.statusText}>Cargando expediente…</p>;
  if (state === 'RECOVERABLE_ERROR' || state === 'NOT_FOUND' || !rental) {
    return <p className={styles.statusText}>No pudimos cargar el expediente. Intenta de nuevo.</p>;
  }

  return (
    <RentalWizardShell
      stage={3}
      title="Garantía y contrato"
      onContinue={() => setConfirmOpen(true)}
      continueLabel="Formalizar y continuar"
      continueDisabled={!canFormalize}
      continueBusy={busy}
      errorMessage={error}
    >
      <section className={styles.reviewSection}>
        <p className={styles.reviewSectionTitle}>Evaluación notarial</p>
        {evaluating && <p className={styles.statusText}>Evaluando matriz notarial…</p>}
        {evaluation && (
          <>
            <span className={styles.statusBadge}>{NOTARY_RESULT_LABELS[evaluation.result] ?? evaluation.result}</span>
            <p className={styles.summaryLine}>{evaluation.reason}</p>
          </>
        )}
      </section>

      {needsException && !evaluation?.approvedBy && (
        <fieldset className={styles.fieldset}>
          <legend>Excepción notarial</legend>
          <label className={styles.fieldLabel}>
            Motivo / justificación
            <textarea
              className={styles.textarea}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
            />
          </label>
          {canApproveNotaryException ? (
            <button type="button" className={styles.retryButton} onClick={handleApproveException} disabled={busy}>
              Aprobar excepción
            </button>
          ) : (
            <p className={styles.blockedNotice}>No tienes permiso para aprobar o rechazar esta excepción notarial.</p>
          )}
        </fieldset>
      )}

      <fieldset className={styles.fieldset}>
        <legend>Plantilla del contrato</legend>
        <div className={styles.chipRow} role="group" aria-label="Tipo de titular">
          <button
            type="button"
            aria-pressed={holderType === 'NATURAL'}
            className={`${styles.chip} ${holderType === 'NATURAL' ? styles.chipActive : ''}`}
            onClick={() => setHolderType('NATURAL')}
          >
            Persona natural
          </button>
          <button
            type="button"
            aria-pressed={holderType === 'LEGAL'}
            className={`${styles.chip} ${holderType === 'LEGAL' ? styles.chipActive : ''}`}
            onClick={() => setHolderType('LEGAL')}
          >
            Persona jurídica
          </button>
        </div>
        <label className={styles.fieldLabel}>
          <input type="checkbox" checked={withCompanyDriver} onChange={(e) => setWithCompanyDriver(e.target.checked)} />
          {' '}Con conductor de la empresa
        </label>
        {templateState === 'LOADING' && <p className={styles.statusText}>Buscando plantilla…</p>}
        {templateState === 'ERROR' && (
          <p className={styles.blockedNotice} role="alert">
            No pudimos consultar la plantilla del contrato. Intenta de nuevo.
          </p>
        )}
        {templateState === 'READY' && templateSel?.template && (
          <p className={styles.summaryLine}>
            Plantilla: <strong>{templateSel.template.name}</strong>
          </p>
        )}
        {templateState === 'READY' && templateSel?.template && templateSel.fallbackUsed && (
          <p className={styles.fieldHint} role="status">
            Aún no hay plantilla específica para esta combinación; se usará la plantilla general de alquiler.
          </p>
        )}
        {templateState === 'READY' && !templateSel?.template && (
          <p className={styles.blockedNotice} role="alert">
            No hay plantilla de contrato vigente para esta combinación. Pide a Administración que cargue una antes de formalizar.
          </p>
        )}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Firma del contrato</legend>
        <SignaturePad onChange={setSignatureData} />
        {!signatureData && (
          <p className={styles.fieldHint}>La firma del cliente es obligatoria para continuar.</p>
        )}
      </fieldset>

      {showDriverRate && (
        <fieldset className={styles.fieldset} data-testid="company-driver-rate">
          <legend>Servicio de conductor de la empresa</legend>
          <p className={styles.summaryLine}>Servicio de conductor: tarifa diaria × días (sin garantía).</p>
          <label className={styles.fieldLabel} htmlFor="company-driver-daily-rate">
            Tarifa diaria del conductor (S/)
          </label>
          <input
            id="company-driver-daily-rate"
            className={styles.input}
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={driverRate}
            onChange={(e) => {
              setDriverRate(e.target.value);
              setRateSaved(false);
            }}
            disabled={!canSetDriverRate || rateBusy || rateClosed}
            required
            aria-invalid={!driverRateValid}
            aria-describedby="company-driver-rate-hint"
          />
          <span id="company-driver-rate-hint" className={styles.fieldHint}>
            Obligatoria. Monto mayor que 0 con máximo 2 decimales; se digita a mano en cada alquiler y solo se puede cambiar hasta
            completar la entrega.
          </span>
          {rateClosed && (
            <p className={styles.blockedNotice} role="status" data-testid="driver-rate-closed">
              La tarifa diaria ya no se puede cambiar: el proceso de alquiler terminó (la entrega ya se completó).
            </p>
          )}
          {!driverRateValid && (
            <span className={styles.evidenceError} role="alert">
              La tarifa diaria debe ser mayor que 0 y tener como máximo 2 decimales.
            </span>
          )}
          {!canSetDriverRate && (
            <p className={styles.blockedNotice}>No tienes permiso para digitar la tarifa diaria del conductor.</p>
          )}
          {contractIsCompanyDriver && !rateDefined && (
            <p className={styles.blockedNotice} role="status" data-testid="driver-rate-not-defined">
              Tarifa diaria no definida: digítala y pulsa «Guardar tarifa»; sin ella no se puede continuar a la entrega ni terminar el alquiler.
            </p>
          )}
          {contractIsCompanyDriver && driverCharge?.source === 'ENV' && (
            <p className={styles.fieldHint} role="status" data-testid="driver-rate-env">
              Referencia del sistema: {formatPen(parseFloat(driverCharge.dailyRate))} por día. No sustituye a la tarifa digitada: debes
              digitar la tarifa de este alquiler.
            </p>
          )}
          {contractIsCompanyDriver && driverCharge?.source === 'MANUAL' && (
            <p className={styles.summaryLine} role="status" data-testid="driver-rate-manual">
              Tarifa digitada en este alquiler: {formatPen(parseFloat(driverCharge.dailyRate))} por día × {driverCharge.days} día(s) ={' '}
              {formatPen(parseFloat(driverCharge.total))}.
            </p>
          )}
          {!contractIsCompanyDriver && !driverRateTrim && (
            <p className={styles.fieldHint} role="status" data-testid="driver-rate-pending">
              Falta digitar la tarifa diaria del conductor: es obligatoria para formalizar el contrato y terminar el alquiler.
            </p>
          )}
          {!contractIsCompanyDriver && driverRateTrim && driverRateValid && (
            <p className={styles.fieldHint} role="status">
              La tarifa se guardará al formalizar el contrato.
            </p>
          )}
          {contractIsCompanyDriver && canSetDriverRate && !rateClosed && (
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.retryButton}
                onClick={handleSaveDriverRate}
                disabled={rateBusy || !driverRateTrim || !driverRateValid}
              >
                Guardar tarifa
              </button>
              {rateSaved && (
                <span role="status" className={styles.fieldHint}>
                  Tarifa guardada.
                </span>
              )}
            </div>
          )}
          {rateError && (
            <p className={styles.blockedNotice} role="alert">
              {rateError}
            </p>
          )}
          {contractIsCompanyDriver && (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!rateDefined && !rateClosed}
              onClick={() => navigate(`/alquileres/${id}/entrega-04`, { state: context })}
            >
              Continuar a la entrega
            </button>
          )}
        </fieldset>
      )}

      {noDeposit && (
        <fieldset className={styles.fieldset} data-testid="no-deposit-company-driver">
          <legend>Garantía</legend>
          <p className={styles.summaryLine} role="status">Con conductor de la empresa no se cobra garantía.</p>
          {companyDriverCreditBalance > 0 && (
            <p className={styles.fieldHint} role="status" data-testid="reservation-credit-excess">
              Saldo a favor de la reserva (sin reembolso automático): {formatPen(companyDriverCreditBalance)}
            </p>
          )}
        </fieldset>
      )}

      {!noDeposit && (
      <fieldset className={styles.fieldset}>
        <legend>Pago de garantía</legend>
        <label className={styles.fieldLabel}>
          Medio de pago
          <select className={styles.select} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        </label>
        <label className={styles.fieldLabel}>
          Garantía total (PEN)
          {depositMinimum != null && (
            <span className={styles.fieldHint}>Mínimo requerido: S/ {depositMinimum.toFixed(2)}</span>
          )}
          <input
            className={styles.input}
            type="number"
            min="0"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            aria-invalid={depositBelowMinimum}
          />
          {depositBelowMinimum && (
            <span className={styles.evidenceError}>
              El monto es inferior al mínimo de garantía (S/ {depositMinimum!.toFixed(2)}).
            </span>
          )}
        </label>
        {rental.reservationCredit && !rental.reservationCredit.applied && (
          <p className={styles.fieldHint} role="status">
            La reserva de origen no traslada monto
            {rental.reservationCredit.reason === 'RESERVATION_NOT_ACTIVE' ? ' (fue cancelada o no está vigente)' : ''}
            {rental.reservationCredit.reason === 'PAYMENT_NOT_VALIDATED' ? ' (su pago no fue validado)' : ''}
            ; se cobra la garantía completa.
          </p>
        )}
        {paymentAmountNum != null && (
          <dl className={styles.summaryLine} aria-label="Desglose de la garantía" data-testid="guarantee-breakdown">
            <div><dt>Garantía total</dt><dd>{formatPen(breakdown.total)}</dd></div>
            <div><dt>Reserva aplicada</dt><dd>- {formatPen(breakdown.credit)}</dd></div>
            <div><dt>Diferencia a cobrar</dt><dd>{formatPen(breakdown.toCollect)}</dd></div>
          </dl>
        )}
        {breakdown.creditExcess > 0 && (
          <p className={styles.fieldHint} role="status" data-testid="reservation-credit-excess">
            Saldo a favor de la reserva (sin reembolso automático): {formatPen(breakdown.creditExcess)}
          </p>
        )}
        <div className={styles.chipRow}>
          <button
            type="button"
            className={`${styles.chip} ${payer === 'TITULAR' ? styles.chipActive : ''}`}
            onClick={() => setPayer('TITULAR')}
          >
            Paga el titular
          </button>
          <button
            type="button"
            className={`${styles.chip} ${payer === 'AGENTE_EXTERNO' ? styles.chipActive : ''}`}
            onClick={() => setPayer('AGENTE_EXTERNO')}
          >
            Paga un agente externo
          </button>
        </div>
      </fieldset>
      )}

      {confirmOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <p className={styles.modalTitle}>¿Formalizar el contrato?</p>
            <p className={styles.summaryLine}>Esta acción es irreversible y no se puede deshacer.</p>
            {noDeposit ? (
              <>
                <p className={styles.summaryLine}>Con conductor de la empresa no se cobra garantía.</p>
                <p className={styles.summaryLine} data-testid="confirm-driver-rate">
                  {driverRateTrim && canSetDriverRate
                    ? `Servicio de conductor: tarifa diaria ${formatPen(parseFloat(driverRateTrim))} (se guarda al formalizar).`
                    : 'Servicio de conductor: tarifa diaria sin digitar (obligatoria para terminar el alquiler).'}
                </p>
              </>
            ) : (
              <p className={styles.summaryLine}>
                Garantía total {formatPen(breakdown.total)}; reserva aplicada {formatPen(breakdown.credit)}; a cobrar ahora{' '}
                {formatPen(breakdown.toCollect)}.
              </p>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmOpen(false)}>
                Cancelar
              </button>
              <button type="button" className={styles.dangerButton} onClick={handleFormalize} disabled={busy}>
                Formalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </RentalWizardShell>
  );
}
