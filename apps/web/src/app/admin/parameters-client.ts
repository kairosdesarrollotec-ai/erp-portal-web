const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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

function authHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
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
  const params = new URLSearchParams({ companyId, branchId });
  const response = await fetch(`${API_BASE_URL}/admin/parameters/reservation-deposit-policy?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener el monto de reserva (${response.status})`);
  }
  return (await response.json()) as ReservationDepositPolicy;
}

/** ADM-03 - "Guardar cambios" (POST .../reservation-deposit-policy). Inserta una version nueva, nunca edita la vigente. */
export async function updateReservationDepositPolicy(
  idToken: string,
  companyId: string,
  branchId: string,
  amount: string,
  currency: string,
): Promise<ReservationDepositPolicyItem> {
  const response = await fetch(`${API_BASE_URL}/admin/parameters/reservation-deposit-policy`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify({ companyId, branchId, amount, currency }),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ParameterCommandError(response.status, problem);
  }
  return (await response.json()) as ReservationDepositPolicyItem;
}
