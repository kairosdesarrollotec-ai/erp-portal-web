import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmployeeStatusBadge } from './EmployeeBadge';
import { HrFrame } from './HrFrame';
import { useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { describeHrError } from './hr-errors';
import { getEmployee, linkEmployeeAccount, type EmployeeDetail, type UpdateEmployeeResult } from './hr-client';
import { EditEmployeeDialog } from './EditEmployeeDialog';
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
  const { state, data: employee, context, reload } = useHrResource<EmployeeDetail>(id ? (token) => getEmployee(token, id) : null, id ?? '');

  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<UpdateEmployeeResult | null>(null);

  async function handleSaved(result: UpdateEmployeeResult) {
    setSaved(result);
    setEditing(false);
    await reload();
  }

  async function handleLink() {
    if (!employee) return;
    setLinking(true);
    setLinkError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      await linkEmployeeAccount(idToken, employee.id);
      await reload();
    } catch (err) {
      setLinkError(describeHrError(err, 'No pudimos vincular la cuenta. Intenta de nuevo.'));
    } finally {
      setLinking(false);
    }
  }

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
          {saved && (
            <div className={saved.accountRelink?.action === 'UNLINKED' ? styles.warning : styles.notice} role="status" data-testid="edit-saved-notice">
              <p>Ficha actualizada.</p>
              {saved.accountRelink?.action === 'RELINKED' && (
                <p data-testid="relink-notice">
                  El correo cambió{saved.accountRelink.previousEmail ? ` de ${saved.accountRelink.previousEmail}` : ''}
                  {saved.accountRelink.newEmail ? ` a ${saved.accountRelink.newEmail}` : ''}: la ficha se re-vinculó a la cuenta del correo nuevo.
                  La cuenta anterior ya no está vinculada a esta ficha. El cambio quedó registrado en auditoría.
                </p>
              )}
              {saved.accountRelink?.action === 'UNLINKED' && (
                <p data-testid="relink-notice">
                  El correo cambió{saved.accountRelink.previousEmail ? ` de ${saved.accountRelink.previousEmail}` : ''}
                  {saved.accountRelink.newEmail ? ` a ${saved.accountRelink.newEmail}` : ''}, pero no existe una cuenta con ese correo: la ficha quedó{' '}
                  <strong>sin vincular</strong>. Cuando esa cuenta exista, usa «Vincular cuenta». El cambio quedó registrado en auditoría.
                </p>
              )}
            </div>
          )}

          <section className={styles.card} aria-labelledby="emp-datos">
            <div className={styles.cardHeader}>
              <h2 id="emp-datos" className={styles.sectionTitle}>
                Datos laborales
              </h2>
              <EmployeeStatusBadge status={employee.status} />
              {can('MANAGE_EMPLOYEES') && !terminated && (
                <button type="button" className={styles.secondaryButton} onClick={() => setEditing(true)}>
                  Editar ficha
                </button>
              )}
            </div>
            <dl className={styles.dataGrid}>
              {/* HU-35: sin HR_ADMINISTRATION.VIEW_EMPLOYEE_DOCUMENT el back devuelve documentNumber = null: no se muestra la fila. */}
              {employee.documentNumber && (
                <div>
                  <dt>Documento</dt>
                  <dd>
                    {employee.documentType} {employee.documentNumber}
                  </dd>
                </div>
              )}
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
                <dt>Cuenta de acceso</dt>
                <dd data-testid="account-link-status">
                  {employee.accountLinked ? 'Cuenta vinculada (por correo)' : 'Sin vincular (por correo)'}
                  {!employee.accountLinked && employee.email && can('MANAGE_EMPLOYEES') && !terminated && (
                    <>
                      {' '}
                      <button type="button" className={styles.secondaryButton} onClick={() => void handleLink()} disabled={linking}>
                        {linking ? 'Vinculando…' : 'Vincular cuenta'}
                      </button>
                    </>
                  )}
                  {!employee.accountLinked && !employee.email && <span className={styles.hint}> Registra un correo en la ficha para poder vincularla.</span>}
                </dd>
                {linkError && (
                  <p className={styles.errorBanner} role="alert">
                    {linkError}
                  </p>
                )}
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

          {(employee.recentMemos?.length ?? 0) > 0 && (
            <section className={styles.card} aria-labelledby="emp-memos">
              <h2 id="emp-memos" className={styles.sectionTitle}>
                Memos de advertencia
              </h2>
              <ul className={styles.plainList}>
                {employee.recentMemos?.map((memo) => (
                  <li key={memo.id} className={styles.listItem}>
                    <span className={styles.entryMeta}>
                      {formatDate(memo.issuedOn)}
                      {memo.generatedBy === 'SISTEMA' ? ' · generado automáticamente' : ''}
                    </span>
                    <span className={styles.entryText}>{memo.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(employee.recentTrainings?.length ?? 0) > 0 && (
            <section className={styles.card} aria-labelledby="emp-capacitaciones">
              <h2 id="emp-capacitaciones" className={styles.sectionTitle}>
                Capacitaciones
              </h2>
              <ul className={styles.plainList}>
                {employee.recentTrainings?.map((training) => (
                  <li key={training.id} className={styles.listItem}>
                    {training.topic} · {formatDate(training.heldOn)}
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
          {editing && <EditEmployeeDialog employee={employee} onReload={reload} onSaved={(r) => void handleSaved(r)} onCancel={() => setEditing(false)} />}
        </>
      )}
    </HrFrame>
  );
}
