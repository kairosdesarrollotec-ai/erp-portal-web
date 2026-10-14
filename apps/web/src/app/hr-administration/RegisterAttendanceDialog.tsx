import { useState, type FormEvent } from 'react';
import { HrDialog } from './HrDialog';
import { logAttendance, type AttendanceEvidenceInput, type AttendanceRecord } from './hr-client';
import { describeHrError } from './hr-errors';
import { ATTENDANCE_STATUS_LABEL, MANUAL_ATTENDANCE_OPTIONS, localToIso, type AttendanceStatus, limaToday } from './hr-domain';
import { getFirebaseAuth } from '../providers/firebase';
import { limaNowInputValue } from '../shared/lima-time';
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
 * ADP-02 - "Registrar marcación" manual (sin biometria; la corroboracion es la foto de WhatsApp como evidencia opcional).
 * Una falta se resuelve en ADP-03 (justificar o no); aqui solo se elige y se continua.
 */
/** Un enlace http(s) viaja como `url`; cualquier otra cosa es una referencia interna (`storageRef`). */
function buildEvidence(photoRef: string, capturedAt: string, note: string): AttendanceEvidenceInput | null {
  const ref = photoRef.trim();
  if (!ref) return null;
  const isUrl = /^https?:\/\//i.test(ref);
  return {
    kind: 'WHATSAPP_PHOTO',
    ...(isUrl ? { url: ref } : { storageRef: ref }),
    // datetime-local entrega YYYY-MM-DDTHH:mm; el servidor la interpreta como hora de Lima.
    capturedAtLocal: capturedAt.length === 16 ? `${capturedAt}:00` : capturedAt,
    ...(note.trim() ? { note: note.trim() } : {}),
  };
}

export function RegisterAttendanceDialog({ employeeId, employeeName, initialDate, onSaved, onAbsence, onCancel }: Props) {
  const [date, setDate] = useState(initialDate ?? limaToday());
  const [choice, setChoice] = useState<Choice>('PRESENTE');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [minutesLate, setMinutesLate] = useState('');
  const [notes, setNotes] = useState('');
  const [photoRef, setPhotoRef] = useState('');
  const [capturedAt, setCapturedAt] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Evidencia opcional: si se empieza a llenar, debe estar completa.
  const wantsEvidence = photoRef.trim() !== '' || capturedAt !== '' || evidenceNote.trim() !== '';

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
    // La evidencia es opcional, pero si se empieza a llenar debe estar completa y no ser futura (hora de Lima).
    if (wantsEvidence && (!photoRef.trim() || !capturedAt || capturedAt > limaNowInputValue())) return;
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
        evidence: wantsEvidence ? (buildEvidence(photoRef, capturedAt, evidenceNote) ?? undefined) : undefined,
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
        {choice !== 'FALTA' && (
          <fieldset className={styles.field}>
            <legend>Evidencia (foto del grupo de WhatsApp)</legend>
            <p className={styles.description}>
              Foto con reloj, hora y rostro que corrobora la marcación. Es opcional, pero sin ella el registro queda marcado como “sin evidencia”.
            </p>
            <label htmlFor="att-evidence-ref">Enlace o referencia de la foto</label>
            <input
              id="att-evidence-ref"
              type="text"
              className={styles.inputLine}
              value={photoRef}
              onChange={(e) => setPhotoRef(e.target.value)}
              aria-invalid={submitted && wantsEvidence && !photoRef.trim()}
            />
            {submitted && wantsEvidence && !photoRef.trim() && (
              <span className={styles.error} role="alert">
                Indica el enlace o la referencia de la foto.
              </span>
            )}
            <label htmlFor="att-evidence-at">Fecha y hora de captura (hora de Lima)</label>
            <input
              id="att-evidence-at"
              type="datetime-local"
              className={styles.inputLine}
              value={capturedAt}
              max={limaNowInputValue()}
              onChange={(e) => setCapturedAt(e.target.value)}
              aria-invalid={submitted && wantsEvidence && (!capturedAt || capturedAt > limaNowInputValue())}
            />
            {submitted && wantsEvidence && !capturedAt && (
              <span className={styles.error} role="alert">
                Indica cuándo se tomó la foto.
              </span>
            )}
            {submitted && wantsEvidence && capturedAt > limaNowInputValue() && (
              <span className={styles.error} role="alert">
                La fecha y hora de la foto no puede ser futura.
              </span>
            )}
            <label htmlFor="att-evidence-note">Nota de la evidencia (opcional)</label>
            <input id="att-evidence-note" type="text" className={styles.inputLine} value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)} />
          </fieldset>
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
