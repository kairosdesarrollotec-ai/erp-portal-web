import { Link, useNavigate } from 'react-router-dom';
import { useInquiriesList } from './useInquiriesList';
import { INQUIRY_CHANNEL_LABELS, INQUIRY_STATUS_GROUP, INQUIRY_STATUS_GROUP_LABELS } from './inquiry-status';
import { AppHeader } from '../shared/AppHeader';
import { useRolePermissions } from '../shared/useRolePermissions';
import styles from './InquiriesListScreen.module.css';
import { formatLimaDate } from '../shared/lima-time';

/**
 * CON-01 - Bandeja de Consultas. Fuente: PANTALLAS-V3-B-CONSULTA.md.
 * Estados: READY, LOADING, EMPTY, RECOVERABLE_ERROR, FORBIDDEN (contrato
 * punto 9). Filtros persistentes en sesion (punto 6/15, ver
 * useInquiriesList.ts, con debounce - hallazgo de revision PR#11).
 *
 * Hallazgo de revision PR#11 (finding "filas clicables inaccesibles"):
 * las filas ya no usan `<tr onClick>` - cada fila tiene un `<Link>` real
 * "estirado" con nombre accesible propio, navegable con Tab/Enter (mismo
 * patron que ReservationsListScreen.tsx, PR#10 finding #3).
 */
export function InquiriesListScreen() {
  const { state, inquiries, customerNames, context, filters, setFilters } = useInquiriesList();
  const navigate = useNavigate();
  const { can } = useRolePermissions();

  return (
    <main className={styles.wrapper}>
      <AppHeader
        pageTitle="Consultas"
        actions={
          can('INQUIRY', 'REGISTER') ? (
            <button
              type="button"
              className={styles.newButton}
              onClick={() => navigate('/consultas/nueva', { state: context ?? undefined })}
            >
              Nueva Consulta
            </button>
          ) : undefined
        }
      />

      <div className={styles.content}>
        <div className={styles.filters}>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="Buscar por cliente"
            value={filters.customerId}
            onChange={(event) => setFilters({ ...filters, customerId: event.target.value })}
            aria-label="Filtrar por cliente"
          />
          <select
            className={styles.filterInput}
            value={filters.channel}
            onChange={(event) => setFilters({ ...filters, channel: event.target.value as typeof filters.channel })}
            aria-label="Filtrar por canal"
          >
            <option value="">Todos los canales</option>
            {Object.entries(INQUIRY_CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className={styles.filterInput}
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value as typeof filters.status })}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value="REGISTRADA">Registrada</option>
            <option value="COTIZADA">Cotizada</option>
            <option value="CONVERTIDA">Convertida</option>
            <option value="CERRADA_SIN_CONVERSION">Cerrada sin conversión</option>
          </select>
        </div>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando consultas…</p>}

        {state === 'FORBIDDEN' && (
          <p className={styles.statusText}>No tienes permisos para ver la bandeja de consultas de esta sede.</p>
        )}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>
            No pudimos cargar la bandeja de consultas. Intenta de nuevo en unos segundos.
          </p>
        )}

        {state === 'EMPTY' && <p className={styles.statusText}>Todavía no hay consultas registradas.</p>}

        {state === 'READY' && (
          <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Canal</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Empresa</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => {
                const group = INQUIRY_STATUS_GROUP[inquiry.status];
                const customerName = inquiry.customerId
                  ? customerNames[inquiry.customerId] ?? 'Cargando cliente…'
                  : 'Sin cliente registrado';
                return (
                  <tr key={inquiry.id} className={styles.row}>
                    <td>
                      <Link
                        to={`/consultas/${inquiry.id}`}
                        state={context ?? undefined}
                        className={styles.rowLink}
                        aria-label={`Ver detalle de la consulta de ${customerName}`}
                      />
                      {customerName}
                    </td>
                    <td>{inquiry.channel}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[`badge_${group}`]}`}>
                        {INQUIRY_STATUS_GROUP_LABELS[group]}
                      </span>
                    </td>
                    <td>{formatLimaDate(inquiry.createdAt)}</td>
                    <td>{context?.companyName ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </main>
  );
}
