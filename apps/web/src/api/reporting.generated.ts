/**
 * Types generated manually from OpenAPI reporting.yaml v0.4.0 (dateFrom/dateTo inclusivos en America/Lima; errores 400 {statusCode, code, detail}).
 * Source: apps/erp-monolithic-api/packages/contracts/openapi/reporting.yaml
 * REP-01 — BDD-REP-001 / SDD-REP-001 / TDD-REP-001.
 */

export interface paths {
  '/reporting/operational': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** KPIs operativos en tiempo real (REP-01) — requiere REPORT.READ_OPERATIONAL */
    get: operations['getOperationalKpis'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/reporting/financial': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** KPIs financieros del período (REP-01) — requiere REPORT.READ_FINANCIAL */
    get: operations['getFinancialKpis'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/reporting/export': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Exportar datos del período en CSV (REP-01) — requiere REPORT.EXPORT */
    get: operations['exportReport'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}

export interface operations {
  getOperationalKpis: {
    parameters: {
      query: {
        companyId: string;
        branchId?: string;
        dateFrom?: string;
        dateTo?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: Record<string, never>;
        content: {
          'application/json': components['schemas']['OperationalKpisResponse'];
        };
      };
      400: {
        headers: Record<string, never>;
        content: {
          'application/json': components['schemas']['ReportingError'];
        };
      };
      401: { headers: Record<string, never>; content?: never };
      403: { headers: Record<string, never>; content?: never };
      500: { headers: Record<string, never>; content?: never };
    };
  };
  getFinancialKpis: {
    parameters: {
      query: {
        companyId: string;
        branchId?: string;
        dateFrom: string;
        dateTo: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: Record<string, never>;
        content: {
          'application/json': components['schemas']['FinancialKpisResponse'];
        };
      };
      400: {
        headers: Record<string, never>;
        content: {
          'application/json': components['schemas']['ReportingError'];
        };
      };
      401: { headers: Record<string, never>; content?: never };
      403: { headers: Record<string, never>; content?: never };
      500: { headers: Record<string, never>; content?: never };
    };
  };
  exportReport: {
    parameters: {
      query: {
        companyId: string;
        branchId?: string;
        dateFrom: string;
        dateTo: string;
        type?: 'operational' | 'financial' | 'combined';
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          'Content-Disposition'?: string;
        };
        content: {
          'text/csv': string;
        };
      };
      400: {
        headers: Record<string, never>;
        content: {
          'application/json': components['schemas']['ReportingError'];
        };
      };
      401: { headers: Record<string, never>; content?: never };
      403: { headers: Record<string, never>; content?: never };
      500: { headers: Record<string, never>; content?: never };
    };
  };
}

export interface components {
  schemas: {
    ReportingError: {
      statusCode: number;
      code: 'INVALID_DATE' | 'INVALID_DATE_RANGE' | 'RANGE_EXCEEDS_MAX';
      detail: string;
    };
    OperationalKpisResponse: {
      companyId: string;
      branchId?: string | null;
      dateFrom: string;
      dateTo: string;
      kpis: {
        activeRentals: number;
        activeReservations: number;
        pendingReturns: number;
        availableVehicles: number;
        openIncidents: number;
        fleetOccupancyRate: number;
        dailyRentals?: Array<{
          date: string;
          count: number;
        }>;
        recentActivity?: Array<{
          eventType: string;
          entityCode: string;
          occurredAt: string;
        }>;
      };
      generatedAt: string;
    };
    FinancialKpisResponse: {
      companyId: string;
      branchId?: string | null;
      dateFrom: string;
      dateTo: string;
      kpis: {
        rentalRevenue: number;
        depositsHeld: number;
        depositsReturned: number;
        depositsRetained: number;
        depositsPartiallyRetained: number;
        netDepositsRetained: number;
      };
      generatedAt: string;
    };
  };
}
