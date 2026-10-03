import { adminApiClient } from '../../api/admin-api-client';
import type { components } from '../../api/admin.generated';

export interface ReservationDepositPolicyItem {
  version: number;
  amount: string;
  currency: string;
  effectiveFrom: string | null;
}

export interface ReservationDepositPolicy {
  current: ReservationDepositPolicyItem;
  history: ReservationDepositPolicyItem[];
}

export class ParameterCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }
}

/** ADM-03 - monto de reserva vigente + historial (GET .../reservation-deposit-policy). */
export async function getReservationDepositPolicy(
  idToken: string,
  companyId: string,
  branchId: string,
): Promise<ReservationDepositPolicy> {
  const { data, error, response } = await adminApiClient.GET('/admin/parameters/reservation-deposit-policy', {
    params: { query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new Error(`No se pudo obtener el monto de reserva (${response.status})`);
  }
  return data as unknown as ReservationDepositPolicy;
}

/** ADM-03 - "Guardar cambios" (POST .../reservation-deposit-policy). Inserta una version nueva, nunca edita la vigente. */
export async function updateReservationDepositPolicy(
  idToken: string,
  companyId: string,
  branchId: string,
  amount: string,
  currency: string,
): Promise<ReservationDepositPolicyItem> {
  const { data, error, response } = await adminApiClient.POST('/admin/parameters/reservation-deposit-policy', {
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId, amount, currency } as unknown as components['schemas']['UpdateReservationDepositPolicyRequest'],
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new ParameterCommandError(response.status, problem);
  }
  return data as unknown as ReservationDepositPolicyItem;
}
