import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import {
  evaluateNotary,
  approveNotaryException,
  formalizeContract,
  getContractTemplate,
  RentalCommandError,
  NotaryEvaluationResponse,
  ContractHolderType,
  ContractTemplateSelectionResponse,
} from './rentals-client';
import { usePermissions } from '../shared/usePermissions';
import { SignaturePad } from '../shared/SignaturePad';
import { computeGuaranteeBreakdown, formatPen } from './guarantee-breakdown';
import styles from './RentalStageForms.module.css';

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
  const canFormalize =
    exceptionResolved &&
    !!signatureData &&
    !!paymentAmount &&
    !depositBelowMinimum &&
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
        paymentAmount,
        'PEN',
        undefined,
        signatureData ?? undefined,
        { holderType, withCompanyDriver },
      );
      setRental(updated);
      setConfirmOpen(false);
      navigate(`/alquileres/${id}/entrega-04`, { state: context });
    } catch (err) {
      if (err instanceof RentalCommandError) {
        setError(
          err.problem?.code === 'CONTRACT_VARIANT_DRIVER_CONFLICT'
            ? 'La variante del contrato es inconsistente: la opción de conductor de la empresa no coincide. Recarga la pantalla e inténtalo de nuevo.'
            : err.message,
        );
      } else setError('No pudimos formalizar el contrato.');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
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

      {confirmOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <p className={styles.modalTitle}>¿Formalizar el contrato?</p>
            <p className={styles.summaryLine}>Esta acción es irreversible y no se puede deshacer.</p>
            <p className={styles.summaryLine}>
              Garantía total {formatPen(breakdown.total)}; reserva aplicada {formatPen(breakdown.credit)}; a cobrar ahora{' '}
              {formatPen(breakdown.toCollect)}.
            </p>
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
