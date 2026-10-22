import { useState, type FormEvent } from 'react';
import { HrDialog } from './HrDialog';
import { AreaFreeDaysCalendar } from './AreaFreeDaysCalendar';
import { rangeHasOccupied, rangeLengthDays, suggestFreeRange } from './hr-domain';
import { formatDate } from './hr-format';
import { limaToday } from '../shared/lima-time';
import type { VacationRequest } from './hr-client';
import type { OccupiedDaysState } from './useAreaOccupiedDays';
import styles from './HrFlow.module.css';

export const MIN_CHANGE_REASON = 3;

interface Props {
  mode: 'RESCHEDULE' | 'CANCEL';
  vacation: VacationRequest;
  occupied: ReadonlySet<string>;
  occupiedState: OccupiedDaysState;
  saving: boolean;
  error: string | null;
  onSubmit: (input: { startDate: string; endDate: string; reason: string }) => void;
  onClose: () => void;
}

/** Reprogramar (otra fecha libre, motivo obligatorio) o cancelar (motivo obligatorio) unas vacaciones activas. */
export function VacationChangeDialog({ mode, vacation, occupied, occupiedState, saving, error, onSubmit, onClose }: Props) {
  const reschedule = mode === 'RESCHEDULE';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const length = rangeLengthDays(vacation);
  const today = limaToday();

  const reasonOk = reason.trim().length >= MIN_CHANGE_REASON;
  const rangeOk = !reschedule || (!!startDate && !!endDate && endDate >= startDate && startDate >= today);
  const unchanged = reschedule && startDate === vacation.startDate.slice(0, 10) && endDate === vacation.endDate.slice(0, 10);
  const busy = reschedule && !!startDate && !!endDate && rangeHasOccupied({ startDate, endDate }, occupied);

  function suggest() {
    const from = today > vacation.startDate.slice(0, 10) ? today : vacation.startDate.slice(0, 10);
    const free = suggestFreeRange(occupied, length, from);
    if (free) {
      setStartDate(free.startDate);
      setEndDate(free.endDate);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!reasonOk || !rangeOk || unchanged || busy) return;
    onSubmit({ startDate: reschedule ? startDate : vacation.startDate, endDate: reschedule ? endDate : vacation.endDate, reason: reason.trim() });
  }

  return (
    <HrDialog
      titleId="vac-change-title"
      title={reschedule ? 'Reprogramar vacaciones' : 'Cancelar vacaciones'}
      description={
        reschedule
          ? `Actualmente del ${formatDate(vacation.startDate)} al ${formatDate(vacation.endDate)} (${length} días). Elige otra fecha libre del área.`
          : `Se cancelarán las vacaciones del ${formatDate(vacation.startDate)} al ${formatDate(vacation.endDate)} y se liberará el cupo del área.`
      }
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        {reschedule && (
          <>
            {occupiedState === 'LOADING' && <p className={styles.hint}>Cargando los días ocupados del área…</p>}
            {occupiedState === 'UNAVAILABLE' && (
              <p className={styles.hint}>No pudimos cargar los días ocupados; el sistema validará las fechas al enviar.</p>
            )}
            {occupiedState === 'READY' && (
              <>
                <AreaFreeDaysCalendar occupied={occupied} startDate={startDate} endDate={endDate} onChange={(r) => { setStartDate(r.startDate); setEndDate(r.endDate); }} />
                <button type="button" className={styles.smallButton} onClick={suggest}>
                  Proponer el primer rango libre
                </button>
              </>
            )}
            <label className={styles.fieldLabel} htmlFor="vac-new-desde">
              Nueva fecha de inicio
            </label>
            <input id="vac-new-desde" type="date" className={styles.input} value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} />
            <label className={styles.fieldLabel} htmlFor="vac-new-hasta">
              Nueva fecha final
            </label>
            <input id="vac-new-hasta" type="date" className={styles.input} value={endDate} min={startDate || today} onChange={(e) => setEndDate(e.target.value)} />
            {submitted && !rangeOk && (
              <p className={styles.fieldError} role="alert">
                Elige fechas válidas, desde hoy en adelante.
              </p>
            )}
            {unchanged && (
              <p className={styles.fieldError} role="alert">
                Las fechas nuevas son iguales a las actuales.
              </p>
            )}
            {busy && (
              <p className={styles.fieldError} role="alert">
                Ese rango incluye días ocupados del área. Elige otro.
              </p>
            )}
          </>
        )}
        <label className={styles.fieldLabel} htmlFor="vac-change-reason">
          Motivo (obligatorio)
        </label>
        <textarea id="vac-change-reason" className={styles.input} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={submitted && !reasonOk} />
        {submitted && !reasonOk && (
          <p className={styles.fieldError} role="alert">
            Indica el motivo (al menos {MIN_CHANGE_REASON} caracteres).
          </p>
        )}
        {error && (
          <p className={styles.errorBanner} role="alert">
            {error}
          </p>
        )}
        <div className={styles.rowActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={saving}>
            Volver
          </button>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? 'Guardando…' : reschedule ? 'Reprogramar' : 'Cancelar vacaciones'}
          </button>
        </div>
      </form>
    </HrDialog>
  );
}
