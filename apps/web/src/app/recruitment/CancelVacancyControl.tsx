import { useId, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { RecruitmentDialog } from './RecruitmentDialog';
import { cancelVacancy, type VacancyDetail, type VacancyResponse } from './recruitment-client';
import { describeRecruitmentError, isStaleRecruitmentError } from './recruitment-errors';
import { useRecruitmentPermissions } from './recruitment-permissions';
import type { RecruitmentWorkContext } from './useWorkContextForRecruitment';
import dialogStyles from './RecruitmentDialog.module.css';

export const CANCELLABLE_STATUSES = ['NECESIDAD_REGISTRADA', 'PUBLICADA', 'PAUSADA'] as const;
export const MIN_CANCEL_REASON = 5;

interface Props {
  vacancy: Pick<VacancyResponse, 'id' | 'title' | 'status' | 'version'>;
  context: RecruitmentWorkContext;
  /** Recibe la vacante ya cancelada (nuevo estado y version). */
  onChanged: (detail: VacancyDetail, message: string) => void;
  /** 409/428: el padre debe recargar para recuperar la version vigente. */
  onStale: () => void | Promise<void>;
  buttonClassName?: string;
}

/**
 * REC-01 / REC-02 - Cancelar vacante (recruitment.yaml 0.6.0, POST /vacancies/{id}/commands/cancel). Solo se ofrece a
 * quien tiene RECRUITMENT.CANCEL_VACANCY y mientras la vacante sea NECESIDAD_REGISTRADA / PUBLICADA / PAUSADA.
 * Siempre con confirmacion y motivo obligatorio; no borra nada (los candidatos siguen consultables).
 */
export function CancelVacancyControl({ vacancy, context, onChanged, onStale, buttonClassName }: Props) {
  const { can } = useRecruitmentPermissions();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!can('CANCEL_VACANCY') || !(CANCELLABLE_STATUSES as readonly string[]).includes(vacancy.status)) return null;

  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_CANCEL_REASON;

  function close() {
    if (saving) return;
    setOpen(false);
    setError(null);
    setReason('');
  }

  async function confirm() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const updated = await cancelVacancy(idToken, vacancy.id, vacancy.version, { companyId: context.companyId, branchId: context.branchId }, trimmed);
      setOpen(false);
      setReason('');
      onChanged(updated, 'La vacante quedó cancelada. Sus candidatos se conservan y siguen consultables.');
    } catch (err) {
      setError(describeRecruitmentError(err, 'No pudimos cancelar la vacante. Intenta de nuevo.'));
      if (isStaleRecruitmentError(err)) await onStale();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" className={buttonClassName} aria-label={`Cancelar vacante ${vacancy.title}`} onClick={() => setOpen(true)}>
        Cancelar vacante
      </button>
      {open && (
        <RecruitmentDialog
          titleId={titleId}
          title="Cancelar vacante"
          description={`"${vacancy.title}" dejará de estar activa y no recibirá más candidatos. No se borra nada: los candidatos y el historial se conservan.`}
          onClose={close}
        >
          <label className={dialogStyles.field}>
            Motivo de la cancelación (obligatorio)
            <textarea className={dialogStyles.input} value={reason} maxLength={500} aria-required="true" onChange={(e) => setReason(e.target.value)} />
          </label>
          <div aria-live="polite">
            {error && (
              <p className={dialogStyles.error} role="alert">
                {error}
              </p>
            )}
          </div>
          <div className={dialogStyles.actions}>
            <button type="button" className={dialogStyles.secondaryButton} onClick={close} disabled={saving}>
              Volver
            </button>
            <button type="button" className={dialogStyles.primaryButton} onClick={() => void confirm()} disabled={saving || !valid}>
              {saving ? 'Cancelando…' : 'Confirmar cancelación'}
            </button>
          </div>
        </RecruitmentDialog>
      )}
    </>
  );
}
