import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { HrFrame } from './HrFrame';
import {
  LEAVE_EVIDENCE_MAX_BYTES,
  LEAVE_EVIDENCE_TYPES,
  attachLeaveEvidence,
  getEmployee,
  getEmployeeLeaves,
  listLeaveEvidence,
  requestLeave,
  resolveLeave,
  type EmployeeDetail,
  type LeaveEvidence,
  type LeaveRequest,
} from './hr-client';
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL, localToIso, type LeaveStatus, type LeaveType, limaToday } from './hr-domain';
import { formatDate, formatTime } from './hr-format';
import { useHrPermissions } from './hr-permissions';
import { useHrCommand, useUnsavedWarning } from './useHrCommand';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';

interface Loaded {
  employee: EmployeeDetail;
  leaves: LeaveRequest[];
  /** Sustento adjunto por permiso (ADP-04). */
  evidence: Record<string, LeaveEvidence[]>;
}

const EVIDENCE_LABEL: Record<string, string> = { 'application/pdf': 'PDF', 'image/jpeg': 'Foto', 'image/png': 'Foto', 'image/webp': 'Foto' };
const EVIDENCE_ACCEPT = LEAVE_EVIDENCE_TYPES.join(',');
const isAllowedEvidenceType = (type: string) => (LEAVE_EVIDENCE_TYPES as readonly string[]).includes(type);

const TYPES = Object.keys(LEAVE_TYPE_LABEL) as LeaveType[];
const STATUS_CLASS: Record<LeaveStatus, string> = {
  SOLICITADO: styles.badgeInfo,
  AUTORIZADO: styles.badgePositive,
  DENEGADO: styles.badgeNegative,
};

/**
 * ADP-04 - Solicitud / resolucion de permiso (BR-ADP-003). Cualquier persona con acceso solicita;
 * SOLO quien tiene AUTHORIZE_LEAVE ve "Aprobar" / "Denegar": los demas ven la solicitud de solo lectura.
 */
export function LeavesScreen() {
  const { id } = useParams();
  const { can } = useHrPermissions();
  const { state, data, context, reload } = useHrResource<Loaded>(
    id
      ? async (token, scope) => {
          const [employee, leaves] = await Promise.all([getEmployee(token, id, scope), getEmployeeLeaves(token, id)]);
          const entries = await Promise.all(leaves.map(async (leave) => [leave.id, await listLeaveEvidence(token, leave.id).catch(() => [] as LeaveEvidence[])] as const));
          return { employee, leaves, evidence: Object.fromEntries(entries) };
        }
      : null,
    id ?? '',
  );
  const command = useHrCommand({ context, reload });

  const [date, setDate] = useState(limaToday());
  const [type, setType] = useState<LeaveType>('PERMISO_HORAS');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  const employee = data?.employee;
  const canRequest = (can('MANAGE_EMPLOYEES') || can('AUTHORIZE_LEAVE') || can('REQUEST_FIELD_TRIP')) && employee?.status !== 'TERMINADO';
  const showForm = !!data && canRequest;

  useEffect(() => {
    if (showForm) dateRef.current?.focus();
  }, [showForm]);
  useUnsavedWarning(showForm && reason.trim().length > 0);

  const timeInvalid = !!startTime && !!endTime && endTime <= startTime;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!id || !date || !reason.trim() || timeInvalid) return;
    const res = await command.run(
      (token) =>
        requestLeave(token, id, {
          type,
          date,
          reason: reason.trim(),
          startTime: startTime ? localToIso(date, startTime) : undefined,
          endTime: endTime ? localToIso(date, endTime) : undefined,
        }),
      'No pudimos registrar la solicitud. Intenta de nuevo.',
    );
    if (res.ok) {
      command.setNotice('Solicitud de permiso registrada. Queda pendiente de autorización.');
      setReason('');
      setStartTime('');
      setEndTime('');
      setSubmitted(false);
      await reload();
    }
  }

  async function attach(leave: LeaveRequest, file: File | undefined) {
    if (!file) return;
    if (!isAllowedEvidenceType(file.type)) {
      command.setError('Adjunta una imagen (JPG, PNG, WEBP) o un PDF.');
      return;
    }
    if (file.size > LEAVE_EVIDENCE_MAX_BYTES) {
      command.setError('El archivo supera el tamaño máximo de 10 MB.');
      return;
    }
    const res = await command.run((token) => attachLeaveEvidence(token, leave.id, file), 'No pudimos adjuntar el archivo. Intenta de nuevo.');
    if (res.ok) {
      command.setNotice('Sustento adjuntado al permiso.');
      await reload();
    }
  }

  async function resolve(leave: LeaveRequest, status: 'AUTORIZADO' | 'DENEGADO') {
    const res = await command.run((token) => resolveLeave(token, leave.id, status), 'No pudimos resolver el permiso. Intenta de nuevo.');
    if (res.ok) {
      command.setNotice(status === 'AUTORIZADO' ? 'Permiso aprobado.' : 'Permiso denegado.');
      await reload();
    }
  }

  const leaves = [...(data?.leaves ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <HrFrame
      pageTitle={employee ? `Permiso — ${employee.fullName}` : 'Permiso'}
      back={{ label: 'Volver a la ficha', to: `/personal/${id}` }}
      context={context}
      state={state}
      hasData={!!data}
      subject="los permisos"
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
          {command.error && (
            <p className={styles.errorBanner} role="alert">
              {command.error}
            </p>
          )}

          {showForm && (
            <form className={styles.card} onSubmit={(e) => void submit(e)} noValidate aria-labelledby="permiso-form">
              <h2 id="permiso-form" className={styles.sectionTitle}>
                Solicitar un permiso
              </h2>
              <label className={styles.fieldLabel} htmlFor="permiso-fecha">
                Fecha
              </label>
              <input id="permiso-fecha" ref={dateRef} type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={submitted && !date} required />
              {submitted && !date && (
                <p className={styles.fieldError} role="alert">
                  Indica la fecha del permiso.
                </p>
              )}
              <label className={styles.fieldLabel} htmlFor="permiso-tipo">
                Tipo de permiso
              </label>
              <select id="permiso-tipo" className={styles.input} value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
                {TYPES.map((value) => (
                  <option key={value} value={value}>
                    {LEAVE_TYPE_LABEL[value]}
                  </option>
                ))}
              </select>
              <label className={styles.fieldLabel} htmlFor="permiso-desde">
                Desde la hora (opcional)
              </label>
              <input id="permiso-desde" type="time" className={styles.input} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <label className={styles.fieldLabel} htmlFor="permiso-hasta">
                Hasta la hora (opcional)
              </label>
              <input id="permiso-hasta" type="time" className={styles.input} value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-invalid={timeInvalid} />
              {timeInvalid && (
                <p className={styles.fieldError} role="alert">
                  La hora final debe ser posterior a la inicial.
                </p>
              )}
              <label className={styles.fieldLabel} htmlFor="permiso-motivo">
                Motivo
              </label>
              <textarea id="permiso-motivo" className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={submitted && !reason.trim()} required />
              {submitted && !reason.trim() && (
                <p className={styles.fieldError} role="alert">
                  Cuéntanos el motivo del permiso.
                </p>
              )}
              <div className={styles.rowActions}>
                <button type="submit" className={styles.primaryButton} disabled={command.saving}>
                  {command.saving ? 'Enviando…' : 'Solicitar permiso'}
                </button>
              </div>
            </form>
          )}

          <section className={styles.card} aria-labelledby="permiso-lista">
            <h2 id="permiso-lista" className={styles.sectionTitle}>
              Solicitudes de permiso
            </h2>
            {leaves.length === 0 ? (
              <p className={styles.hint}>Todavía no hay solicitudes de permiso.</p>
            ) : (
              <ul className={styles.plainList}>
                {leaves.map((leave) => (
                  <li key={leave.id} className={styles.listItem}>
                    <div className={styles.cardHeader}>
                      <p className={styles.entryText}>
                        {LEAVE_TYPE_LABEL[leave.type]} · {formatDate(leave.date)}
                        {leave.startTime && leave.endTime ? ` · ${formatTime(leave.startTime)} a ${formatTime(leave.endTime)}` : ''}
                      </p>
                      <span className={`${styles.badge} ${STATUS_CLASS[leave.status]}`}>{LEAVE_STATUS_LABEL[leave.status]}</span>
                    </div>
                    <p className={styles.entryText}>Motivo: {leave.reason}</p>
                    {leave.status !== 'SOLICITADO' && leave.authorizedByName && (
                      <p className={styles.entryMeta}>
                        Resuelto por {leave.authorizedByName}
                        {leave.resolutionNotes ? ` · ${leave.resolutionNotes}` : ''}
                      </p>
                    )}
                    <div className={styles.entryMeta}>
                      {(data.evidence[leave.id] ?? []).length > 0 ? (
                        <ul className={styles.plainList} aria-label={`Sustento del permiso del ${formatDate(leave.date)}`}>
                          {(data.evidence[leave.id] ?? []).map((item, index) => (
                            <li key={item.id}>
                              <a href={item.objectUrl} target="_blank" rel="noreferrer">
                                Sustento {index + 1} ({EVIDENCE_LABEL[item.contentType] ?? 'Archivo'})
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>Sin sustento adjunto.</span>
                      )}
                    </div>
                    {leave.status === 'SOLICITADO' && canRequest && (
                      <div>
                        <label className={styles.fieldLabel} htmlFor={`sustento-${leave.id}`}>
                          Adjuntar sustento (foto o PDF, hasta 10 MB)
                        </label>
                        <input
                          id={`sustento-${leave.id}`}
                          type="file"
                          accept={EVIDENCE_ACCEPT}
                          disabled={command.saving}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            void attach(leave, file);
                          }}
                        />
                      </div>
                    )}
                    {leave.status === 'SOLICITADO' && can('AUTHORIZE_LEAVE') && (
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.dangerButton} disabled={command.saving} aria-label={`Denegar permiso del ${formatDate(leave.date)}`} onClick={() => void resolve(leave, 'DENEGADO')}>
                          Denegar
                        </button>
                        <button type="button" className={styles.primaryButton} disabled={command.saving} aria-label={`Aprobar permiso del ${formatDate(leave.date)}`} onClick={() => void resolve(leave, 'AUTORIZADO')}>
                          Aprobar
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </HrFrame>
  );
}
