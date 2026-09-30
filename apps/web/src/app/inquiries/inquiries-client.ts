import type { InquiryStatus } from './inquiry-status';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface InquirySummary {
  id: string;
  status: InquiryStatus;
  channel: string;
  version: number;
  companyId: string;
  branchId?: string;
  /**
   * Bug fix (Consultas): el backend (CONFLICT-CON-002) ya no embebe un
   * objeto `customer` en la respuesta de /inquiries - solo persiste
   * `customerId`. El nombre del cliente vinculado se resuelve aparte con
   * `GET /customers/{customerId}` (ver useInquiriesList.ts). Antes este
   * tipo declaraba `customer: { id, name } | null`, que el backend nunca
   * enviaba: `inquiry.customer` siempre era `undefined` y la bandeja
   * mostraba "Sin cliente registrado" incluso con cliente vinculado.
   */
  customerId: string | null;
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

/** Igual patron que ReservationApiError (reservations-client.ts) - permite
 * distinguir un fallo tecnico (401/403/404/5xx) de datos validos en
 * listInquiries/getInquiry, en vez de la comprobacion fragil por texto
 * (`error.message.includes('(403)')`) que usaba useInquiriesList.ts antes
 * de esta revision (hallazgo "Verificacion requerida: 401/403/409/422/5xx"). */
export class InquiryApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'InquiryApiError';
    this.status = status;
  }
}

/**
 * CON-01 - bandeja de consultas (PANTALLAS-V3-B-CONSULTA.md, GET /inquiries).
 *
 * Hallazgo de revision PR#11 ("Contexto incompleto"): igual que RES-01
 * (finding #1 de la revision de PR#10), el listado filtraba solo por
 * companyId - una empresa puede tener varias sedes, y sin branchId la
 * bandeja de una sede podia mezclar consultas de otras sedes de la misma
 * empresa. branchId es ahora obligatorio, igual que en getInquiry. El
 * aislamiento real sigue siendo responsabilidad del backend.
 */
export async function listInquiries(
  idToken: string,
  companyId: string,
  branchId: string,
  filters?: {
    customerId?: string;
    channel?: string;
    status?: InquiryStatus;
    createdFrom?: string;
    createdTo?: string;
  },
  signal?: AbortSignal,
): Promise<InquirySummary[]> {
  const params = new URLSearchParams({ companyId, branchId });
  if (filters?.customerId) params.set('customerId', filters.customerId);
  if (filters?.channel) params.set('channel', filters.channel);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.createdFrom) params.set('createdFrom', filters.createdFrom);
  if (filters?.createdTo) params.set('createdTo', filters.createdTo);
  const response = await fetch(`${API_BASE_URL}/inquiries?${params.toString()}`, {
    headers: authHeaders(idToken),
    signal,
  });
  if (!response.ok) {
    throw new InquiryApiError(`No se pudo obtener la bandeja de consultas (${response.status})`, response.status);
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
    throw new InquiryApiError(`No se pudo obtener la consulta (${response.status})`, response.status);
  }
  return (await response.json()) as InquiryDetail;
}

/** Cuerpo `problem+json` que el backend devuelve en 409/412/422 (mismo contrato que reservations-client.ts). */
export class InquiryCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operación no se pudo completar (${status})`);
  }
}

/**
 * CON-02 - crea la Consulta en REGISTRADA con el snapshot completo
 * (TDD-CON-001.md 11.1 + RegisterInquiryDto).
 *
 * La identidad del prospecto va en el sub-objeto `prospect` (CONFLICT-CON-002
 * resuelto en el backend — campos planos en el nivel raiz son rechazados con
 * 400 "should not exist"). `customerId` sigue omitido: no existe flujo de
 * busqueda/alta de cliente en el frontend todavia.
 *
 * `countryEntryDate` (SC-CON-001.03, solo EXTRANJERO) queda fuera: el
 * formulario captura "Documento de hospedaje", que es un campo distinto y no
 * tiene equivalente en ProspectDto. Brecha documentada, no corregida
 * silenciosamente.
 */
export async function createInquiry(
  idToken: string,
  body: {
    companyId: string;
    branchId: string;
    channel: string;
    customerId?: string;
    touristUse: boolean;
    prospect?: {
      fullName: string;
      documentType: string;
      documentNumber: string;
      nationality: 'PERUANO' | 'EXTRANJERO';
      countryEntryDate?: string;
    };
    destination: string;
    estimatedDays: number;
    travelStartDate?: string;
    partySize?: number;
  },
): Promise<InquirySummary> {
  const response = await fetch(`${API_BASE_URL}/inquiries`, {
    method: 'POST',
    headers: { ...authHeaders(idToken), 'Idempotency-Key': crypto.randomUUID() },
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
    headers: {
      ...authHeaders(idToken),
      'If-Match': `"${version}"`,
      // TDD-CON-001.md 15: la idempotencia aplica a register/quote/close -
      // antes el cliente no mandaba este header en ningun comando mutable.
      'Idempotency-Key': crypto.randomUUID(),
    },
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
  companyId: string,
  branchId: string,
  vehicleId: string,
  destination: string,
  estimatedDays: number,
): Promise<InquirySummary> {
  return postCommand(idToken, id, 'quote', version, { companyId, branchId, vehicleId, destination, estimatedDays });
}

/** CON-04 - cierra sin conversion (motivo obligatorio, BR-CON-003).
 *  Requiere companyId y branchId para que el backend valide el contexto de trabajo
 *  (CloseInquiryDto exige ambos campos con @IsUUID()).
 */
export function closeInquiry(
  idToken: string,
  id: string,
  version: number,
  companyId: string,
  branchId: string,
  reason: string,
  note?: string,
): Promise<InquirySummary> {
  return postCommand(idToken, id, 'close', version, { companyId, branchId, reason, note });
}

/**
 * CON-03/CON-04 - pasa a CONVERTIDA (estado terminal). No crea la
 * Reservation: ese comando (`POST /reservations`, TDD-RES-001.md 11.1)
 * exige `customerId`, `startAt`/`endAt` y `branchId` que este frontend
 * todavia no captura en ningun flujo (no hay alta/busqueda de cliente ni
 * seleccion de fechas de recojo/devolucion en Consulta).
 *
 * Hallazgo de revision PR#11 (Critico #4, "conversion/reserva
 * incompleta"): antes se llamaba este comando y se navegaba a /reservas
 * como si la conversion hubiera completado el flujo, dejando la Consulta
 * en CONVERTIDA (estado TERMINAL, sin retorno) sin ninguna Reservation
 * asociada - perdida de integridad de datos real. Por eso esta funcion ya
 * NO se invoca desde la UI (ver useInquiryDetail.ts) hasta que exista una
 * pantalla real de creacion de Reserva que junte los datos que faltan; se
 * mantiene exportada para cuando ese flujo se construya.
 */
export function convertInquiryToReservation(idToken: string, id: string, version: number): Promise<InquirySummary> {
  return postCommand(idToken, id, 'convert-to-reservation', version, {});
}
