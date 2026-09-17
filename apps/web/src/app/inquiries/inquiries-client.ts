import type { InquiryStatus } from './inquiry-status';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface InquirySummary {
  id: string;
  status: InquiryStatus;
  channel: string;
  version: number;
  companyId: string;
  branchId?: string;
  customer: { id: string; name: string } | null;
  touristUse: boolean;
  createdAt: string;
}

export interface InquiryQuotation {
  id: string;
  vehicleId: string;
  destination: string;
  estimatedDays: number;
  createdAt: string;
}

export interface InquiryInteraction {
  id: string;
  type: string;
  occurredAt: string;
  note?: string;
}

export interface InquiryDetail extends InquirySummary {
  interactions: InquiryInteraction[];
  quotations: InquiryQuotation[];
}

function authHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
}

/** CON-01 - bandeja de consultas (PANTALLAS-V3-B-CONSULTA.md, GET /inquiries). */
export async function listInquiries(
  idToken: string,
  companyId: string,
  filters?: {
    customerId?: string;
    channel?: string;
    status?: InquiryStatus;
    createdFrom?: string;
    createdTo?: string;
  },
): Promise<InquirySummary[]> {
  const params = new URLSearchParams({ companyId });
  if (filters?.customerId) params.set('customerId', filters.customerId);
  if (filters?.channel) params.set('channel', filters.channel);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.createdFrom) params.set('createdFrom', filters.createdFrom);
  if (filters?.createdTo) params.set('createdTo', filters.createdTo);
  const response = await fetch(`${API_BASE_URL}/inquiries?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener la bandeja de consultas (${response.status})`);
  }
  return (await response.json()) as InquirySummary[];
}

/** CON-04 - detalle de una consulta (incluye interactions/quotations). */
export async function getInquiry(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<InquiryDetail> {
  const params = new URLSearchParams({ companyId, branchId });
  const response = await fetch(`${API_BASE_URL}/inquiries/${id}?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener la consulta (${response.status})`);
  }
  return (await response.json()) as InquiryDetail;
}

/** Cuerpo `problem+json` que el backend devuelve en 409/422 (mismo contrato que reservations-client.ts). */
export class InquiryCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operación no se pudo completar (${status})`);
  }
}

/** CON-02 - crea la Consulta en REGISTRADA. */
export async function createInquiry(
  idToken: string,
  body: { channel: string; customerId?: string; touristUse: boolean },
): Promise<InquirySummary> {
  const response = await fetch(`${API_BASE_URL}/inquiries`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new InquiryCommandError(response.status, problem);
  }
  return (await response.json()) as InquirySummary;
}

async function postCommand(
  idToken: string,
  id: string,
  command: string,
  version: number,
  body: Record<string, unknown>,
): Promise<InquirySummary> {
  const response = await fetch(`${API_BASE_URL}/inquiries/${id}/commands/${command}`, {
    method: 'POST',
    headers: { ...authHeaders(idToken), 'If-Match': `"${version}"` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new InquiryCommandError(response.status, problem);
  }
  return (await response.json()) as InquirySummary;
}

/** CON-03 - cotiza un vehiculo del catalogo mock, pasa la Consulta a COTIZADA. */
export function quoteInquiry(
  idToken: string,
  id: string,
  version: number,
  vehicleId: string,
  destination: string,
  estimatedDays: number,
): Promise<InquirySummary> {
  return postCommand(idToken, id, 'quote', version, { vehicleId, destination, estimatedDays });
}

/** CON-04 - cierra sin conversion (motivo obligatorio, BR-CON-003). */
export function closeInquiry(
  idToken: string,
  id: string,
  version: number,
  reason: string,
  note?: string,
): Promise<InquirySummary> {
  return postCommand(idToken, id, 'close', version, { reason, note });
}

/** CON-03/CON-04 - pasa a CONVERTIDA. No crea la Reservation: eso lo hace
 * el flujo de Reserva (HU-27) llamando a `POST /reservations` con
 * `inquiryId` despues de esta navegacion. */
export function convertInquiryToReservation(idToken: string, id: string, version: number): Promise<InquirySummary> {
  return postCommand(idToken, id, 'convert-to-reservation', version, {});
}
