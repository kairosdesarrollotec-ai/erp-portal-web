import type { InquiryStatus } from './inquiry-status';
import { inquiriesApiClient } from '../../api/inquiries-api-client';
import type { components } from '../../api/inquiries.generated';

type RegisterBody = components['schemas']['RegisterInquiryRequest'];
type QuoteBody = components['schemas']['QuoteRequest'];
type CloseBody = components['schemas']['CloseInquiryRequest'];
type ConvertBody = components['schemas']['ConvertToReservationRequest'];

export interface InquirySummary {
  id: string;
  status: InquiryStatus;
  channel: string | null;
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
  /** BR-CON-004: documentos exigidos segun la nacionalidad del cliente (los devuelve el backend). */
  requiredDocuments?: Array<{ code: string; label: string } | string>;
  /**
   * El backend (InquirySummaryResponse) ya envia estos campos desde
   * siempre - faltaban en este tipo (no reflejaban el shape real de la
   * respuesta), lo que hacia que la recuperacion de deep link en
   * useInquiryVehicles.ts no pudiera leerlos y los pisara con '' / 1,
   * rompiendo "Cotizar este vehiculo" (400 INVALID por destination vacio)
   * cada vez que se entraba a CON-03 sin navState previo (recarga de
   * pagina o link directo).
   */
  destination: string | null;
  estimatedDays: number | null;
  travelStartDate: string | null;
  partySize?: number | null;
  isDirtRoad?: boolean;
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
  channel: string;
  occurredAt: string;
  outcome: string | null;
  note: string | null;
}

export interface InquiryDetail extends InquirySummary {
  latestQuotationId?: string | null;
  interactions: InquiryInteraction[];
  quotations: InquiryQuotation[];
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
    limit?: number;
    /** Keyset: createdAt / id de la ULTIMA fila de la pagina anterior (se envian juntos). */
    cursorCreatedAt?: string;
    cursorId?: string;
  },
  signal?: AbortSignal,
): Promise<InquirySummary[]> {
  const { data, error, response } = await inquiriesApiClient.GET('/inquiries', {
    params: {
      query: {
        companyId,
        branchId,
        ...(filters?.customerId ? { customerId: filters.customerId } : {}),
        ...(filters?.channel ? { channel: filters.channel as components['schemas']['InquiryChannel'] } : {}),
        ...(filters?.status ? { status: filters.status as components['schemas']['InquiryStatus'] } : {}),
        ...(filters?.createdFrom ? { createdFrom: filters.createdFrom } : {}),
        ...(filters?.createdTo ? { createdTo: filters.createdTo } : {}),
        ...(filters?.limit ? { limit: filters.limit } : {}),
        ...(filters?.cursorCreatedAt && filters?.cursorId
          ? { cursorCreatedAt: filters.cursorCreatedAt, cursorId: filters.cursorId }
          : {}),
      },
    },
    headers: { Authorization: `Bearer ${idToken}` },
    signal,
  });
  if (error || !data) {
    throw new InquiryApiError(`No se pudo obtener la bandeja de consultas (${response.status})`, response.status);
  }
  return data as unknown as InquirySummary[];
}

/** CON-04 - detalle de una consulta (incluye interactions/quotations). */
export async function getInquiry(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<InquiryDetail> {
  const { data, error, response } = await inquiriesApiClient.GET('/inquiries/{id}', {
    params: { path: { id }, query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new InquiryApiError(`No se pudo obtener la consulta (${response.status})`, response.status);
  }
  return data as unknown as InquiryDetail;
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

const INQUIRY_ERROR_MESSAGES: Record<string, string> = {
  RESERVATION_EXCEEDS_GUARANTEE:
    'El monto de la reserva no puede superar la garantía del vehículo. No existe saldo a favor: elige otro vehículo o revisa la política de reserva.',
  INQUIRY_REQUIRED: 'Toda reserva o alquiler nace de una Consulta. Registra la consulta primero.',
  INQUIRY_CONVERSION_REQUIRED:
    'Esta operación solo se puede hacer desde la Consulta (botón "Reservar" o "Convertir a Alquiler" en su detalle).',
};

/** Mensaje en español para un error de comando de Consulta (usa el código del backend si lo conocemos). */
export function inquiryCommandErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof InquiryCommandError) {
    const mapped = error.problem?.code ? INQUIRY_ERROR_MESSAGES[error.problem.code] : undefined;
    return mapped ?? error.message;
  }
  return error instanceof Error ? error.message : fallback;
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
    isDirtRoad?: boolean;
  },
): Promise<InquirySummary> {
  const { data, error, response } = await inquiriesApiClient.POST('/inquiries', {
    params: { header: { 'Idempotency-Key': crypto.randomUUID() } },
    headers: { Authorization: `Bearer ${idToken}` },
    body: body as unknown as RegisterBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new InquiryCommandError(response.status, problem);
  }
  return data as unknown as InquirySummary;
}

/** CON-03 - cotiza un vehiculo del catalogo mock, pasa la Consulta a COTIZADA. */
export async function quoteInquiry(
  idToken: string,
  id: string,
  version: number,
  companyId: string,
  branchId: string,
  vehicleId: string,
  destination: string,
  estimatedDays: number,
  plan?: 'NORMAL' | 'PLUS' | 'LIBRE',
): Promise<InquirySummary> {
  const { data, error, response } = await inquiriesApiClient.POST('/inquiries/{id}/commands/quote', {
    params: {
      path: { id },
      header: { 'If-Match': `"${version}"`, 'Idempotency-Key': crypto.randomUUID() },
    },
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId, vehicleId, destination, estimatedDays, plan } as unknown as QuoteBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new InquiryCommandError(response.status, problem);
  }
  return data as unknown as InquirySummary;
}

/** CON-04 - cierra sin conversion (motivo obligatorio, BR-CON-003).
 *  Requiere companyId y branchId para que el backend valide el contexto de trabajo
 *  (CloseInquiryDto exige ambos campos con @IsUUID()).
 */
export async function closeInquiry(
  idToken: string,
  id: string,
  version: number,
  companyId: string,
  branchId: string,
  reason: string,
  note?: string,
): Promise<InquirySummary> {
  const { data, error, response } = await inquiriesApiClient.POST('/inquiries/{id}/commands/close', {
    params: {
      path: { id },
      header: { 'If-Match': `"${version}"`, 'Idempotency-Key': crypto.randomUUID() },
    },
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId, reason, note } as unknown as CloseBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new InquiryCommandError(response.status, problem);
  }
  return data as unknown as InquirySummary;
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
 *
 * Reactivado: ya existe el lugar en la UI que captura los 2 datos que
 * faltaban (modalidad y fecha de inicio) - ver InquiryDetailScreen.tsx.
 * Firma propia porque la respuesta real no es un InquirySummary: el
 * backend crea la Reservation en la misma transaccion y devuelve ambas
 * entidades (TDD-CON-001.md 15 / inquiries.controller.ts).
 */
export interface ConvertToReservationResult {
  inquiry: InquirySummary;
  reservation: { id: string; status: string; version: number };
}

export async function convertInquiryToReservation(
  idToken: string,
  id: string,
  version: number,
  companyId: string,
  branchId: string,
  channelMode: 'PRESENCIAL' | 'VIRTUAL',
  startAt: string,
  canComeToOffice?: boolean,
  customerLocation?: 'AYACUCHO' | 'FUERA_DE_AYACUCHO',
): Promise<ConvertToReservationResult> {
  const effectiveChannelMode = canComeToOffice === false ? 'VIRTUAL' : channelMode;
  const { data, error, response } = await inquiriesApiClient.POST('/inquiries/{id}/commands/convert-to-reservation', {
    params: {
      path: { id },
      header: { 'If-Match': `"${version}"`, 'Idempotency-Key': crypto.randomUUID() },
    },
    headers: { Authorization: `Bearer ${idToken}` },
    body: {
      companyId,
      branchId,
      channelMode: effectiveChannelMode,
      startAt,
      ...(canComeToOffice !== undefined ? { canComeToOffice } : {}),
      ...(customerLocation !== undefined ? { customerLocation } : {}),
    } as unknown as ConvertBody,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new InquiryCommandError(response.status, problem);
  }
  return data as unknown as ConvertToReservationResult;
}

/**
 * CON-04 - "Convertir a Alquiler". Todo alquiler nace de una Consulta.
 * POST /inquiries/{id}/commands/convert-to-rental (If-Match con la version de
 * la consulta, Idempotency-Key). Responde `{ inquiry, rental }`: la consulta
 * queda CONVERTIDA y el alquiler en DRAFT, sin fechas (se fijan al completar
 * la entrega). Errores de dominio llegan como problem+json (409/412/422).
 */
export interface ConvertToRentalResult {
  inquiry?: InquirySummary;
  rental: { id: string; status?: string; version?: number };
}

export async function convertInquiryToRental(
  idToken: string,
  id: string,
  version: number,
  companyId: string,
  branchId: string,
): Promise<ConvertToRentalResult> {
  const { data, error, response } = await inquiriesApiClient.POST('/inquiries/{id}/commands/convert-to-rental', {
    params: {
      path: { id },
      header: { 'If-Match': `"${version}"`, 'Idempotency-Key': crypto.randomUUID() },
    },
    headers: { Authorization: `Bearer ${idToken}` },
    // planCode: el backend usa NORMAL por defecto; los tipos generados lo marcan requerido.
    body: { companyId, branchId, planCode: 'NORMAL' },
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new InquiryCommandError(response.status, problem);
  }
  const rental = data.rental as ConvertToRentalResult['rental'] | undefined;
  if (!rental?.id) {
    throw new InquiryCommandError(response.status, { detail: 'La respuesta no incluyó el alquiler creado.' });
  }
  return { inquiry: data.inquiry as unknown as InquirySummary | undefined, rental };
}
