import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import { completeDelivery, listRentalEvidence, RentalCommandError } from './rentals-client';
import { describeRentalError } from './rental-errors';
import { loadChecklistDraft, clearChecklistDraft } from './rental-checklist-draft';
import { ALCOHOL_RESULT_LABELS, NOTARY_RESULT_LABELS } from './rental-status';
import styles from './RentalStageForms.module.css';

/**
 * ENTREGA-05 / ALQ-09 - Confirmacion de entrega. Resumen de solo lectura de las 4
 * etapas anteriores con link "Editar" por seccion, y boton "Confirmar
 * entrega" que ejecuta complete-delivery (accion irreversible) con los
 * datos capturados en ENTREGA-04.
 */
export function Stage5ConfirmationScreen() {
  const { id, state, rental, context, getIdToken, setRental } = useRentalWizard();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // D2 — sustituye useState/useCallback/useEffect (evita setState-in-effect warning)
  const { data: evidence = [] } = useQuery({
    queryKey: ['rental', id, 'evidence'] as const,
    queryFn: async () => {
      const idToken = await getIdToken();
      return listRentalEvidence(idToken, id, context!.companyId, context!.branchId);
    },
    enabled: !!context,
  });

  async function handleConfirm() {
    if (!rental || !context) return;
    setBusy(true);
    setError(null);
    try {
      const draft = loadChecklistDraft(id);
      const idToken = await getIdToken();
      const updated = await completeDelivery(
        idToken,
        id,
        context.companyId,
        context.branchId,
        rental.version,
        [draft.notes, draft.exceptionReason && `Excepción de tiempo: ${draft.exceptionReason}`]
          .filter(Boolean)
          .join(' | ') || undefined,
      );
      setRental(updated);
      clearChecklistDraft(id);
      setConfirmOpen(false);
      navigate('/alquileres', { state: context });
    } catch (err) {
      if (err instanceof RentalCommandError) setError(describeRentalError(err, err.message));
      else setError('No pudimos confirmar la entrega. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'LOADING') return <p className={styles.statusText}>Cargando expediente…</p>;
  if (state === 'RECOVERABLE_ERROR' || state === 'NOT_FOUND' || !rental) {
    return <p className={styles.statusText}>No pudimos cargar el expediente. Intenta de nuevo.</p>;
  }

  const draft = loadChecklistDraft(id);

  return (
    <RentalWizardShell
      stage={5}
      title="Confirmación de entrega"
      onContinue={() => setConfirmOpen(true)}
      continueLabel="Confirmar entrega"
      continueDisabled={rental.alcoholTestResult !== 'FAVORABLE'}
      errorMessage={error}
      continueBusy={busy}
    >
      {rental.alcoholTestResult !== 'FAVORABLE' && (
        <p className={styles.blockedNotice} role="alert" data-testid="alcohol-required-notice">
          No se puede confirmar la entrega: el resultado del alcoholímetro debe estar registrado como favorable (etapa Validaciones).
        </p>
      )}

      <section className={styles.reviewSection}>
        <p className={styles.reviewSectionTitle}>
          Cliente y documentos
          <a
            className={styles.editLink}
            href={`/alquileres/${id}/entrega-01`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/alquileres/${id}/entrega-01`, { state: context ?? undefined });
            }}
          >
            Editar
          </a>
        </p>
        <p className={styles.summaryLine}>
          {rental.customerName} ({rental.customerDocNumber})
        </p>
      </section>

      <section className={styles.reviewSection}>
        <p className={styles.reviewSectionTitle}>
          Validaciones y alcoholímetro
          <a
            className={styles.editLink}
            href={`/alquileres/${id}/entrega-02`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/alquileres/${id}/entrega-02`, { state: context ?? undefined });
            }}
          >
            Editar
          </a>
        </p>
        <p className={styles.summaryLine}>Resultado: {rental.alcoholTestResult ? (ALCOHOL_RESULT_LABELS[rental.alcoholTestResult] ?? rental.alcoholTestResult) : 'pendiente'}</p>
      </section>

      <section className={styles.reviewSection}>
        <p className={styles.reviewSectionTitle}>
          Garantía y contrato
          <a
            className={styles.editLink}
            href={`/alquileres/${id}/entrega-03`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/alquileres/${id}/entrega-03`, { state: context ?? undefined });
            }}
          >
            Editar
          </a>
        </p>
        <p className={styles.summaryLine}>
          Notaría: {rental.notaryEvaluation ? (NOTARY_RESULT_LABELS[rental.notaryEvaluation.result] ?? rental.notaryEvaluation.result) : 'sin evaluar'} · Contrato:{' '}
          {rental.contract ? rental.contract.documentRef : 'pendiente'} · Depósito:{' '}
          {rental.depositRequired === false
            ? 'sin garantía (conductor de la empresa)'
            : rental.deposit
              ? `${rental.deposit.originalAmount} ${rental.deposit.currency}`
              : 'pendiente'}
        </p>
        {rental.depositRequired === false && (
          <p className={styles.summaryLine} data-testid="no-deposit-company-driver">
            Con conductor de la empresa no se cobra garantía.
          </p>
        )}
      </section>

      <section className={styles.reviewSection}>
        <p className={styles.reviewSectionTitle}>
          Checklist y evidencias
          <a
            className={styles.editLink}
            href={`/alquileres/${id}/entrega-04`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/alquileres/${id}/entrega-04`, { state: context ?? undefined });
            }}
          >
            Editar
          </a>
        </p>
        <p className={styles.summaryLine}>
          {evidence.filter((e) => e.type === 'PHOTO').length} fotos ·{' '}
          {evidence.filter((e) => e.type === 'VIDEO').length} videos
          {draft.exceptionReason ? ` · excepción de tiempo: ${draft.exceptionReason}` : ''}
        </p>
      </section>

      {confirmOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <p className={styles.modalTitle}>¿Confirmar la entrega?</p>
            <p className={styles.summaryLine}>Esta acción es irreversible y activa el alquiler.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmOpen(false)}>
                Cancelar
              </button>
              <button type="button" className={styles.dangerButton} onClick={handleConfirm} disabled={busy}>
                Confirmar entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </RentalWizardShell>
  );
}
