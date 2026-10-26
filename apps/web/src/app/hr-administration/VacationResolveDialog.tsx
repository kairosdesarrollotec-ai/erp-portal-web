import { useState, type FormEvent } from 'react';
import { HrDialog } from './HrDialog';
import { rangeLengthDays } from './hr-domain';
import { formatDate } from './hr-format';
import type { VacationRequest } from './hr-client';
import styles from './HrFlow.module.css';

interface Props {
  vacation: VacationRequest;
  saving: boolean;
  error: string | null;
  onSubmit: (input: { status: 'PROGRAMADA' | 'CANCELADA'; grantedDays?: number; statusReason?: string }) => void;
  onClose: () => void;
}

export function VacationResolveDialog({ vacation, saving, error, onSubmit, onClose }: Props) {
  const requestedDays = rangeLengthDays(vacation);
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [grantedDays, setGrantedDays] = useState<number>(requestedDays);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isApprove = action === 'APPROVE';
  const daysValid = isApprove ? Number.isInteger(grantedDays) && grantedDays >= 1 && grantedDays <= requestedDays : true;
  const reasonValid = !isApprove ? reason.trim().length >= 3 : true;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!daysValid || !reasonValid) return;

    if (isApprove) {
      onSubmit({
        status: 'PROGRAMADA',
        grantedDays,
        statusReason: reason.trim() || undefined,
      });
    } else {
      onSubmit({
        status: 'CANCELADA',
        statusReason: reason.trim(),
      });
    }
  }

  return (
    <HrDialog
      titleId="vac-resolve-title"
      title="Resolver solicitud de vacaciones"
      description={`Del ${formatDate(vacation.startDate)} al ${formatDate(vacation.endDate)} (${requestedDays} días solicitados)`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <p className={styles.errorBanner} role="alert">
            {error}
          </p>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="resolve-action">
            Decisión
          </label>
          <select
            id="resolve-action"
            className={styles.select}
            value={action}
            onChange={(e) => setAction(e.target.value as 'APPROVE' | 'REJECT')}
            disabled={saving}
          >
            <option value="APPROVE">Aprobar vacaciones</option>
            <option value="REJECT">Rechazar solicitud</option>
          </select>
        </div>

        {isApprove && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="granted-days">
              Días otorgados
            </label>
            <input
              id="granted-days"
              type="number"
              min={1}
              max={requestedDays}
              className={styles.input}
              value={grantedDays}
              onChange={(e) => setGrantedDays(Number(e.target.value))}
              disabled={saving}
            />
            <p className={styles.hint}>
              Puedes otorgar menos días de los solicitados ({requestedDays}). La fecha de fin se ajustará automáticamente.
            </p>
            {submitted && !daysValid && (
              <p className={styles.errorText}>
                Los días otorgados deben estar entre 1 y {requestedDays}.
              </p>
            )}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="resolve-reason">
            {isApprove ? 'Notas de aprobación (opcional)' : 'Motivo del rechazo (obligatorio)'}
          </label>
          <textarea
            id="resolve-reason"
            className={styles.textarea}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={saving}
            rows={3}
            placeholder={isApprove ? 'Ej. Aprobado según coordinación' : 'Ej. Se requiere reprogramar por cierre de proyecto'}
          />
          {submitted && !reasonValid && (
            <p className={styles.errorText}>El motivo debe tener al menos 3 caracteres.</p>
          )}
        </div>

        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? 'Guardando...' : isApprove ? 'Aprobar' : 'Rechazar'}
          </button>
        </div>
      </form>
    </HrDialog>
  );
}
