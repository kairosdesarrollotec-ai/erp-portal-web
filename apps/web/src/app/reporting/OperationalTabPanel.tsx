import styles from './ReportsDashboardScreen.module.css';

interface DailyRental { date: string; count: number }
interface ActivityEvent { entityCode: string; eventType: string; occurredAt: string }

interface OperationalKpis {
  activeRentals: number;
  pendingReturns: number;
  availableVehicles: number;
  activeReservations: number;
  openIncidents: number;
  fleetOccupancyRate: number;
  dailyRentals?: DailyRental[];
  recentActivity?: ActivityEvent[];
}

interface Props {
  canOperational: boolean;
  isPending: boolean;
  isError: boolean;
  opKpis: OperationalKpis | undefined;
}

function eventTypeIcon(eventType: string): { bg: string } {
  const lower = eventType.toLowerCase();
  if (lower.includes('alquiler') || lower.includes('rental')) return { bg: styles.activityAvatarGreen };
  if (lower.includes('devolucion') || lower.includes('return')) return { bg: styles.activityAvatarOrange };
  return { bg: styles.activityAvatarBlue };
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs} h`;
    return `Hace ${Math.floor(hrs / 24)} días`;
  } catch {
    return '';
  }
}

export function OperationalTabPanel({ canOperational, isPending, isError, opKpis }: Props) {
  if (!canOperational) {
    return (
      <div className={styles.accessDenied} role="status">
        <p className={styles.accessDeniedTitle}>Sin acceso al reporte operativo</p>
        <p className={styles.accessDeniedBody}>
          Necesitas el permiso REPORT.READ_OPERATIONAL para ver esta información.
        </p>
      </div>
    );
  }

  if (isPending) return <p className={styles.statusText} aria-live="polite">Cargando KPIs operativos…</p>;
  if (isError) return <p className={styles.statusText} role="alert">No pudimos cargar los KPIs operativos. Intenta ajustar el rango de fechas.</p>;
  if (!opKpis) return null;

  const dailyRentals = opKpis.dailyRentals ?? [];
  const maxCount = dailyRentals.reduce((m, d) => Math.max(m, d.count), 1);
  const recentActivity = opKpis.recentActivity ?? [];

  const totalFleet = opKpis.activeRentals + opKpis.pendingReturns + opKpis.availableVehicles;
  const rentedPct = totalFleet > 0 ? Math.round((opKpis.activeRentals / totalFleet) * 100) : 0;
  const returnPct = totalFleet > 0 ? Math.round((opKpis.pendingReturns / totalFleet) * 100) : 0;
  const availPct = 100 - rentedPct - returnPct;

  return (
    <>
      <div className={styles.kpiGrid} aria-label="KPIs operativos">
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHead}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconBlue}`} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3m-4 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" /></svg>
            </span>
            <span className={styles.kpiLabel}>Alquileres activos</span>
          </div>
          <p className={styles.kpiValue}>{opKpis.activeRentals}</p>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHead}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconOrange}`} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /><circle cx="17" cy="19" r="1.5" /></svg>
            </span>
            <span className={styles.kpiLabel}>Devoluciones pendientes</span>
          </div>
          <p className={`${styles.kpiValue} ${styles.kpiValueOrange}`}>{opKpis.pendingReturns}</p>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHead}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconGreen}`} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L17 10l-2.5-4.5c-.3-.5-.8-.8-1.4-.8H7c-.6 0-1.1.3-1.4.8L3 10H2c-.6 0-1 .4-1 1v5c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2.5" /><circle cx="17" cy="17" r="2.5" /></svg>
            </span>
            <span className={styles.kpiLabel}>Flota disponible</span>
          </div>
          <p className={`${styles.kpiValue} ${styles.kpiValueGreen}`}>{opKpis.availableVehicles}</p>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHead}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconPurple}`} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="m9 16 2 2 4-4" /></svg>
            </span>
            <span className={styles.kpiLabel}>Reservas activas</span>
          </div>
          <p className={styles.kpiValue}>{opKpis.activeReservations}</p>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHead}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconRed}`} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </span>
            <span className={styles.kpiLabel}>Incidencias abiertas</span>
          </div>
          <p className={`${styles.kpiValue} ${styles.kpiValueRed}`}>{opKpis.openIncidents}</p>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Alquileres diarios</h2>
          {dailyRentals.length > 0 ? (
            <>
              <div className={styles.barChart} aria-label="Gráfico de alquileres diarios" role="img">
                {dailyRentals.map((d, i) => {
                  const isLast = i === dailyRentals.length - 1;
                  const heightPct = maxCount > 0 ? Math.max(5, Math.round((d.count / maxCount) * 100)) : 5;
                  return (
                    <div
                      key={d.date}
                      className={`${styles.barCol} ${isLast ? styles.barColActive : ''}`}
                      style={{ height: `${heightPct}%` }}
                      title={`${d.date}: ${d.count} alquiler${d.count !== 1 ? 'es' : ''}`}
                    />
                  );
                })}
              </div>
              <div className={styles.barLabels} aria-hidden="true">
                {dailyRentals.map((d) => <span key={d.date}>{d.date.slice(5)}</span>)}
              </div>
              <p className={styles.barSummary}>
                Hoy: <strong className={styles.barSummaryValue}>{dailyRentals[dailyRentals.length - 1]?.count ?? 0}</strong> alquileres
              </p>
            </>
          ) : (
            <p className={styles.statusText}>Sin datos de alquileres diarios en el período.</p>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitleRow}>
            <h2 className={styles.chartTitle} style={{ margin: 0 }}>Utilización de flota</h2>
            {totalFleet > 0 && <span className={styles.chartTitleSub}>{totalFleet} vehículos totales</span>}
          </div>
          <div
            className={styles.occupancyBar}
            role="img"
            aria-label={`Flota: ${rentedPct}% alquilados, ${returnPct}% en devolución, ${availPct}% disponibles`}
          >
            <div className={styles.occupancySegment} style={{ width: `${rentedPct}%`, background: 'var(--color-ink)' }} title={`Alquilados: ${opKpis.activeRentals}`} />
            <div className={styles.occupancySegment} style={{ width: `${returnPct}%`, background: 'var(--color-accent)' }} title={`En devolución: ${opKpis.pendingReturns}`} />
            <div className={styles.occupancySegment} style={{ width: `${availPct}%`, background: 'var(--color-surface-border)' }} title={`Disponibles: ${opKpis.availableVehicles}`} />
          </div>
          <div className={styles.occupancyLegend} aria-hidden="true">
            <span className={styles.legendDot}><span className={styles.legendSwatch} style={{ background: 'var(--color-ink)' }} />Alquilados ({opKpis.activeRentals})</span>
            <span className={styles.legendDot}><span className={styles.legendSwatch} style={{ background: 'var(--color-accent)' }} />En devolución ({opKpis.pendingReturns})</span>
            <span className={styles.legendDot}><span className={styles.legendSwatch} style={{ background: 'var(--color-surface-border)' }} />Disponibles ({opKpis.availableVehicles})</span>
          </div>
          <div className={styles.occupancyRate}>
            <p className={styles.occupancyRateLabel}>Tasa de utilización</p>
            <p className={styles.occupancyRateValue}>{Math.round(opKpis.fleetOccupancyRate * 100)}%</p>
          </div>
        </div>
      </div>

      {recentActivity.length > 0 && (
        <div className={styles.activityCard}>
          <div className={styles.chartTitleRow}>
            <h2 className={styles.chartTitle} style={{ margin: 0 }}>Actividad reciente</h2>
            <span className={styles.chartTitleSub}>Últimos {recentActivity.length} eventos</span>
          </div>
          <ul className={styles.activityList} aria-label="Feed de actividad reciente">
            {recentActivity.map((event, i) => {
              const icon = eventTypeIcon(event.eventType);
              return (
                <li key={`${event.entityCode}-${i}`} className={styles.activityItem}>
                  <span className={`${styles.activityAvatar} ${icon.bg}`} aria-hidden="true">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>
                  </span>
                  <div>
                    <p className={styles.activityText}>
                      <strong className={styles.activityCode}>{event.entityCode}</strong>{' '}— {event.eventType}
                    </p>
                    <p className={styles.activityTime}>{timeAgo(event.occurredAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
