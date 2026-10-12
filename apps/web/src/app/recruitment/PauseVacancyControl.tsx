import { useId, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { RecruitmentDialog } from './RecruitmentDialog';
import { pauseVacancy, resumeVacancy, type VacancyDetail, type VacancyResponse } from './recruitment-client';
import { describeRecruitmentError, isStaleRecruitmentError } from './recruitment-errors';
import { useRecruitmentPermissions } from './recruitment-permissions';
import type { RecruitmentWorkContext } from './useWorkContextForRecruitment';
import dialogStyles from './RecruitmentDialog.module.css';

interface Props {
  vacancy: Pick<VacancyResponse, 'id' | 'title' | 'status' | 'version'>;
  context: RecruitmentWorkContext;
  /** Recibe la vacante ya actualizada (nuevo estado y version). */
  onChanged: (detail: VacancyDetail, message: string) => void;
  /** 409/428: el padre debe recargar para recuperar la version vigente. */
  onStale: () => void | Promise<void>;
  buttonClassName?: string;
}

/**
 * REC-01 / REC-02 - Pausar / Reanudar vacante. Solo se ofrece a quien puede publicar
 * (PUBLISH_VACANCY) y segun el estado: PUBLICADA se puede pausar, PAUSADA reanudar.
 * Siempre con confirmacion; la pausa admite un motivo opcional (queda en auditoria).
 */
export function PauseVacancyControl({ vacancy, context, onChanged, onStale, buttonClassName }: Props) {
  const { can } = useRecruitmentPermissions();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pausing = vacancy.status === 'PUBLICADA';
  if (!can('PUBLISH_VACANCY') || (vacancy.status !== 'PUBLICADA' && vacancy.status !== 'PAUSADA')) return null;

  function close() {
    if (saving) return;
    setOpen(false);
    setError(null);
    setReason('');
  }

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const scope = { companyId: context.companyId, branchId: context.branchId };
      const updated = pausing
        ? await pauseVacancy(idToken, vacancy.id, vacancy.version, scope, reason.trim() || undefined)
        : await resumeVacancy(idToken, vacancy.id, vacancy.version, scope);
      setOpen(false);
      setReason('');
      onChanged(updated, pausing ? 'La vacante quedó pausada.' : 'La vacante se reanudó y vuelve a estar publicada.');
    } catch (err) {
      setError(
        describeRecruitmentError(
          err,
          pausing ? 'No pudimos pausar la vacante. Intenta de nuevo.' : 'No pudimos reanudar la vacante. Intenta de nuevo.',
        ),
      );
      if (isStaleRecruitmentError(err)) await onStale();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        aria-label={`${pausing ? 'Pausar' : 'Reanudar'} ${vacancy.title}`}
        onClick={() => setOpen(true)}
      >
        {pausing ? 'Pausar' : 'Reanudar'}
      </button>
      {open && (
        <RecruitmentDialog
          titleId={titleId}
          title={pausing ? 'Pausar vacante' : 'Reanudar vacante'}
          description={
            pausing
              ? `"${vacancy.title}" dejará de recibir candidatos nuevos hasta que la reanudes. Los candidatos actuales se conservan.`
              : `"${vacancy.title}" volverá a estar publicada y podrá recibir candidatos.`
          }
          onClose={close}
        >
          {pausing && (
            <label className={dialogStyles.field}>
              Motivo (opcional)
              <textarea
                className={dialogStyles.input}
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          )}
          <div aria-live="polite">
            {error && (
              <p className={dialogStyles.error} role="alert">
                {error}
              </p>
            )}
          </div>
          <div className={dialogStyles.actions}>
            <button type="button" className={dialogStyles.secondaryButton} onClick={close} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className={dialogStyles.primaryButton} onClick={() => void confirm()} disabled={saving}>
              {saving ? 'Guardando…' : pausing ? 'Pausar vacante' : 'Reanudar vacante'}
            </button>
          </div>
        </RecruitmentDialog>
      )}
    </>
  );
}
