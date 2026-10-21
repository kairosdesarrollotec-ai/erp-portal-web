import styles from './ReportsDashboardScreen.module.css';

interface FinancialKpis {
  rentalRevenue: number;
  depositsHeld: number;
  depositsReturned: number;
  depositsRetained: number;
  depositsPartiallyRetained: number;
  netDepositsRetained: number;
}

interface Props {
  canFinancial: boolean;
  isPending: boolean;
  isError: boolean;
  /** Mensaje específico (p. ej. error de fechas del backend); si falta se usa el texto genérico. */
  errorMessage?: string | null;
  finKpis: FinancialKpis | undefined;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(value);
}

export function FinancialTabPanel({ canFinancial, isPending, isError, errorMessage, finKpis }: Props) {
  if (!canFinancial) {
    return (
      <div className={styles.accessDenied} role="status">
        <p className={styles.accessDeniedTitle}>Sin acceso al reporte financiero</p>
        <p className={styles.accessDeniedBody}>
          Necesitas el permiso REPORT.READ_FINANCIAL para ver esta información.
        </p>
      </div>
    );
  }

  if (isPending) return <p className={styles.statusText} aria-live="polite">Cargando KPIs financieros…</p>;
  if (isError) return <p className={styles.statusText} role="alert">{errorMessage ?? 'No pudimos cargar los KPIs financieros. Intenta ajustar el rango de fechas.'}</p>;
  if (!finKpis) return null;

  return (
    <div className={styles.financialGrid} aria-label="KPIs financieros">
      <div className={styles.kpiCard}>
        <div className={styles.kpiCardHead}>
          <span className={`${styles.kpiIcon} ${styles.kpiIconGreen}`} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </span>
          <span className={styles.kpiLabel}>Ingresos del período</span>
        </div>
        <p className={`${styles.kpiValue} ${styles.kpiValueGreen}`} style={{ fontSize: '1.375rem' }}>{formatMoney(finKpis.rentalRevenue)}</p>
      </div>

      <div className={styles.kpiCard}>
        <div className={styles.kpiCardHead}>
          <span className={`${styles.kpiIcon} ${styles.kpiIconBlue}`} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
          </span>
          <span className={styles.kpiLabel}>Garantías en custodia</span>
        </div>
        <p className={styles.financialValue}>{formatMoney(finKpis.depositsHeld)}</p>
      </div>

      <div className={styles.kpiCard}>
        <div className={styles.kpiCardHead}>
          <span className={`${styles.kpiIcon} ${styles.kpiIconTeal}`} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
          </span>
          <span className={styles.kpiLabel}>Garantías devueltas</span>
        </div>
        <p className={styles.financialValue}>{formatMoney(finKpis.depositsReturned)}</p>
      </div>

      <div className={styles.kpiCard}>
        <div className={styles.kpiCardHead}>
          <span className={`${styles.kpiIcon} ${styles.kpiIconRed}`} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </span>
          <span className={styles.kpiLabel}>Garantías retenidas</span>
        </div>
        <p className={styles.financialValue}>{formatMoney(finKpis.depositsRetained)}</p>
      </div>

      <div className={styles.kpiCard}>
        <div className={styles.kpiCardHead}>
          <span className={`${styles.kpiIcon} ${styles.kpiIconAmber}`} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </span>
          <span className={styles.kpiLabel}>Parcialmente retenidas</span>
        </div>
        <p className={styles.financialValue}>{formatMoney(finKpis.depositsPartiallyRetained)}</p>
      </div>

      <div className={styles.kpiCard}>
        <div className={styles.kpiCardHead}>
          <span className={`${styles.kpiIcon} ${styles.kpiIconOrange}`} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          </span>
          <span className={styles.kpiLabel}>Neto retenido</span>
        </div>
        <p className={`${styles.financialValue} ${styles.kpiValueOrange}`}>{formatMoney(finKpis.netDepositsRetained)}</p>
      </div>
    </div>
  );
}
