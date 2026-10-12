import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { getFirebaseAuth } from '../providers/firebase';
import { useWorkContextForPayments } from './useWorkContextForPayments';
import { usePaymentPermissions } from './payment-permissions';
import {
  DEPOSIT_STATUSES,
  DEPOSIT_STATUS_LABELS,
  formatCurrency,
  type DepositStatus,
} from './payment-domain';
import { getDepositsSummary, listDeposits, type DepositsSummary, type DepositSummary } from './payments-client';
import { DepositStatusBadge } from './DepositBadges';
import styles from './DepositsListScreen.module.css';

/**
 * PAG-01 — Bandeja de Garantías de Alquiler.
 * Fuente: BDD-PAG-001, SDD-PAG-001, payments.yaml v0.1.0, UX/UI §PAG-01.
 * Baseline visual: PROTO-PAG-01-BANDEJA-GARANTIAS-DESKTOP (APPROVED 2026-10-11).
 * Tabla desktop / tarjetas mobile (via CSS).
 * Resumen de tarjetas de estado derivado de los depósitos cargados (no endpoint dedicado).
 */

type ListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

const PAGE_SIZE = 20;
const FILTER_KEY = 'kairos.pagos.garantias.filtros';

interface Filters {
  status: DepositStatus | '';
}
const EMPTY_FILTERS: Filters = { status: '' };

function loadFilters(): Filters {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY);
    return raw ? { ...EMPTY_FILTERS, ...(JSON.parse(raw) as Partial<Filters>) } : EMPTY_FILTERS;
  } catch {
    return EMPTY_FILTERS;
  }
}

function saveFilters(f: Filters): void {
  try {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(f));
  } catch {
    // sessionStorage puede no estar disponible
  }
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function DepositsListScreen() {
  const { context, loading: contextLoading } = useWorkContextForPayments();
  const navigate = useNavigate();
  usePaymentPermissions(); // permisos listos; acciones futuras en PAG-01 requieren PAYMENT.READ_LIST

  const [listState, setListState] = useState<ListState>('LOADING');
  const [deposits, setDeposits] = useState<DepositSummary[]>([]);
  const [serverSummary, setServerSummary] = useState<DepositsSummary | null>(null);
  const [filters, setFiltersState] = useState<Filters>(loadFilters);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFiltersState((prev) => {
      const next = { ...prev, [key]: value };
      saveFilters(next);
      return next;
    });
  }, []);

  const reload = useCallback(async () => {
    if (!context) return;
    setListState('LOADING');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setListState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const [result, summary] = await Promise.all([
        listDeposits(idToken, context.companyId, context.branchId, {
          status: filters.status || undefined,
          limit: PAGE_SIZE,
        }),
        getDepositsSummary(idToken, context.companyId, context.branchId),
      ]);
      setDeposits(result.data);
      setServerSummary(summary);
      setHasMore(result.hasMore);
      setListState(result.data.length === 0 ? 'EMPTY' : 'READY');
    } catch {
      setListState('RECOVERABLE_ERROR');
    }
  }, [context, filters]);

  const loadMore = useCallback(async () => {
    if (!context || deposits.length === 0) return;
    const last = deposits[deposits.length - 1];
    setLoadingMore(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const result = await listDeposits(idToken, context.companyId, context.branchId, {
        status: filters.status || undefined,
        limit: PAGE_SIZE,
        cursor: { createdAt: last.createdAt, id: last.id },
      });
      setDeposits((prev) => [...prev, ...result.data]);
      setHasMore(result.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [context, deposits, filters]);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setListState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, reload]);


  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Pagos y Garantías" />

      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Pagos y Garantías</h2>
          <p className={styles.pageSubtitle}>Gestión de garantías y resolución financiera de alquileres</p>
        </div>

        {/* Tarjetas de resumen — PROTO-PAG-01-BANDEJA-GARANTIAS-DESKTOP (totales del servidor) */}
        {listState === 'READY' && serverSummary && (
          <div className={styles.summaryGrid} role="region" aria-label="Resumen de garantías">
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>En custodia</p>
              <p className={styles.summaryCount}>{serverSummary.held}</p>
              <p className={styles.summaryAmount}>{formatCurrency(serverSummary.heldAmount)} retenidos</p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Parcialmente retenidas</p>
              <p className={`${styles.summaryCount} ${styles.summaryCountWarning}`}>
                {serverSummary.partiallyRetained}
              </p>
              <p className={styles.summaryAmount}>Con ajustes registrados</p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Devueltas</p>
              <p className={`${styles.summaryCount} ${styles.summaryCountSuccess}`}>
                {serverSummary.returned}
              </p>
              <p className={styles.summaryAmount}>Liberadas al cliente</p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryLabel}>Retenidas definitivas</p>
              <p className={`${styles.summaryCount} ${styles.summaryCountRetained}`}>
                {serverSummary.retained}
              </p>
              <p className={styles.summaryAmount}>{formatCurrency(serverSummary.totalAmount - serverSummary.heldAmount)} total retenido</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className={styles.toolbar}>
          <div className={styles.filters} role="group" aria-label="Filtros de garantías">
            <label className={styles.filter}>
              Estado
              <select
                className={styles.select}
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value as DepositStatus | '')}
              >
                <option value="">Todos los estados</option>
                {DEPOSIT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {DEPOSIT_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Estados */}
        <div aria-live="polite">
          {listState === 'LOADING' && <p className={styles.statusText}>Cargando garantías…</p>}
          {listState === 'RECOVERABLE_ERROR' && (
            <p className={styles.statusText} role="alert">
              No pudimos cargar las garantías. Intenta de nuevo en unos segundos.
            </p>
          )}
          {listState === 'EMPTY' && (
            <p className={styles.statusText}>
              {filters.status
                ? 'Ninguna garantía coincide con el filtro seleccionado.'
                : 'Todavía no hay garantías registradas.'}
            </p>
          )}
        </div>

        {listState === 'READY' && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table} aria-label="Listado de garantías de alquiler">
                <thead>
                  <tr>
                    <th scope="col">Alquiler</th>
                    <th scope="col">Cliente</th>
                    <th scope="col" className={styles.right}>Monto original</th>
                    <th scope="col" className={styles.right}>Saldo neto</th>
                    <th scope="col" className={styles.center}>Estado</th>
                    <th scope="col">Registrado</th>
                    <th scope="col">
                      <span className={styles.srOnly}>Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((dep) => (
                    <tr
                      key={dep.id}
                      className={styles.row}
                      onClick={() => navigate(`/pagos/garantias/${dep.id}`, { state: context ?? undefined })}
                    >
                      <td data-label="Alquiler">
                        <span className={styles.srOnly}>Alquiler: </span>
                        <span className={styles.rentalCode}>{dep.rentalCode}</span>
                      </td>
                      <td data-label="Cliente">
                        <span className={styles.srOnly}>Cliente: </span>
                        {dep.clientName}
                      </td>
                      <td data-label="Monto original" className={styles.right}>
                        <span className={styles.srOnly}>Monto original: </span>
                        {formatCurrency(dep.originalAmount)}
                      </td>
                      <td data-label="Saldo neto" className={styles.right}>
                        <span className={styles.srOnly}>Saldo neto: </span>
                        {formatCurrency(dep.netAmount ?? dep.originalAmount)}
                      </td>
                      <td data-label="Estado" className={styles.center}>
                        <span className={styles.srOnly}>Estado: </span>
                        <DepositStatusBadge status={dep.currentStatus} />
                      </td>
                      <td data-label="Registrado" className={styles.dateCell}>
                        <span className={styles.srOnly}>Registrado: </span>
                        {formatDate(dep.createdAt)}
                      </td>
                      <td className={styles.actions}>
                        <button
                          type="button"
                          className={styles.openButton}
                          aria-label={`Ver detalle de garantía ${dep.rentalCode}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/pagos/garantias/${dep.id}`, { state: context ?? undefined });
                          }}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <button
                type="button"
                className={styles.loadMore}
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? 'Cargando…' : 'Cargar más'}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
