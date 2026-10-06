import { useNavigate } from 'react-router-dom';
import { useReturnsList } from './useReturnsList';
import { RETURN_STATUS_LABELS, returnPathForStatus, type ReturnStatus } from './return-status';
import { ActiveRentalsPanel } from './ActiveRentalsPanel';
import { useReturnPermissions } from './return-permissions';
import { AppHeader } from '../shared/AppHeader';
import styles from './ReturnsListScreen.module.css';

const FILTER_OPTIONS: { value: ReturnStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PROGRAMADA', label: 'Programada' },
  { value: 'RECEPCION_PROVISIONAL', label: 'Recepción' },
  { value: 'INSPECCION', label: 'En inspección' },
  { value: 'SIN_DANOS', label: 'Sin daños' },
  { value: 'CON_DANOS', label: 'Con daños' },
  { value: 'CIERRE_FINANCIERO', label: 'Financiero' },
  { value: 'CERRADA', label: 'Cerrada' },
];

/**
 * DEV-01 - Bandeja de Devoluciones. Fuente: PANTALLAS-V3-B-DEVOLUCION.md.
 * Tabla (desktop) / tarjetas (movil, via CSS) con Cliente, Vehiculo, Etapa
 * (badge) y Fecha programada; filtros conservados en sesion. El boton
 * "Continuar" retoma el expediente en la pantalla que corresponde a su estado.
 *
 * Prototipo(s) aprobado(s): PROTO-DEV-01-BANDEJA.
 */
export function ReturnsListScreen() {
  const { state, returns, activeRentals, context, reload, statusFilter, setStatusFilter, hasMore, loadingMore, loadMore } =
    useReturnsList();
  const navigate = useNavigate();
  const { can } = useReturnPermissions();

  function openReturn(item: (typeof returns)[number]) {
    navigate(returnPathForStatus(item.id, item.rentalId, item.status), { state: context ?? undefined });
  }

  const rentalIdsWithReturn = new Set(returns.filter((r) => r.status !== 'CANCELADA').map((r) => r.rentalId));

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Devoluciones" />

      <div className={styles.content}>
        <div className={styles.toolbar}>
          <label htmlFor="returns-status-filter">Estado</label>
          <select
            id="returns-status-filter"
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReturnStatus | '')}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando devoluciones…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText} role="alert">
            No pudimos cargar la bandeja de devoluciones. Intenta de nuevo en unos segundos.
          </p>
        )}

        {state === 'EMPTY' && <p className={styles.statusText}>Todavía no hay devoluciones registradas.</p>}

        {state === 'READY' && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Cliente</th>
                    <th scope="col">Vehículo</th>
                    <th scope="col">Etapa</th>
                    <th scope="col">Fecha programada</th>
                    <th scope="col"><span className={styles.srOnly}>Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((item) => (
                    <tr key={item.id} className={styles.row} onClick={() => openReturn(item)}>
                      <td data-label="Cliente">{item.customerName ?? '—'}</td>
                      <td data-label="Vehículo">{item.vehiclePlate ?? '—'}</td>
                      <td data-label="Etapa">
                        <span className={`${styles.badge} ${styles[`badge_${item.status}`] ?? ''}`}>
                          {RETURN_STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td data-label="Fecha programada">{new Date(item.scheduledAt).toLocaleString('es-PE')}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.continueButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            openReturn(item);
                          }}
                        >
                          {item.status === 'CERRADA' || item.status === 'CANCELADA' ? 'Ver expediente' : 'Continuar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <button type="button" className={styles.loadMore} onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? 'Cargando…' : 'Cargar más'}
              </button>
            )}
          </>
        )}

        <ActiveRentalsPanel
          rentals={activeRentals}
          context={context}
          canCreate={can('CREATE')}
          canReceive={can('RECEIVE_PROVISIONAL')}
          rentalIdsWithReturn={rentalIdsWithReturn}
          onScheduled={() => void reload()}
        />
      </div>
    </main>
  );
}
