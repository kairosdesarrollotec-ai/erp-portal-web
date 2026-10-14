import { useState, type FormEvent } from 'react';
import { HrDialog } from './HrDialog';
import { logAttendance, type AttendanceRecord } from './hr-client';
import { describeHrError } from './hr-errors';
import { ATTENDANCE_STATUS_LABEL, MANUAL_ATTENDANCE_OPTIONS, localToIso, type AttendanceStatus, limaToday } from './hr-domain';
import { getFirebaseAuth } from '../providers/firebase';
import styles from './HrDialog.module.css';

type Choice = AttendanceStatus | 'FALTA';

interface Props {
  employeeId: string;
  employeeName: string;
  initialDate?: string;
  onSaved: (record: AttendanceRecord) => void;
  /** El usuario eligio "Falta": se sigue en ADP-03 con la fecha elegida (no se guarda nada aqui). */
  onAbsence: (date: string) => void;
  onCancel: () => void;
}

/**
 * ADP-02 - "Registrar marcación" manual (tratamiento AS-IS: sin campos de biometria).
 * Una falta se resuelve en ADP-03 (justificar o no); aqui solo se elige y se continua.
 */
export function RegisterAttendanceDialog({ employeeId, employeeName, initialDate, onSaved, onAbsence, onCancel }: Props) {
  const [date, setDate] = useState(initialDate ?? limaToday());
  const [choice, setChoice] = useState<Choice>('PRESENTE');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [minutesLate, setMinutesLate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!date) return;
    const minutes = Number(minutesLate);
    if (choice === 'TARDANZA' && (!Number.isInteger(minutes) || minutes <= 0)) return;
    if (choice === 'FALTA') {
      onAbsence(date);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const saved = await logAttendance(idToken, employeeId, {
        date,
        status: choice,
        minutesLate: choice === 'TARDANZA' ? minutes : undefined,
        checkInTime: checkIn ? localToIso(date, checkIn) : undefined,
        checkOutTime: checkOut ? localToIso(date, checkOut) : undefined,
        notes: notes.trim() || undefined,
      });
      onSaved(saved);
    } catch (err) {
      setError(describeHrError(err, 'No pudimos registrar la marcación. Intenta de nuevo.'));
      setBusy(false);
    }
  }

  return (
    <HrDialog
      titleId="register-attendance-title"
      title={`Registrar marcación — ${employeeName}`}
      description="Registro manual de la asistencia del día."
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      <form onSubmit={(e) => void submit(e)} noValidate>
        <div className={styles.field}>
          <label htmlFor="att-date">Fecha</label>
          <input id="att-date" type="date" className={styles.inputLine} value={date} max={limaToday()} onChange={(e) => setDate(e.target.value)} aria-invalid={submitted && !date} required />
          {submitted && !date && (
            <span className={styles.error} role="alert">
              Indica la fecha.
            </span>
          )}
        </div>
        <fieldset className={styles.field}>
          <legend>Resultado del día</legend>
          {[...MANUAL_ATTENDANCE_OPTIONS, 'FALTA' as const].map((value) => (
            <label key={value} className={styles.check}>
              <input type="radio" name="att-choice" value={value} checked={choice === value} onChange={() => setChoice(value)} />
              {value === 'FALTA' ? 'Falta (se continúa para justificarla)' : ATTENDANCE_STATUS_LABEL[value]}
            </label>
          ))}
        </fieldset>
        {choice === 'TARDANZA' && (
          <div className={styles.field}>
            <label htmlFor="att-late">Minutos de tardanza</label>
            <input
              id="att-late"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              className={styles.inputLine}
              value={minutesLate}
              onChange={(e) => setMinutesLate(e.target.value)}
              aria-invalid={submitted && !(Number(minutesLate) > 0)}
              required
            />
            {submitted && !(Number.isInteger(Number(minutesLate)) && Number(minutesLate) > 0) && (
              <span className={styles.error} role="alert">
                Indica cuántos minutos llegó tarde.
              </span>
            )}
          </div>
        )}
        {choice !== 'FALTA' && (
          <>
            <div className={styles.field}>
              <label htmlFor="att-in">Hora de entrada (opcional)</label>
              <input id="att-in" type="time" className={styles.inputLine} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="att-out">Hora de salida (opcional)</label>
              <input id="att-out" type="time" className={styles.inputLine} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </>
        )}
        {choice !== 'FALTA' && (
          <div className={styles.field}>
            <label htmlFor="att-notes">Observaciones (opcional)</label>
            <textarea id="att-notes" className={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className={styles.primaryButton} disabled={busy}>
            {busy ? 'Guardando…' : choice === 'FALTA' ? 'Continuar' : 'Registrar marcación'}
          </button>
        </div>
      </form>
    </HrDialog>
  );
}
