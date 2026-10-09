import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { HrFrame } from './HrFrame';
import { getEmployee, getEmployeeVacations, scheduleVacation, type EmployeeDetail, type VacationRequest } from './hr-client';
import { VACATION_STATUS_LABEL } from './hr-domain';
import { VACATION_CONFLICT_MESSAGE } from './hr-errors';
import { formatDate } from './hr-format';
import { useHrPermissions } from './hr-permissions';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import { useVacationConflict } from './useVacationConflict';
import styles from './HrFlow.module.css';

interface Loaded {
  employee: EmployeeDetail;
  vacations: VacationRequest[];
}

/**
 * ADP-05 - Solicitud de vacaciones (BR-ADP-002: maximo 1 persona por area a la vez, prioridad por
 * orden de solicitud). El conflicto se valida ANTES de enviar y solo se muestra el conflicto puntual.
 */
export function VacationScreen() {
  const { id } = useParams();
  const { can } = useHrPermissions();
  const { state, data, context, reload } = useHrResource<Loaded>(
    id
      ? async (token) => {
          const [employee, vacations] = await Promise.all([getEmployee(token, id), getEmployeeVacations(token, id).catch(() => [])]);
          return { employee, vacations };
        }
      : null,
    id ?? '',
  );
  const command = useHrCommand({ context, reload });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [serverConflict, setServerConflict] = useState(false);
  const startRef = useRef<HTMLInputElement>(null);

  const employee = data?.employee;
  const check = useVacationConflict({ scope: context ? { companyId: context.companyId, branchId: context.branchId } : undefined, areaId: employee?.areaId, employeeId: id, startDate, endDate });
  const conflict = check.status === 'CONFLICT' || serverConflict;
  const rangeInvalid = !!startDate && !!endDate && endDate < startDate;
  const canRequest = can('SCHEDULE_VACATION') && employee?.status !== 'TERMINADO';

  useEffect(() => {
    if (canRequest && data) startRef.current?.focus();
  }, [canRequest, data]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!id || !startDate || !endDate || rangeInvalid || conflict) return;
    setServerConflict(false);
    const res = await command.run((token) => scheduleVacation(token, id, { startDate, endDate }), 'No pudimos registrar la solicitud. Intenta de nuevo.');
    if (res.ok) {
      command.setNotice('Vacaciones programadas.');
      setStartDate('');
      setEndDate('');
      setSubmitted(false);
      await reload();
    } else if (res.message === VACATION_CONFLICT_MESSAGE) {
      // Otra persona la tomo entre la validacion y el envio: se muestra la misma franja.
      setServerConflict(true);
    }
  }

  const vacations = [...(data?.vacations ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <HrFrame
      pageTitle={employee ? `Solicitar vacaciones — ${employee.fullName}` : 'Solicitar vacaciones'}
      back={{ label: 'Volver a la ficha', to: `/personal/${id}` }}
      context={context}
      state={state}
      hasData={!!data}
      subject="las vacaciones"
      busy={command.saving}
    >
      {data && employee && (
        <>
          <div aria-live="polite">
            {command.notice && (
              <p className={styles.notice} role="status">
                {command.notice}
              </p>
            )}
          </div>
          {command.error && !serverConflict && (
            <p className={styles.errorBanner} role="alert">
              {command.error}
            </p>
          )}

          {canRequest ? (
            <form className={styles.card} onSubmit={(e) => void submit(e)} noValidate aria-labelledby="vac-form">
              <h2 id="vac-form" className={styles.sectionTitle}>
                Elige tus fechas
              </h2>
              <label className={styles.fieldLabel} htmlFor="vac-desde">
                Desde
              </label>
              <input
                id="vac-desde"
                ref={startRef}
                type="date"
                className={styles.input}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setServerConflict(false);
                }}
                aria-invalid={submitted && !startDate}
                required
              />
              {submitted && !startDate && (
                <p className={styles.fieldError} role="alert">
                  Indica desde cuándo.
                </p>
              )}
              <label className={styles.fieldLabel} htmlFor="vac-hasta">
                Hasta
              </label>
              <input
                id="vac-hasta"
                type="date"
                className={styles.input}
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setServerConflict(false);
                }}
                aria-invalid={(submitted && !endDate) || rangeInvalid}
                required
              />
              {submitted && !endDate && (
                <p className={styles.fieldError} role="alert">
                  Indica hasta cuándo.
                </p>
              )}
              {rangeInvalid && (
                <p className={styles.fieldError} role="alert">
                  La fecha final debe ser igual o posterior a la inicial.
                </p>
              )}
              <div className={styles.rowActions}>
                <button type="submit" className={styles.primaryButton} disabled={command.saving || conflict || check.status === 'CHECKING'}>
                  {command.saving ? 'Enviando…' : 'Solicitar'}
                </button>
              </div>
              <div aria-live="polite">
                {check.status === 'CHECKING' && <p className={styles.hint}>Verificando disponibilidad de tu área…</p>}
                {conflict && (
                  <p className={styles.banner} role="alert">
                    <AlertTriangle size={16} aria-hidden="true" /> {VACATION_CONFLICT_MESSAGE}
                    {check.status === 'CONFLICT' && ` (fechas ocupadas: del ${formatDate(check.startDate)} al ${formatDate(check.endDate)})`}.
                  </p>
                )}
                {check.status === 'UNAVAILABLE' && !conflict && (
                  <p className={styles.hint}>No pudimos verificar la disponibilidad antes de enviar; el sistema la revisará al solicitar.</p>
                )}
              </div>
            </form>
          ) : (
            <p className={styles.hint}>No tienes permiso para solicitar vacaciones.</p>
          )}

          <section className={styles.card} aria-labelledby="vac-lista">
            <h2 id="vac-lista" className={styles.sectionTitle}>
              Solicitudes de vacaciones
            </h2>
            {vacations.length === 0 ? (
              <p className={styles.hint}>Todavía no hay solicitudes de vacaciones.</p>
            ) : (
              <ul className={styles.plainList}>
                {vacations.map((v) => (
                  <li key={v.id} className={styles.listItem}>
                    Del {formatDate(v.startDate)} al {formatDate(v.endDate)} · {VACATION_STATUS_LABEL[v.status]}
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
