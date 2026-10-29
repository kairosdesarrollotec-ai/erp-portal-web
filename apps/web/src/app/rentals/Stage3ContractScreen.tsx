import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import { CancelRentalControl } from './CancelRentalControl';
import {
  evaluateNotary,
  approveNotaryException,
  formalizeContract,
  getContractTemplate,
  setCompanyDriverDailyRate,
  requestRentalDocumentUploadSession,
  uploadFileToGcs,
  recordRentalDocument,
  RentalCommandError,
  NotaryEvaluationResponse,
  ContractHolderType,
  ContractTemplateSelectionResponse,
} from './rentals-client';
import { usePermissions } from '../shared/usePermissions';
import { SignaturePad } from '../shared/SignaturePad';
import { computeGuaranteeBreakdown, formatPen } from './guarantee-breakdown';
import { describeRentalError } from './rental-errors';
import { MfaStepUpCancelledError, useMfaStepUp } from '../auth/useMfaStepUp';
import { MfaChallengeModal } from '../auth/MfaChallengeModal';
import { NOTARY_RESULT_LABELS, RENTAL_STATUS_LABELS } from './rental-status';
import { PaymentProofFields } from '../shared/PaymentProofFields';
import {
  emptyPaymentDraft,
  hasPaymentErrors,
  toGuaranteePaymentBody,
  validatePaymentDraft,
  type PaymentProofDraft,
} from '../shared/payment-proof';
import styles from './RentalStageForms.module.css';

/** DEC-ALQ-DRIVERRATE-001: monto > 0, maximo 2 decimales y hasta 8 enteros (DECIMAL(10,2)); mismo patron que el backend. */
const DAILY_RATE_PATTERN = /^(?!0+(\.0{1,2})?$)\d{1,8}(\.\d{1,2})?$/;


/** DEC-ALQ-THIRDPATH-001 / BR-ALQ-004: que significa cada resultado de la matriz para el personal. */
const NOTARY_RESULT_EXPLANATIONS: Record<string, string> = {
  MANDATORY: 'Vehículo de alto riesgo: el trámite notarial es obligatorio y no admite excepción.',
  DOUBLE_DEPOSIT:
    'No aplica la tercera vía: se exige el doble de la garantía base del vehículo (cliente con 2 o menos alquileres previos, o vehículo que no es de menor costo).',
  THIRD_PATH_ELIGIBLE:
    'Cliente antiguo con biometría favorable y vehículo de menor costo: puede firmar el documento de responsabilidad en lugar de ir a notaría, sin duplicar la garantía. Requiere la aprobación de Gerencia.',
  MANUAL_REVIEW:
    'Cliente antiguo sin verificación biométrica registrada: la matriz no es determinista. Gerencia decide; si verificas la biometría puedes volver a evaluar.',
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

  // La evaluación vigente sale del alquiler (que se recarga) salvo que acabemos de evaluar en esta pantalla.
  const [evaluationOverride, setEvaluation] = useState<NotaryEvaluationResponse | null>(null);
  const evaluation: NotaryEvaluationResponse | null = evaluationOverride ?? rental?.notaryEvaluation ?? null;
  const [justification, setJustification] = useState('');
  // null = el personal aun no tocó el monto: se propone la garantía exigida (tarifa de Flota, x2 con DOUBLE_DEPOSIT).
  const [paymentAmountInput, setPaymentAmountInput] = useState<string | null>(null);
  // Decisión 8: comprobante del cobro (método, nº de operación, pagador, voucher adjunto).
  const [paymentDraft, setPaymentDraft] = useState<PaymentProofDraft>(() => emptyPaymentDraft());
  // DEC-ALQ-THIRDPATH-001: casilla de verificación biométrica favorable registrada por el personal.
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [fingerprintTaken, setFingerprintTaken] = useState(false);

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  /** V-07: si el back volviera a exigir MFA reciente (MFA_RECENT_REQUIRED) para formalizar, se ofrece «Verificar MFA». Desde el 29-oct el back ya no lo exige (decision del usuario); este manejo queda como defensa. */
  const [mfaNeeded, setMfaNeeded] = useState(false);
  const { request: requestMfaStepUp, challenge: mfaChallenge } = useMfaStepUp();
  const [holderType, setHolderType] = useState<ContractHolderType>('NATURAL');
  const [withCompanyDriver, setWithCompanyDriver] = useState(false);
  const [driverRate, setDriverRate] = useState('');
  const [rateBusy, setRateBusy] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateSaved, setRateSaved] = useState(false);
  const [templateSel, setTemplateSel] = useState<ContractTemplateSelectionResponse | null>(null);
  const [templateState, setTemplateState] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');

  /**
   * La evaluación ya no es automática: la casilla de verificación biométrica debe registrarse ANTES de evaluar
   * (con resultado determinista el alquiler avanza y no se puede reevaluar). Si queda pendiente de Gerencia
   * (MANUAL_REVIEW / THIRD_PATH_ELIGIBLE) se puede evaluar de nuevo mientras siga en evaluación notarial.
   */
  async function handleEvaluate() {
    if (!rental || !context) return;
    setEvaluating(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const result = await evaluateNotary(idToken, id, context.companyId, context.branchId, rental.version, biometricVerified);
      setRental(result.rental);
      setEvaluation(result.evaluation);
    } catch (err) {
      setError(
        err instanceof RentalCommandError
          ? describeRentalError(err, 'No pudimos evaluar la matriz notarial. Intenta de nuevo.')
          : 'No pudimos evaluar la matriz notarial. Intenta de nuevo.',
      );
    } finally {
      setEvaluating(false);
    }
  }

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
  // Garantía exigida: tarifa de Flota x multiplicador notarial (el back la devuelve ya calculada en requiredGuarantee).
  const requiredGuarantee = rental?.requiredGuarantee ?? null;
  const requiredAmountNum = requiredGuarantee ? parseFloat(requiredGuarantee.amount) : depositMinimum;
  const paymentAmount = paymentAmountInput ?? (requiredGuarantee?.amount ?? '');
  const paymentAmountNum = paymentAmount ? parseFloat(paymentAmount) : null;
  const depositBelowMinimum = requiredAmountNum != null && paymentAmountNum != null && paymentAmountNum < requiredAmountNum;
  const breakdown = computeGuaranteeBreakdown(paymentAmountNum, rental?.reservationCredit ?? null);
  const hasTemplate = templateState === 'READY' && !!templateSel?.template;
  // Con conductor de la empresa NO hay garantia (DEC-ALQ-COMPANY-DRIVER-004): se omite el cobro.
  const noDeposit = withCompanyDriver;
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
  const paymentErrors = validatePaymentDraft(paymentDraft, { externalAgentFields: true });
  // El comprobante solo se exige si queda diferencia por cobrar (si la reserva cubre toda la garantía no hay cobro).
  const needsPaymentProof = !noDeposit && breakdown.toCollect > 0;
  const paymentReady = !needsPaymentProof || !hasPaymentErrors(paymentErrors);
  const canFormalize =
    fingerprintTaken &&
    (!withCompanyDriver || (driverRateTrim !== '' && driverRateValid)) &&
    exceptionResolved &&
    !!signatureData &&
    (noDeposit || (!!paymentAmount && !depositBelowMinimum)) &&
    paymentReady &&
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

  async function handleFormalize(freshToken?: string) {
    if (!rental || !context) return;
    if (needsPaymentProof && hasPaymentErrors(paymentErrors)) {
      setConfirmOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const idToken = freshToken ?? (await getIdToken());
      // Decisión 8: el voucher se sube con el mecanismo de documentos del alquiler (PAYMENT_VOUCHER) y se envía su id.
      let payment: ReturnType<typeof toGuaranteePaymentBody> | undefined;
      if (needsPaymentProof && paymentDraft.file) {
        const file = paymentDraft.file;
        try {
          const session = await requestRentalDocumentUploadSession(
            idToken, id, context.companyId, context.branchId, 'PAYMENT_VOUCHER',
            file.type as 'image/jpeg' | 'image/webp' | 'image/png' | 'application/pdf', file.size,
          );
          await uploadFileToGcs(session.uploadUrl, file);
          const recorded = await recordRentalDocument(
            idToken, id, context.companyId, context.branchId, 'PAYMENT_VOUCHER', session.objectUrl,
          );
          payment = toGuaranteePaymentBody(paymentDraft, rental.customerName, recorded?.id);
        } catch {
          setError('No pudimos subir el comprobante de pago. Intenta de nuevo.');
          setConfirmOpen(false);
          return;
        }
      }
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
        payment,
        fingerprintTaken,
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
      if (err instanceof RentalCommandError && err.problem?.code === 'MFA_RECENT_REQUIRED') {
        setMfaNeeded(true);
        setError('Para formalizar el contrato debes verificar tu identidad con MFA (válida por 5 minutos). Pulsa «Verificar MFA» y se reintentará la formalización.');
      } else if (err instanceof RentalCommandError) {
        setError(describeRentalError(err, err.message));
      } else setError('No pudimos formalizar el contrato.');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  /** V-07: reto TR-03 (contrasena + TOTP) y reintento UNICO de la formalizacion con el token renovado. */
  async function handleVerifyMfa() {
    try {
      const freshToken = await requestMfaStepUp();
      setMfaNeeded(false);
      await handleFormalize(freshToken);
    } catch (err) {
      if (err instanceof MfaStepUpCancelledError) setError(err.message);
      else setError('No pudimos verificar el MFA. Intenta de nuevo.');
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
      cancelControl={<CancelRentalControl rental={rental} context={context} getIdToken={getIdToken} />}
      title="Garantía y contrato"
      onContinue={() => setConfirmOpen(true)}
      continueLabel="Formalizar y continuar"
      continueDisabled={!canFormalize}
      continueBusy={busy}
      errorMessage={error}
    >
      {mfaNeeded && (
        <div className={styles.reviewSection}>
          <button type="button" className={styles.secondaryButton} onClick={() => void handleVerifyMfa()} disabled={busy}>
            Verificar MFA
          </button>
        </div>
      )}
      <MfaChallengeModal {...mfaChallenge} />
      <section className={styles.reviewSection}>
        <p className={styles.reviewSectionTitle}>Evaluación notarial</p>
        {evaluating && <p className={styles.statusText}>Evaluando matriz notarial…</p>}
        {rental.vehicleThirdPathEligible && (
          <p className={styles.fieldHint} data-testid="vehicle-third-path-flag">
            Este vehículo está marcado por Gerencia como elegible para la tercera vía.
          </p>
        )}
        {evaluation && (
          <>
            <span className={styles.statusBadge}>{NOTARY_RESULT_LABELS[evaluation.result] ?? evaluation.result}</span>
            <p className={styles.summaryLine}>{evaluation.reason}</p>
            {NOTARY_RESULT_EXPLANATIONS[evaluation.result] && (
              <p className={styles.fieldHint} data-testid="notary-explanation">
                {NOTARY_RESULT_EXPLANATIONS[evaluation.result]}
              </p>
            )}
            {evaluation.previousRentalsCount != null && (
              <p className={styles.fieldHint} data-testid="notary-previous-rentals">
                Alquileres previos cerrados del cliente: {evaluation.previousRentalsCount}
                {evaluation.previousRentalsCount > 2 ? ' (cliente antiguo)' : ' (cliente nuevo: se necesitan más de 2)'}.
              </p>
            )}
            {evaluation.biometricVerified && (
              <p className={styles.fieldHint} data-testid="notary-biometric">
                Verificación biométrica favorable registrada{evaluation.biometricVerifiedBy ? ' por el personal' : ''}.
              </p>
            )}
            {needsException && !evaluation.approvedBy && (
              <p className={styles.blockedNotice} role="status" data-testid="notary-pending-approval">
                Pendiente de aprobación de Gerencia para continuar.
              </p>
            )}
          </>
        )}
        {(!evaluation || (needsException && !evaluation.approvedBy)) && (
          <div data-testid="notary-evaluate-step">
            <label className={styles.fieldLabel}>
              <input
                type="checkbox"
                checked={biometricVerified}
                disabled={evaluating}
                onChange={(e) => setBiometricVerified(e.target.checked)}
              />{' '}
              Verificación biométrica favorable
            </label>
            <span className={styles.fieldHint}>
              Marca solo si verificaste la biometría del cliente; queda registrada con tu usuario. Debe marcarse antes de evaluar.
            </span>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => void handleEvaluate()}
                disabled={evaluating || !biometricVerified || rental.status !== 'NOTARY_EVALUATION'}
              >
                {evaluation ? 'Volver a evaluar' : 'Evaluar notaría'}
              </button>
              {rental.status !== 'NOTARY_EVALUATION' && (
                <span className={styles.fieldHint} data-testid="notary-not-applicable">
                  La evaluación notarial ya no corresponde en esta etapa del alquiler ({RENTAL_STATUS_LABELS[rental.status] ?? rental.status}).
                </span>
              )}
            </div>
          </div>
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
        <legend>Firma y huella dactilar</legend>
        <SignaturePad onChange={setSignatureData} />
        {!signatureData && (
          <p className={styles.fieldHint}>La firma del cliente es obligatoria para continuar.</p>
        )}
        <label className={styles.checkboxRow} style={{ marginTop: '0.75rem' }}>
          <input
            type="checkbox"
            checked={fingerprintTaken}
            onChange={(e) => setFingerprintTaken(e.target.checked)}
            data-testid="fingerprint-taken-checkbox"
          />
          Toma de huella dactilar física en contrato impreso
        </label>
        {!fingerprintTaken && (
          <p className={styles.fieldHint}>La toma de huella dactilar física es obligatoria para formalizar.</p>
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
        </fieldset>
      )}

      {!noDeposit && (
      <fieldset className={styles.fieldset}>
        <legend>Pago de garantía</legend>
        <label className={styles.fieldLabel}>
          Garantía total (PEN)
          {requiredGuarantee ? (
            <span className={styles.fieldHint} data-testid="required-guarantee">
              Garantía exigida: S/ {parseFloat(requiredGuarantee.amount).toFixed(2)}
              {requiredGuarantee.multiplier === 2
                ? ` (doble depósito: base S/ ${parseFloat(requiredGuarantee.baseAmount).toFixed(2)} x 2)`
                : ' (tarifa de Flota)'}
            </span>
          ) : (
            depositMinimum != null && <span className={styles.fieldHint}>Mínimo requerido: S/ {depositMinimum.toFixed(2)}</span>
          )}
          <input
            className={styles.input}
            type="number"
            min="0"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmountInput(e.target.value)}
            aria-invalid={depositBelowMinimum}
          />
          {depositBelowMinimum && (
            <span className={styles.evidenceError}>
              El monto es inferior a la garantía exigida (S/ {requiredAmountNum!.toFixed(2)}).
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
        {paymentAmountNum != null && !needsPaymentProof && (
          <p className={styles.fieldHint} role="status">
            La reserva cubre toda la garantía: no hay cobro ni comprobante que registrar.
          </p>
        )}
        {needsPaymentProof && (
          <PaymentProofFields
            draft={paymentDraft}
            onChange={setPaymentDraft}
            errors={paymentErrors}
            externalAgentFields
          />
        )}
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
              <button type="button" className={styles.dangerButton} onClick={() => void handleFormalize()} disabled={busy}>
                Formalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </RentalWizardShell>
  );
}
