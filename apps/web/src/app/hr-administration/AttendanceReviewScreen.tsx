import { useState, type FormEvent } from 'react';
import { HrFrame } from './HrFrame';
import { HrDialog } from './HrDialog';
import { AttendanceMarkInfo } from './AttendanceMarkInfo';
import { listAttendancePendingReview, reviewAttendance, type AttendanceRecord } from './hr-client';
import { ATTENDANCE_STATUS_LABEL, type AttendanceStatus } from './hr-domain';
import { formatDate } from './hr-format';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';

const CORRECT_STATUSES: AttendanceStatus[] = ['PRESENTE', 'TARDANZA', 'FALTA_INJUSTIFICADA', 'FALTA_JUSTIFICADA'];

function CorrectDialog({
  record,
  saving,
  error,
  onSubmit,
  onClose,
}: {
  record: AttendanceRecord;
  saving: boolean;
  error: string | null;
  onSubmit: (input: { status: AttendanceStatus; minutesLate?: number; note: string }) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(record.status);
  const [minutes, setMinutes] = useState(record.minutesLate > 0 ? String(record.minutesLate) : '');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const minutesValue = Number(minutes);
  const minutesBad = status === 'TARDANZA' && (!Number.isInteger(minutesValue) || minutesValue < 1);
  const noteBad = note.trim().length < 3;

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (minutesBad || noteBad) return;
    onSubmit({ status, ...(status === 'TARDANZA' ? { minutesLate: minutesValue } : {}), note: note.trim() });
  }

  return (
    <HrDialog
      titleId="att-correct-title"
      title="Corregir la marca"
      description={`${record.employeeName ?? 'Colaborador'} · ${formatDate(record.date)}. Indica cómo debe quedar y por qué.`}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <label className={styles.fieldLabel} htmlFor="att-correct-status">
          Resultado correcto
        </label>
        <select id="att-correct-status" className={styles.input} value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
          {CORRECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ATTENDANCE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {status === 'TARDANZA' && (
          <>
            <label className={styles.fieldLabel} htmlFor="att-correct-min">
              Minutos de tardanza
            </label>
            <input id="att-correct-min" type="number" min={1} className={styles.input} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            {submitted && minutesBad && (
              <p className={styles.fieldError} role="alert">
                Indica los minutos de tardanza.
              </p>
            )}
          </>
        )}
        <label className={styles.fieldLabel} htmlFor="att-correct-note">
          Nota de la corrección (obligatoria)
        </label>
        <textarea id="att-correct-note" className={styles.input} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        {submitted && noteBad && (
          <p className={styles.fieldError} role="alert">
            Escribe la nota de la corrección (al menos 3 caracteres).
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
            {saving ? 'Guardando…' : 'Guardar corrección'}
          </button>
        </div>
      </form>
    </HrDialog>
  );
}

/**
 * Bandeja de marcas FUERA DE LA GEOCERCA (22-oct #9): quien tiene REVIEW_ATTENDANCE las aprueba tal cual o las corrige
 * con una nota. Estados: cargando / error / sin permiso (HrFrame), vacio y lista.
 */
export function AttendanceReviewScreen() {
  const { state, data, context, reload } = useHrResource<AttendanceRecord[]>((token, scope) => listAttendancePendingReview(token, scope), 'pending-review');
  const command = useHrCommand({ context, reload });
  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null);

  async function approve(record: AttendanceRecord) {
    const res = await command.run((token) => reviewAttendance(token, record.id, { decision: 'APPROVE' }), 'No pudimos aprobar la marca. Intenta de nuevo.');
    if (res.ok) {
      command.setNotice(`Marca de ${record.employeeName ?? 'la persona'} aprobada.`);
      await reload();
    }
  }

  async function correct(input: { status: AttendanceStatus; minutesLate?: number; note: string }) {
    if (!correcting) return;
    const target = correcting;
    const res = await command.run(
      (token) => reviewAttendance(token, target.id, { decision: 'CORRECT', ...input }),
      'No pudimos guardar la corrección. Intenta de nuevo.',
    );
    if (res.ok) {
      command.setNotice(`Marca de ${target.employeeName ?? 'la persona'} corregida.`);
      setCorrecting(null);
      await reload();
    }
  }

  return (
    <HrFrame
      pageTitle="Marcas fuera de la geocerca"
      back={{ label: 'Volver a la asistencia', to: '/personal/asistencia' }}
      context={context}
      state={state}
      hasData={!!data}
      subject="las marcas por revisar"
      busy={command.saving}
    >
      {data && (
        <>
          <div aria-live="polite">
            {command.notice && (
              <p className={styles.notice} role="status">
                {command.notice}
              </p>
            )}
          </div>
          {command.error && !correcting && (
            <p className={styles.errorBanner} role="alert">
              {command.error}
            </p>
          )}
          <section className={styles.card} aria-labelledby="rev-lista">
            <h2 id="rev-lista" className={styles.sectionTitle}>
              Pendientes de revisión
            </h2>
            {data.length === 0 ? (
              <p className={styles.hint} data-testid="review-empty">
                No hay marcas pendientes de revisión.
              </p>
            ) : (
              <ul className={styles.plainList}>
                {data.map((r) => (
                  <li key={r.id} className={styles.listItem}>
                    <strong>{r.employeeName ?? 'Colaborador'}</strong> · {formatDate(r.date)} · {ATTENDANCE_STATUS_LABEL[r.status]}
                    <AttendanceMarkInfo record={r} />
                    <span className={styles.rowActions}>
                      <button type="button" className={styles.smallButton} onClick={() => void approve(r)} disabled={command.saving} aria-label={`Aprobar la marca de ${r.employeeName ?? 'la persona'}`}>
                        Aprobar
                      </button>
                      <button
                        type="button"
                        className={styles.smallButton}
                        onClick={() => {
                          command.clearError();
                          setCorrecting(r);
                        }}
                        disabled={command.saving}
                        aria-label={`Corregir la marca de ${r.employeeName ?? 'la persona'}`}
                      >
                        Corregir
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {correcting && <CorrectDialog record={correcting} saving={command.saving} error={command.error} onSubmit={(i) => void correct(i)} onClose={() => setCorrecting(null)} />}
        </>
      )}
    </HrFrame>
  );
}
