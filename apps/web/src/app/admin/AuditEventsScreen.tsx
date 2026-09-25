import { useState } from 'react';
import { useAuditEvents } from './useAuditEvents';
import styles from './AuditEventsScreen.module.css';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  admin_user_assignment: 'Usuarios y asignaciones',
  reservation: 'Reservas',
  inquiry: 'Consultas',
  work_context: 'Selección de contexto',
  auth: 'Autenticación',
};

function formatChanges(changes: Record<string, unknown> | null): string {
  if (!changes) return '—';
  try {
    return JSON.stringify(changes);
  } catch {
    return '—';
  }
}

/**
 * ADM-04 - Auditoría administrativa. Fuente: PANTALLAS-V2-B-SOPORTE.md.
 * Solo lectura (contrato punto 7: "Ninguna de escritura") - sin botones
 * de editar/eliminar en ninguna fila (criterio de aceptación punto 14).
 * Estados READY, LOADING, EMPTY (contrato punto 9).
 *
 * Alcance real: el contrato UX pide columnas "Campo modificado / Valor
 * anterior / Valor nuevo", pero audit-events-client.ts expone `changes`
 * tal cual lo guarda el backend (un JSON libre, no un diff
 * estructurado) - la columna "Detalle" muestra ese valor real en vez de
 * simular columnas que la data de hoy no puede llenar honestamente.
 */
export function AuditEventsScreen() {
  const { state, events, filter, applyFilter } = useAuditEvents();
  const [entityType, setEntityType] = useState(filter.entityType ?? '');
  const [dateFrom, setDateFrom] = useState(filter.dateFrom?.slice(0, 10) ?? '');
  const [dateTo, setDateTo] = useState(filter.dateTo?.slice(0, 10) ?? '');

  function handleApplyFilter() {
    applyFilter({
      entityType: entityType || undefined,
      dateFrom: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
      dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
    });
  }

  function handleClearFilter() {
    setEntityType('');
    setDateFrom('');
    setDateTo('');
    applyFilter({});
  }

  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.brand}>VeloxRent</span>
        <h1 className={styles.title}>Auditoría administrativa</h1>
      </header>

      <div className={styles.content}>
        <section className={styles.filters}>
          <label className={styles.field}>
            <span>Tipo de cambio</span>
            <select className={styles.input} value={entityType} onChange={(event) => setEntityType(event.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Desde</span>
            <input
              className={styles.input}
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Hasta</span>
            <input className={styles.input} type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
          <div className={styles.filterActions}>
            <button type="button" className={styles.primaryButton} onClick={handleApplyFilter}>
              Filtrar
            </button>
            <button type="button" className={styles.linkButton} onClick={handleClearFilter}>
              Limpiar
            </button>
          </div>
        </section>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando historial…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>No pudimos cargar el historial de auditoría. Intenta de nuevo en unos segundos.</p>
        )}

        {state === 'EMPTY' && <p className={styles.statusText}>No hay eventos que coincidan con este filtro.</p>}

        {state === 'READY' && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Actor</th>
                <th>Fecha/hora</th>
                <th>Tipo</th>
                <th>Acción</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className={styles.row}>
                  <td>{event.actorEmail ?? event.actorFirebaseUid ?? 'Sistema'}</td>
                  <td>{new Date(event.createdAt).toLocaleString('es-PE')}</td>
                  <td>{ENTITY_TYPE_LABELS[event.entityType] ?? event.entityType}</td>
                  <td>{event.action}</td>
                  <td className={styles.detailCell}>{formatChanges(event.changes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
