/**
 * REP-01 — Hooks de datos del módulo Reportes.
 * Fuentes: BDD-REP-001, SDD-REP-001, TDD-REP-001, reporting.yaml v0.4.0.
 * Permisos: REPORT.READ_OPERATIONAL, REPORT.READ_FINANCIAL, REPORT.EXPORT.
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { getFirebaseAuth } from '../../providers/firebase';
import { reportingApiClient } from '../../../api/reporting-api-client';
import type { components } from '../../../api/reporting.generated';
import { toReportingApiError } from '../reporting-errors';

export type OperationalKpisResponse = components['schemas']['OperationalKpisResponse'];
export type FinancialKpisResponse = components['schemas']['FinancialKpisResponse'];

export interface ReportingParams {
  companyId: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface FinancialReportingParams {
  companyId: string;
  branchId?: string;
  dateFrom: string;
  dateTo: string;
}

export interface ExportParams {
  companyId: string;
  branchId?: string;
  dateFrom: string;
  dateTo: string;
  type?: 'operational' | 'financial' | 'combined';
}

async function getIdToken(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sesión no disponible');
  return user.getIdToken();
}

/**
 * REP-01 — KPIs operativos (GET /reporting/operational).
 * Requiere permiso REPORT.READ_OPERATIONAL.
 */
export function useOperationalKpis(params: ReportingParams | null) {
  return useQuery({
    queryKey: ['reporting', 'operational', params] as const,
    queryFn: async (): Promise<OperationalKpisResponse> => {
      if (!params) throw new Error('Params requeridos');
      const idToken = await getIdToken();
      const { data, error, response } = await reportingApiClient.GET('/reporting/operational', {
        params: {
          query: {
            companyId: params.companyId,
            ...(params.branchId ? { branchId: params.branchId } : {}),
            ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
            ...(params.dateTo ? { dateTo: params.dateTo } : {}),
          },
        },
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (error || !data) throw toReportingApiError('Error al cargar KPIs operativos', response.status, error);
      return data;
    },
    enabled: !!params,
    retry: false,
    staleTime: 60_000,
  });
}

/**
 * REP-01 — KPIs financieros (GET /reporting/financial).
 * Requiere permiso REPORT.READ_FINANCIAL.
 */
export function useFinancialKpis(params: FinancialReportingParams | null) {
  return useQuery({
    queryKey: ['reporting', 'financial', params] as const,
    queryFn: async (): Promise<FinancialKpisResponse> => {
      if (!params) throw new Error('Params requeridos');
      const idToken = await getIdToken();
      const { data, error, response } = await reportingApiClient.GET('/reporting/financial', {
        params: {
          query: {
            companyId: params.companyId,
            ...(params.branchId ? { branchId: params.branchId } : {}),
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
          },
        },
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (error || !data) throw toReportingApiError('Error al cargar KPIs financieros', response.status, error);
      return data;
    },
    enabled: !!params,
    retry: false,
    staleTime: 60_000,
  });
}

/**
 * REP-01 — Exportar CSV (GET /reporting/export → text/csv → descarga).
 * Requiere permiso REPORT.EXPORT.
 */
export function useExportReport() {
  return useMutation({
    mutationFn: async (params: ExportParams): Promise<void> => {
      const idToken = await getIdToken();
      const url = new URL(
        '/reporting/export',
        import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
      );
      url.searchParams.set('companyId', params.companyId);
      if (params.branchId) url.searchParams.set('branchId', params.branchId);
      url.searchParams.set('dateFrom', params.dateFrom);
      url.searchParams.set('dateTo', params.dateTo);
      if (params.type) url.searchParams.set('type', params.type);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => undefined);
        throw toReportingApiError('Error al exportar reporte', response.status, body);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const filename =
        response.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1] ??
        `reporte-${params.dateFrom}_${params.dateTo}.csv`;
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    },
  });
}
