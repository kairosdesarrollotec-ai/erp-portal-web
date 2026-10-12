import { paymentsApiClient } from '../../api/payments-api-client';
import type { components } from '../../api/payments.generated';

// Tipos del contrato (payments.yaml v0.1.0)
export type DepositSummary = components['schemas']['DepositSummary'];
export type DepositDetail = components['schemas']['DepositDetail'];
export type AdjustmentResponse = components['schemas']['AdjustmentResponse'];
export type DepositStatus = components['schemas']['DepositStatus'];
export type AdjustmentType = components['schemas']['AdjustmentType'];
export type DepositsSummary = components['schemas']['DepositsSummary'];

type RegisterAdjustmentBody = components['schemas']['RegisterAdjustmentRequest'];
type ApproveRefundBody = components['schemas']['ApproveRefundRequest'];
type CloseFinancialBody = components['schemas']['CloseFinancialRequest'];

/** Error HTTP de lectura (GET) — mismo patrón que IncidentApiError. */
export class PaymentApiError extends Error {
  readonly name = 'PaymentApiError';
  constructor(public readonly status: number) {
    super(`Error HTTP ${status} al consultar pagos y garantías`);
  }
}

/** Cuerpo problem+json que el backend devuelve en 4xx de comandos. */
export class PaymentCommandError extends Error {
  readonly name = 'PaymentCommandError';
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operación no se pudo completar (${status})`);
  }
}

const authHeaders = (idToken: string) => ({ Authorization: `Bearer ${idToken}` });

function toCommandError(error: unknown, status: number): PaymentCommandError {
  const problem = (error as { code?: string; detail?: string } | null | undefined) ?? null;
  return new PaymentCommandError(status, problem && typeof problem === 'object' ? problem : null);
}

export interface ListDepositsOptions {
  status?: DepositStatus;
  rentalId?: string;
  limit?: number;
  cursor?: { createdAt: string; id: string };
}

/** PAG-01 — resumen agregado por estado para tarjetas (GET /payments/deposits/summary). */
export async function getDepositsSummary(
  idToken: string,
  companyId: string,
  branchId: string,
): Promise<DepositsSummary> {
  const { data, error, response } = await paymentsApiClient.GET('/payments/deposits/summary', {
    params: { query: { companyId, branchId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new PaymentApiError(response.status);
  return data;
}

/** PAG-01 — bandeja de garantías (GET /payments/deposits, paginación keyset). */
export async function listDeposits(
  idToken: string,
  companyId: string,
  branchId: string,
  options: ListDepositsOptions = {},
  signal?: AbortSignal,
): Promise<{ data: DepositSummary[]; hasMore: boolean }> {
  const { data, error, response } = await paymentsApiClient.GET('/payments/deposits', {
    params: {
      query: {
        companyId,
        branchId,
        ...(options.status ? { status: options.status } : {}),
        ...(options.rentalId ? { rentalId: options.rentalId } : {}),
        ...(options.limit !== undefined ? { limit: options.limit } : {}),
        ...(options.cursor
          ? { cursorCreatedAt: options.cursor.createdAt, cursorId: options.cursor.id }
          : {}),
      },
    },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new PaymentApiError(response.status);
  return { data: data.data, hasMore: data.meta.hasMore };
}

/** PAG-02 — detalle con historial de ajustes (GET /payments/deposits/{depositId}). */
export async function getDeposit(
  idToken: string,
  depositId: string,
  companyId: string,
  branchId: string,
): Promise<DepositDetail> {
  const { data, error, response } = await paymentsApiClient.GET('/payments/deposits/{depositId}', {
    params: { path: { depositId }, query: { companyId, branchId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new PaymentApiError(response.status);
  return data;
}

export interface RegisterAdjustmentInput {
  type: AdjustmentType;
  amount: number;
  reason: string;
}

/** PAG-02 — registrar ajuste append-only (POST /payments/deposits/{depositId}/adjustments). */
export async function registerAdjustment(
  idToken: string,
  depositId: string,
  companyId: string,
  branchId: string,
  input: RegisterAdjustmentInput,
): Promise<AdjustmentResponse> {
  const body: RegisterAdjustmentBody = {
    companyId,
    branchId,
    type: input.type,
    amount: input.amount,
    reason: input.reason,
  };
  const { data, error, response } = await paymentsApiClient.POST(
    '/payments/deposits/{depositId}/adjustments',
    {
      params: { path: { depositId } },
      headers: authHeaders(idToken),
      body,
    },
  );
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** PAG-02 — aprobar devolución (POST /payments/deposits/{depositId}/approve-refund). */
export async function approveRefund(
  idToken: string,
  depositId: string,
  companyId: string,
  branchId: string,
  notes?: string,
): Promise<DepositDetail> {
  const body: ApproveRefundBody = {
    companyId,
    branchId,
    ...(notes ? { notes } : {}),
  };
  const { data, error, response } = await paymentsApiClient.POST(
    '/payments/deposits/{depositId}/approve-refund',
    {
      params: { path: { depositId } },
      headers: authHeaders(idToken),
      body,
    },
  );
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** PAG-02 — cerrar expediente financiero (POST /payments/deposits/{depositId}/close). */
export async function closeFinancial(
  idToken: string,
  depositId: string,
  companyId: string,
  branchId: string,
  retainedAmount: number,
  notes: string,
): Promise<DepositDetail> {
  const body: CloseFinancialBody = {
    companyId,
    branchId,
    retainedAmount,
    notes,
  };
  const { data, error, response } = await paymentsApiClient.POST(
    '/payments/deposits/{depositId}/close',
    {
      params: { path: { depositId } },
      headers: authHeaders(idToken),
      body,
    },
  );
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
