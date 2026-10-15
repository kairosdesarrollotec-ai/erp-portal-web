import { Link, useNavigate } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { EmployeeStatusBadge } from './EmployeeBadge';
import { EMPLOYEE_STATUS_LABEL, type EmployeeStatus } from './hr-domain';
import { useHrPermissions } from './hr-permissions';
import { useEmployeesList } from './useEmployeesList';
import styles from './HrFlow.module.css';

const STATUSES = Object.keys(EMPLOYEE_STATUS_LABEL) as EmployeeStatus[];

/**
 * ADP-01 - Bandeja de personal. Tabla (desktop) / tarjetas (movil, via CSS) con Nombre, Area,
 * Empresa y Relacion laboral (badge con texto). Filtros por empresa (la del contexto de trabajo) y
 * area. Accion primaria por fila: "Abrir ficha". El Empleado es un registro propio: nunca se
 * fusiona con Candidato ni Cliente.
 */
function EmployeesList() {
  const list = useEmployeesList();
  const { can } = useHrPermissions();
  const navigate = useNavigate();
  const { state, employees, context } = list;

  const open = (id: string) => navigate(`/personal/${id}`, { state: context ?? undefined });

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Personal" />
      <div className={`${styles.content} ${styles.contentWide}`}>
        <h1 className={styles.title}>Personal</h1>
        <nav className={styles.linkRow} aria-label="Procesos de personal">
          <Link className={styles.smallButton} to="/personal/asistencia" state={context ?? undefined}>
            Asistencia del mes
          </Link>
          {(can('REQUEST_FIELD_TRIP') || can('AUTHORIZE_FIELD_TRIP') || can('EVALUATE_FIELD_TRIP_RETURN')) && (
            <Link className={styles.smallButton} to="/personal/campo" state={context ?? undefined}>
              Salidas a campo
            </Link>
          )}
          {can('REGISTER_TRAINING') && (
            <Link className={styles.smallButton} to="/personal/capacitacion" state={context ?? undefined}>
              Capacitación
            </Link>
          )}
          {can('REQUEST_FIELD_TRIP') && (
            <Link className={styles.smallButton} to="/personal/salida-a-campo" state={context ?? undefined}>
              Solicitar mi salida a campo
            </Link>
          )}
          {can('MANAGE_EMPLOYEES') && (
            <Link className={styles.smallButton} to="/personal/nuevo" state={context ?? undefined}>
              Nueva persona
            </Link>
          )}
        </nav>

        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <div className={styles.filter}>
              <span>Empresa</span>
              <strong className={styles.companyChip}>{context?.companyName ?? '—'}</strong>
            </div>
            <label className={styles.filter}>
              Área
              <select className={styles.select} value={list.areaId} onChange={(e) => list.setAreaId(e.target.value)}>
                <option value="">Todas las áreas</option>
                {Object.entries(list.areas).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filter}>
              Relación laboral
              <select className={styles.select} value={list.status} onChange={(e) => list.setStatus(e.target.value as EmployeeStatus | '')}>
                <option value="">Todas</option>
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {EMPLOYEE_STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filter}>
              Buscar por nombre o documento
              <input className={styles.select} type="search" value={list.search} onChange={(e) => list.setSearch(e.target.value)} />
            </label>
          </div>
        </div>

        <div aria-live="polite">{state === 'LOADING' && <p className={styles.statusText}>Cargando personal…</p>}</div>

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText} role="alert">
            No pudimos cargar el personal. Intenta de nuevo en unos segundos.{' '}
            <button type="button" className={styles.smallButton} onClick={() => void list.reload()}>
              Reintentar
            </button>
          </p>
        )}

        {state === 'EMPTY' && (
          <p className={styles.statusText}>
            {list.areaId || list.status || list.search ? 'Ninguna persona coincide con los filtros.' : 'Todavía no hay personal registrado.'}
          </p>
        )}

        {state === 'READY' && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table} aria-label="Personal">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Área</th>
                    <th scope="col">Empresa</th>
                    <th scope="col">Relación laboral</th>
                    <th scope="col">
                      <span className={styles.srOnly}>Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((item) => (
                    <tr key={item.id} className={styles.row}>
                      <td data-label="Nombre">{item.fullName}</td>
                      <td data-label="Área">{item.areaName}</td>
                      <td data-label="Empresa">{context?.companyName ?? ''}</td>
                      <td data-label="Relación laboral">
                        <EmployeeStatusBadge status={item.status} />
                      </td>
                      <td>
                        <button type="button" className={styles.smallButton} aria-label={`Abrir ficha de ${item.fullName}`} onClick={() => open(item.id)}>
                          Abrir ficha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.hasMore && (
              <button type="button" className={styles.secondaryButton} onClick={() => void list.loadMore()} disabled={list.loadingMore}>
                {list.loadingMore ? 'Cargando…' : 'Cargar más'}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export function EmployeesListScreen() {
  const { can } = useHrPermissions();
  if (!can('VIEW_EMPLOYEES')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Personal" />
        <div className={styles.content}>
          <p className={styles.statusText} role="alert">
            No tienes acceso a la información del personal.
          </p>
          {can('REQUEST_FIELD_TRIP') && (
            <p>
              <Link className={styles.smallButton} to="/personal/salida-a-campo">
                Solicitar mi salida a campo
              </Link>
            </p>
          )}
        </div>
      </main>
    );
  }
  return <EmployeesList />;
}
