import { useState, type FormEvent } from 'react';
import { HrFrame } from './HrFrame';
import {
  getMyEmployee,
  listMyLeaves,
  listMyVacations,
  requestMyLeave,
  requestMyVacation,
  type LeaveRequest,
  type MyEmployee,
  type VacationRequest,
} from './hr-client';
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL, VACATION_STATUS_LABEL, limaToday, type LeaveType } from './hr-domain';
import { formatDate } from './hr-format';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';

interface Loaded {
  employee: MyEmployee;
  leaves: LeaveRequest[];
  vacations: VacationRequest[];
}

const LEAVE_TYPES = Object.keys(LEAVE_TYPE_LABEL) as LeaveType[];

export function MyRequestsScreen() {
  const [tab, setTab] = useState<'LEAVES' | 'VACATIONS'>('LEAVES');
  const { state, data, context, reload } = useHrResource<Loaded>(
    async (token, scope) => {
      const [employee, leaves, vacations] = await Promise.all([
        getMyEmployee(token, scope),
        listMyLeaves(token, scope).catch(() => []),
        listMyVacations(token, scope).catch(() => []),
      ]);
      return { employee, leaves, vacations };
    },
    'my-requests',
  );

  const command = useHrCommand({ context, reload });

  // Leave form state
  const [leaveDate, setLeaveDate] = useState(limaToday());
  const [leaveType, setLeaveType] = useState<LeaveType>('PERMISO_HORAS');
  const [leaveStartTime, setLeaveStartTime] = useState('');
  const [leaveEndTime, setLeaveEndTime] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitted, setLeaveSubmitted] = useState(false);

  // Vacation form state
  const [vacStartDate, setVacStartDate] = useState('');
  const [vacEndDate, setVacEndDate] = useState('');
  const [vacNotes, setVacNotes] = useState('');
  const [vacSubmitted, setVacSubmitted] = useState(false);

  const leaveTimeInvalid = !!leaveStartTime && !!leaveEndTime && leaveEndTime <= leaveStartTime;
  const vacRangeInvalid = !!vacStartDate && !!vacEndDate && vacEndDate < vacStartDate;

  async function submitLeave(event: FormEvent) {
    event.preventDefault();
    setLeaveSubmitted(true);
    if (!context || !leaveDate || !leaveReason.trim() || leaveTimeInvalid) return;

    const res = await command.run(
      (token) =>
        requestMyLeave(token, context, {
          type: leaveType,
          date: leaveDate,
          reason: leaveReason.trim(),
          startTime: leaveStartTime ? `${leaveDate}T${leaveStartTime}:00` : undefined,
          endTime: leaveEndTime ? `${leaveDate}T${leaveEndTime}:00` : undefined,
        }),
      'No pudimos registrar la solicitud de permiso. Intenta de nuevo.',
    );

    if (res.ok) {
      command.setNotice('Permiso solicitado exitosamente (estado SOLICITADO).');
      setLeaveReason('');
      setLeaveStartTime('');
      setLeaveEndTime('');
      setLeaveSubmitted(false);
      await reload();
    }
  }

  async function submitVacation(event: FormEvent) {
    event.preventDefault();
    setVacSubmitted(true);
    if (!context || !vacStartDate || !vacEndDate || vacRangeInvalid) return;

    const res = await command.run(
      (token) =>
        requestMyVacation(token, context, {
          startDate: vacStartDate,
          endDate: vacEndDate,
          notes: vacNotes.trim() || undefined,
        }),
      'No pudimos registrar la solicitud de vacaciones. Intenta de nuevo.',
    );

    if (res.ok) {
      command.setNotice('Vacaciones solicitadas exitosamente (estado SOLICITADA).');
      setVacStartDate('');
      setVacEndDate('');
      setVacNotes('');
      setVacSubmitted(false);
      await reload();
    }
  }

  return (
    <HrFrame
      pageTitle="Mis Solicitudes"
      context={context}
      state={state}
      hasData={!!data}
      subject="mis solicitudes"
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

          <div className={styles.tabBar} role="tablist" aria-label="Tipo de solicitud">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'LEAVES'}
              className={tab === 'LEAVES' ? styles.tabActive : styles.tab}
              onClick={() => setTab('LEAVES')}
            >
              Permisos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'VACATIONS'}
              className={tab === 'VACATIONS' ? styles.tabActive : styles.tab}
              onClick={() => setTab('VACATIONS')}
            >
              Vacaciones
            </button>
          </div>

          {tab === 'LEAVES' ? (
            <>
              <form className={styles.card} onSubmit={(e) => void submitLeave(e)} noValidate>
                <h2 className={styles.sectionTitle}>Solicitar nuevo permiso</h2>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="leave-type">
                      Tipo de permiso
                    </label>
                    <select
                      id="leave-type"
                      className={styles.select}
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                    >
                      {LEAVE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {LEAVE_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="leave-date">
                      Fecha
                    </label>
                    <input
                      id="leave-date"
                      type="date"
                      className={styles.input}
                      value={leaveDate}
                      onChange={(e) => setLeaveDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="leave-start-time">
                      Hora inicio (opcional)
                    </label>
                    <input
                      id="leave-start-time"
                      type="time"
                      className={styles.input}
                      value={leaveStartTime}
                      onChange={(e) => setLeaveStartTime(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="leave-end-time">
                      Hora fin (opcional)
                    </label>
                    <input
                      id="leave-end-time"
                      type="time"
                      className={styles.input}
                      value={leaveEndTime}
                      onChange={(e) => setLeaveEndTime(e.target.value)}
                    />
                    {leaveSubmitted && leaveTimeInvalid && (
                      <p className={styles.errorText}>La hora de fin debe ser posterior a la de inicio.</p>
                    )}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="leave-reason">
                    Motivo (obligatorio)
                  </label>
                  <textarea
                    id="leave-reason"
                    className={styles.textarea}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    rows={3}
                    placeholder="Describe el motivo de la solicitud..."
                  />
                  {leaveSubmitted && !leaveReason.trim() && (
                    <p className={styles.errorText}>El motivo es obligatorio.</p>
                  )}
                </div>

                <button type="submit" className={styles.primaryButton} disabled={command.saving}>
                  {command.saving ? 'Enviando...' : 'Solicitar permiso'}
                </button>
              </form>

              <section className={styles.card}>
                <h2 className={styles.sectionTitle}>Historial de permisos</h2>
                {data.leaves.length === 0 ? (
                  <p className={styles.hint}>No tienes solicitudes de permiso registradas.</p>
                ) : (
                  <ul className={styles.plainList}>
                    {data.leaves.map((l) => (
                      <li key={l.id} className={styles.listItem}>
                        <strong>{formatDate(l.date)}</strong> · {LEAVE_TYPE_LABEL[l.type]} ·{' '}
                        <span className={styles.badge}>{LEAVE_STATUS_LABEL[l.status]}</span>
                        <p className={styles.hint}>{l.reason}</p>
                        {l.resolutionNotes && (
                          <p className={styles.subtext}>Resolución: {l.resolutionNotes}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <>
              <form className={styles.card} onSubmit={(e) => void submitVacation(e)} noValidate>
                <h2 className={styles.sectionTitle}>Solicitar vacaciones</h2>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="vac-start">
                      Fecha de inicio
                    </label>
                    <input
                      id="vac-start"
                      type="date"
                      className={styles.input}
                      value={vacStartDate}
                      onChange={(e) => setVacStartDate(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="vac-end">
                      Fecha de fin
                    </label>
                    <input
                      id="vac-end"
                      type="date"
                      className={styles.input}
                      value={vacEndDate}
                      onChange={(e) => setVacEndDate(e.target.value)}
                    />
                    {vacSubmitted && vacRangeInvalid && (
                      <p className={styles.errorText}>La fecha de fin debe ser igual o posterior a la de inicio.</p>
                    )}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="vac-notes">
                    Notas adicionales (opcional)
                  </label>
                  <textarea
                    id="vac-notes"
                    className={styles.textarea}
                    value={vacNotes}
                    onChange={(e) => setVacNotes(e.target.value)}
                    rows={2}
                    placeholder="Detalles adicionales sobre tu solicitud..."
                  />
                </div>

                <button type="submit" className={styles.primaryButton} disabled={command.saving}>
                  {command.saving ? 'Enviando...' : 'Solicitar vacaciones'}
                </button>
              </form>

              <section className={styles.card}>
                <h2 className={styles.sectionTitle}>Historial de vacaciones</h2>
                {data.vacations.length === 0 ? (
                  <p className={styles.hint}>No tienes solicitudes de vacaciones registradas.</p>
                ) : (
                  <ul className={styles.plainList}>
                    {data.vacations.map((v) => (
                      <li key={v.id} className={styles.listItem}>
                        <strong>
                          Del {formatDate(v.startDate)} al {formatDate(v.endDate)}
                        </strong>{' '}
                        · <span className={styles.badge}>{VACATION_STATUS_LABEL[v.status]}</span>
                        {v.grantedDays && <span> · {v.grantedDays} días otorgados</span>}
                        {v.statusReason && <p className={styles.subtext}>Motivo: {v.statusReason}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}
    </HrFrame>
  );
}
