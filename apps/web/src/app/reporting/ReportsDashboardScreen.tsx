/**
 * REP-01 — Dashboard de Reportes Operativos y Financieros.
 *
 * Baseline visual: PROTO-REP-01-DASHBOARD-OPERATIVO-DESKTOP (APPROVED 2026-10-11).
 * Fuentes: BDD-REP-001, SDD-REP-001, TDD-REP-001, reporting.yaml v0.3.0 (dateFrom/dateTo inclusivos, America/Lima).
 * Permisos: REPORT.READ_OPERATIONAL (tab Operativo), REPORT.READ_FINANCIAL (tab Financiero),
 *           REPORT.EXPORT (botón Exportar CSV).
 *
 * Financiero tab: visual derivado del lenguaje aprobado en PROTO-REP-01 (mismas KPI cards).
 * Riesgo: no existe PROTO-ID exclusivo para el estado del tab Financiero en READY.
 * Requiere aprobación visual de PRODUCTO antes de release.
 */
import { useState } from 'react';
import { Download } from 'lucide-react';
import { AppHeader } from '../shared/AppHeader';
import { usePermissions } from '../shared/usePermissions';
import { useWorkContextForIncidents } from '../incidents/useWorkContextForIncidents';
import { useOperationalKpis, useFinancialKpis, useExportReport } from './hooks/useReporting';
import { OperationalTabPanel } from './OperationalTabPanel';
import { FinancialTabPanel } from './FinancialTabPanel';
import styles from './ReportsDashboardScreen.module.css';
import { addDaysToDateOnly, limaToday } from '../shared/lima-time';
import { formatPeriodLabel, validateReportRange } from './reporting-range';
import { reportingDateErrorMessage } from './reporting-errors';

type Tab = 'operativo' | 'financiero';

function todayStr(): string {
  return limaToday();
}

function defaultDateFrom(): string {
  return addDaysToDateOnly(limaToday(), -30) ?? limaToday();
}

export function ReportsDashboardScreen() {
  const { can } = usePermissions();
  const { context, loading: contextLoading } = useWorkContextForIncidents();

  const [activeTab, setActiveTab] = useState<Tab>('operativo');
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(todayStr);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const canOperational = can('REPORT', 'READ_OPERATIONAL');
  const canFinancial = can('REPORT', 'READ_FINANCIAL');
  const canExport = can('REPORT', 'EXPORT');
  const hasAnyPermission = canOperational || canFinancial;

  function handleDateChange(field: 'from' | 'to', value: string) {
    const nextFrom = field === 'from' ? value : dateFrom;
    const nextTo = field === 'to' ? value : dateTo;
    if (field === 'from') setDateFrom(value);
    else setDateTo(value);
    setRangeError(validateReportRange(nextFrom, nextTo));
  }

  const rangeValid = !rangeError && !!dateFrom && !!dateTo;

  const operationalParams = contextLoading || !context || !rangeValid || !canOperational
    ? null
    : { companyId: context.companyId, branchId: context.branchId, dateFrom, dateTo };

  const financialParams = contextLoading || !context || !rangeValid || !canFinancial
    ? null
    : { companyId: context.companyId, branchId: context.branchId, dateFrom, dateTo };

  const operationalQuery = useOperationalKpis(operationalParams);
  const financialQuery = useFinancialKpis(financialParams);
  const exportMutation = useExportReport();

  function handleExport() {
    if (!context || !rangeValid || exportMutation.isPending) return;
    exportMutation.mutate({
      companyId: context.companyId,
      branchId: context.branchId,
      dateFrom,
      dateTo,
      type: 'combined',
    });
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Reportes" />

      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Reportes</h2>
            {context && (
              <p className={styles.pageSubtitle}>
                {context.companyName} · {context.branchName}
              </p>
            )}
          </div>

          <div className={styles.headerActions}>
            <div className={styles.tabBar} role="tablist" aria-label="Tipo de reporte">
              <button
                type="button"
                id="tab-operativo"
                role="tab"
                aria-selected={activeTab === 'operativo'}
                aria-controls="panel-operativo"
                className={`${styles.tab} ${activeTab === 'operativo' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('operativo')}
              >
                Operativo
              </button>
              <button
                type="button"
                id="tab-financiero"
                role="tab"
                aria-selected={activeTab === 'financiero'}
                aria-controls="panel-financiero"
                className={`${styles.tab} ${activeTab === 'financiero' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('financiero')}
              >
                Financiero
              </button>
            </div>

            {canExport && (
              <button
                type="button"
                className={styles.exportButton}
                onClick={handleExport}
                disabled={!rangeValid || exportMutation.isPending || !context}
                aria-label="Exportar datos como CSV"
              >
                <Download size={13} className={styles.exportIcon} aria-hidden="true" />
                {exportMutation.isPending ? 'Exportando…' : 'Exportar CSV'}
              </button>
            )}
          </div>
        </div>

        {!contextLoading && !hasAnyPermission && (
          <div className={styles.accessDenied} role="alert" aria-live="polite">
            <p className={styles.accessDeniedTitle}>Acceso restringido</p>
            <p className={styles.accessDeniedBody}>
              No tienes permiso para consultar reportes. Contacta al administrador del sistema.
            </p>
          </div>
        )}

        {hasAnyPermission && (
          <>
            <div className={styles.dateFilters} role="group" aria-label="Rango de fechas">
              <div className={styles.dateField}>
                <label className={styles.dateLabel} htmlFor="rep-date-from">Desde</label>
                <input
                  id="rep-date-from"
                  type="date"
                  className={styles.dateInput}
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => handleDateChange('from', e.target.value)}
                />
              </div>
              <div className={styles.dateField}>
                <label className={styles.dateLabel} htmlFor="rep-date-to">Hasta</label>
                <input
                  id="rep-date-to"
                  type="date"
                  className={styles.dateInput}
                  value={dateTo}
                  min={dateFrom}
                  max={todayStr()}
                  onChange={(e) => handleDateChange('to', e.target.value)}
                />
              </div>
            </div>

            {rangeError && (
              <p className={styles.dateError} role="alert">{rangeError}</p>
            )}

            {rangeValid && (
              <p className={styles.periodHint}>
                Período: {formatPeriodLabel(dateFrom, dateTo)} · ambos días incluidos (hora de Lima)
              </p>
            )}

            {exportMutation.isError && (
              <p className={styles.dateError} role="alert">
                {reportingDateErrorMessage(exportMutation.error) ?? 'No pudimos exportar el reporte. Inténtalo de nuevo.'}
              </p>
            )}

            <div id="panel-operativo" role="tabpanel" aria-labelledby="tab-operativo" hidden={activeTab !== 'operativo'}>
              <OperationalTabPanel
                canOperational={canOperational}
                isPending={operationalQuery.isPending}
                isError={operationalQuery.isError}
                errorMessage={reportingDateErrorMessage(operationalQuery.error)}
                opKpis={operationalQuery.data?.kpis}
              />
            </div>

            <div id="panel-financiero" role="tabpanel" aria-labelledby="tab-financiero" hidden={activeTab !== 'financiero'}>
              <FinancialTabPanel
                canFinancial={canFinancial}
                isPending={financialQuery.isPending}
                isError={financialQuery.isError}
                errorMessage={reportingDateErrorMessage(financialQuery.error)}
                finKpis={financialQuery.data?.kpis}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
