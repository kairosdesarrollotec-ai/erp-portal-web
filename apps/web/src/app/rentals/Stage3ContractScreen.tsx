import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import {
  evaluateNotary,
  approveNotaryException,
  formalizeContract,
  RentalCommandError,
  NotaryEvaluationResponse,
} from './rentals-client';
import { useWorkSession } from '../shared/useWorkSession';
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
  const role = useWorkSession((s) => s.role);
  const isGerencia = role === 'GERENCIA' || role === 'PLATFORM_ADMIN';

  const [evaluation, setEvaluation] = useState<NotaryEvaluationResponse | null>(rental?.notaryEvaluation ?? null);
  const [justification, setJustification] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [payer, setPayer] = useState<'TITULAR' | 'AGENTE_EXTERNO'>('TITULAR');
  const [signed, setSigned] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

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

  const needsException = evaluation && (evaluation.result === 'MANUAL_REVIEW' || evaluation.result === 'THIRD_PATH_ELIGIBLE');
  const exceptionResolved = !needsException || !!evaluation?.approvedBy;
  const canFormalize = exceptionResolved && signed && !!paymentAmount && !rental?.contract;

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
      );
      setRental(updated);
      setConfirmOpen(false);
      navigate(`/alquileres/${id}/entrega-04`, { state: context });
    } catch (err) {
      if (err instanceof RentalCommandError) setError(err.message);
      else setError('No pudimos formalizar el contrato.');
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
          {isGerencia ? (
            <button type="button" className={styles.retryButton} onClick={handleApproveException} disabled={busy}>
              Aprobar excepción
            </button>
          ) : (
            <p className={styles.blockedNotice}>Solo Gerencia puede aprobar o rechazar esta excepción.</p>
          )}
        </fieldset>
      )}

      <fieldset className={styles.fieldset}>
        <legend>Plantilla de contrato</legend>
        <div className={styles.summaryCard}>
          <p className={styles.summaryLine}>Plantilla estándar VeloxRent v1 (visor simulado - no se encontró un componente de firma reutilizable en el repo).</p>
        </div>
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
          Firma / huella del cliente capturada
        </label>
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
          Monto (PEN)
          <input
            className={styles.input}
            type="number"
            min="0"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
          />
        </label>
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
