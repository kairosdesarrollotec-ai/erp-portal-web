import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmployeeStatusBadge } from './EmployeeBadge';
import { HrFrame } from './HrFrame';
import { getEmployee, type EmployeeDetail } from './hr-client';
import {
  FIELD_TRIP_STATUS_LABEL,
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
  TERMINATION_REASON_LABEL,
  VACATION_STATUS_LABEL,
  formatSoles,
} from './hr-domain';
import { useHrPermissions } from './hr-permissions';
import { formatDate } from './hr-format';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';


/**
 * ADP-01 (ficha) - Datos laborales de la persona y accesos a ADP-02..ADP-09 segun permisos.
 * La ficha de Empleado es un registro propio: si la persona fue Candidato, Reclutamiento se
 * muestra como referencia enlazada, nunca fusionada.
 */
export function EmployeeFileScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useHrPermissions();
  const { state, data: employee, context } = useHrResource<EmployeeDetail>(id ? (token) => getEmployee(token, id) : null, id ?? '');

  const terminated = employee?.status === 'TERMINADO';
  const state0 = context ?? undefined;

  return (
    <HrFrame
      pageTitle={employee ? employee.fullName : 'Ficha de personal'}
      back={{ label: 'Volver a Personal', to: '/personal' }}
      context={context}
      state={state}
      hasData={!!employee}
      subject="la ficha"
      wide
    >
      {employee && (
        <>
          <section className={styles.card} aria-labelledby="emp-datos">
            <div className={styles.cardHeader}>
              <h2 id="emp-datos" className={styles.sectionTitle}>
                Datos laborales
              </h2>
              <EmployeeStatusBadge status={employee.status} />
            </div>
            <dl className={styles.dataGrid}>
              <div>
                <dt>Documento</dt>
                <dd>
                  {employee.documentType} {employee.documentNumber}
                </dd>
              </div>
              <div>
                <dt>Puesto</dt>
                <dd>{employee.jobTitle}</dd>
              </div>
              <div>
                <dt>Área</dt>
                <dd>{employee.areaName}</dd>
              </div>
              <div>
                <dt>Empresa y sede</dt>
                <dd>{context ? `${context.companyName} · ${context.branchName}` : '—'}</dd>
              </div>
              <div>
                <dt>Fecha de ingreso</dt>
                <dd>{formatDate(employee.hireDate)}</dd>
              </div>
              <div>
                <dt>Contacto</dt>
                <dd>{[employee.email, employee.phone].filter(Boolean).join(' · ') || '—'}</dd>
              </div>
              <div>
                <dt>Tardanzas en salidas a campo</dt>
                <dd>
                  {employee.fieldTripLateCount}
                  {employee.isFieldTripObserved && <span className={`${styles.badge} ${styles.badgeWarn}`}> Observado</span>}
                </dd>
              </div>
            </dl>
            {employee.candidateId && (
              <p className={styles.hint}>
                Esta persona pasó antes por un proceso de selección.{' '}
                <Link to={`/reclutamiento/candidatos/${employee.candidateId}`} state={state0}>
                  Ver su proceso en Reclutamiento
                </Link>
                . Es un registro aparte: la ficha de personal no se fusiona con la de candidato.
              </p>
            )}
          </section>

          {terminated && (
            <p className={styles.warning} role="status">
              La relación laboral terminó
              {employee.terminatedAt ? ` el ${formatDate(employee.terminatedAt)}` : ''}
              {employee.terminationReason ? ` por ${TERMINATION_REASON_LABEL[employee.terminationReason].toLowerCase()}` : ''}.
            </p>
          )}

          <section className={styles.card} aria-labelledby="emp-acciones">
            <h2 id="emp-acciones" className={styles.sectionTitle}>
              Gestionar
            </h2>
            <div className={styles.sectionLinks}>
              <button type="button" className={styles.secondaryButton} onClick={() => navigate(`/personal/${employee.id}/asistencia`, { state: state0 })}>
                Asistencia
              </button>
              {(can('VIEW_EMPLOYEES') || can('MANAGE_EMPLOYEES')) && !terminated && (
                <button type="button" className={styles.secondaryButton} onClick={() => navigate(`/personal/${employee.id}/permisos`, { state: state0 })}>
                  Permisos
                </button>
              )}
              {can('SCHEDULE_VACATION') && !terminated && (
                <button type="button" className={styles.secondaryButton} onClick={() => navigate(`/personal/${employee.id}/vacaciones`, { state: state0 })}>
                  Solicitar vacaciones
                </button>
              )}
              {can('REQUEST_FIELD_TRIP') && !terminated && (
                <button type="button" className={styles.secondaryButton} onClick={() => navigate(`/personal/${employee.id}/salida-a-campo`, { state: state0 })}>
                  Solicitar salida a campo
                </button>
              )}
              {can('TERMINATE_EMPLOYMENT') && !terminated && (
                <button type="button" className={styles.dangerButton} onClick={() => navigate(`/personal/${employee.id}/termino`, { state: state0 })}>
                  Registrar renuncia o despido
                </button>
              )}
            </div>
          </section>

          {employee.attendanceSummary && (
            <section className={styles.card} aria-labelledby="emp-asistencia">
              <h2 id="emp-asistencia" className={styles.sectionTitle}>
                Asistencia acumulada
              </h2>
              <div className={styles.statCards}>
                <div className={styles.stat}>
                  <p className={styles.statValue}>{employee.attendanceSummary.totalPresent ?? 0}</p>
                  <p className={styles.statLabel}>Presentes</p>
                </div>
                <div className={styles.stat}>
                  <p className={styles.statValue}>{employee.attendanceSummary.totalLate ?? 0}</p>
                  <p className={styles.statLabel}>Tardanzas</p>
                </div>
                <div className={styles.stat}>
                  <p className={styles.statValue}>{employee.attendanceSummary.totalJustifiedAbsences ?? 0}</p>
                  <p className={styles.statLabel}>Faltas justificadas</p>
                </div>
                <div className={styles.stat}>
                  <p className={styles.statValue}>{employee.attendanceSummary.totalUnjustifiedAbsences ?? 0}</p>
                  <p className={styles.statLabel}>Faltas injustificadas</p>
                </div>
                <div className={styles.stat}>
                  <p className={styles.statValue}>{formatSoles(employee.attendanceSummary.pendingDeductionAmount ?? 0)}</p>
                  <p className={styles.statLabel}>Descuento pendiente (fin de mes)</p>
                </div>
              </div>
            </section>
          )}

          {(employee.recentLeaves?.length ?? 0) > 0 && (
            <section className={styles.card} aria-labelledby="emp-permisos">
              <h2 id="emp-permisos" className={styles.sectionTitle}>
                Permisos recientes
              </h2>
              <ul className={styles.plainList}>
                {employee.recentLeaves?.map((leave) => (
                  <li key={leave.id} className={styles.listItem}>
                    {LEAVE_TYPE_LABEL[leave.type]} · {formatDate(leave.date)} · {LEAVE_STATUS_LABEL[leave.status]}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(employee.recentVacations?.length ?? 0) > 0 && (
            <section className={styles.card} aria-labelledby="emp-vacaciones">
              <h2 id="emp-vacaciones" className={styles.sectionTitle}>
                Vacaciones recientes
              </h2>
              <ul className={styles.plainList}>
                {employee.recentVacations?.map((v) => (
                  <li key={v.id} className={styles.listItem}>
                    Del {formatDate(v.startDate)} al {formatDate(v.endDate)} · {VACATION_STATUS_LABEL[v.status]}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(employee.recentFieldTrips?.length ?? 0) > 0 && (
            <section className={styles.card} aria-labelledby="emp-campo">
              <h2 id="emp-campo" className={styles.sectionTitle}>
                Salidas a campo recientes
              </h2>
              <ul className={styles.plainList}>
                {employee.recentFieldTrips?.map((t) => (
                  <li key={t.id} className={styles.listItem}>
                    {t.destination} · {FIELD_TRIP_STATUS_LABEL[t.status]}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </HrFrame>
  );
}
