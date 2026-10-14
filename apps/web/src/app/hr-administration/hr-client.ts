import { hrAdministrationApiClient } from '../../api/hr-administration-api-client';
import type { components } from '../../api/hr-administration.generated';
import type { AttendanceStatus, EmployeeStatus, FieldTripStatus, LeaveType, TerminationReason } from './hr-domain';

export type EmployeeResponse = components['schemas']['EmployeeResponse'];
export type EmployeeDetail = components['schemas']['EmployeeDetailResponse'];
export type AttendanceRecord = components['schemas']['AttendanceRecordResponse'];
export type AttendanceSummary = components['schemas']['MonthlyAttendanceSummaryResponse'];
export type ApplyDeductionsResult = components['schemas']['ApplyDeductionsResponse'];
export type LeaveRequest = components['schemas']['LeaveRequestResponse'];
export type VacationRequest = components['schemas']['VacationRequestResponse'];
export type FieldTrip = components['schemas']['FieldTripResponse'];
export type TerminationResult = components['schemas']['EmploymentTerminationResponse'];
export type HrMemo = components['schemas']['HrMemoResponse'];
export type Training = components['schemas']['TrainingResponse'];
export type LeaveEvidence = components['schemas']['LeaveEvidenceResponse'];
export type MyEmployee = components['schemas']['MyEmployeeResponse'];
export type AttendanceEvidence = components['schemas']['AttendanceEvidenceResponse'];
export type CreateEmployeeInput = components['schemas']['CreateEmployeeRequest'];

/** Error HTTP de lectura (GET) - mismo patron que RecruitmentApiError. */
export class HrApiError extends Error {
  readonly name = 'HrApiError';
  constructor(public readonly status: number) {
    super(`Error HTTP ${status} al consultar Administración de Personal`);
  }
}

/** Cuerpo `problem+json` que el backend devuelve en 4xx de comandos. */
export class HrCommandError extends Error {
  readonly name = 'HrCommandError';
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }
}

const authHeaders = (idToken: string) => ({ Authorization: `Bearer ${idToken}` });

function toCommandError(error: unknown, status: number): HrCommandError {
  const problem = (error as { code?: string; detail?: string } | null | undefined) ?? null;
  return new HrCommandError(status, problem && typeof problem === 'object' ? problem : null);
}

/** Contexto de trabajo (empresa/sede) que viaja en las consultas con alcance. */
export interface HrScope {
  companyId: string;
  branchId: string;
}

// --- ADP-01: personal -------------------------------------------------------------

export interface ListEmployeesOptions {
  status?: EmployeeStatus;
  areaId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listEmployees(
  idToken: string,
  scope: HrScope,
  options: ListEmployeesOptions = {},
  signal?: AbortSignal,
): Promise<{ items: EmployeeResponse[]; total: number }> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/employees', {
    params: {
      query: {
        ...scope,
        ...(options.status ? { status: options.status } : {}),
        ...(options.areaId ? { areaId: options.areaId } : {}),
        ...(options.search ? { search: options.search } : {}),
        ...(options.limit !== undefined ? { limit: options.limit } : {}),
        ...(options.offset !== undefined ? { offset: options.offset } : {}),
      },
    },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

export async function getEmployee(idToken: string, id: string): Promise<EmployeeDetail> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/employees/{id}', {
    params: { path: { id } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

// --- ADP-02 / ADP-03: asistencia --------------------------------------------------

/** DEC-ADP-ATT-EVIDENCE-001 - foto de WhatsApp (reloj + hora + rostro) que corrobora la marcacion. Requiere storageRef o url. */
export interface AttendanceEvidenceInput {
  kind: 'WHATSAPP_PHOTO';
  storageRef?: string;
  url?: string;
  /** Hora de Lima sin offset: `YYYY-MM-DDTHH:mm[:ss]`. */
  capturedAtLocal: string;
  note?: string;
}

export interface LogAttendanceInput {
  date: string;
  status: AttendanceStatus;
  /** Obligatorio (> 0) solo para TARDANZA; para el resto no se envia. */
  minutesLate?: number;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  /** OBLIGATORIA para PRESENTE y TARDANZA (422 ATTENDANCE_EVIDENCE_REQUIRED); opcional en faltas y permisos. */
  evidence?: AttendanceEvidenceInput;
}

/**
 * Registra una marcacion. El monto del descuento NO lo ingresa nadie (ADP-03): no se envia
 * `deductionAmount` y el servidor lo calcula del sueldo base. Si se enviara (aunque fuera 0) el servidor lo
 * respetaria, por eso el cuerpo se arma sin ese campo (el tipo generado lo marca obligatorio por el
 * `default: 0` del contrato).
 */
export async function logAttendance(idToken: string, employeeId: string, input: LogAttendanceInput): Promise<AttendanceRecord> {
  const body = {
    date: input.date,
    status: input.status,
    ...(input.status === 'TARDANZA' && input.minutesLate ? { minutesLate: input.minutesLate } : {}),
    ...(input.checkInTime ? { checkInTime: input.checkInTime } : {}),
    ...(input.checkOutTime ? { checkOutTime: input.checkOutTime } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.evidence ? { evidence: input.evidence } : {}),
  } as unknown as components['schemas']['LogAttendanceRequest'];
  const { data, error, response } = await hrAdministrationApiClient.POST('/employees/{id}/attendance', {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
    body,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

export const ATTENDANCE_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AttendanceEvidenceContentType = (typeof ATTENDANCE_EVIDENCE_TYPES)[number];
export const ATTENDANCE_EVIDENCE_MAX_BYTES = 12582912; // 12 MiB

export interface AttendanceEvidenceUploadSession {
  uploadUrl: string;
  objectUrl: string;
  /** Valor para `evidence.storageRef` de logAttendance. */
  storageRef: string;
  expiresAt: string;
}

/** Solicita la URL firmada para subir la foto de evidencia de asistencia (POST .../attendance/evidence/upload-url). */
export async function requestAttendanceEvidenceUploadUrl(
  idToken: string,
  employeeId: string,
  contentType: AttendanceEvidenceContentType,
  contentLength: number,
): Promise<AttendanceEvidenceUploadSession> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/employees/{id}/attendance/evidence/upload-url', {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
    body: { contentType, contentLength },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** PUT directo del archivo a la URL firmada (mismo Content-Type que se pidio). */
export async function putAttendanceEvidenceFile(uploadUrl: string, file: File, contentType: string): Promise<void> {
  let uploaded: Response;
  try {
    uploaded = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
  } catch {
    throw new HrCommandError(0, null);
  }
  if (!uploaded.ok) throw new HrCommandError(uploaded.status, null);
}

/** Pide la URL firmada y sube la foto; devuelve la sesion (con `storageRef` para log-attendance). */
export async function uploadAttendanceEvidence(
  idToken: string,
  employeeId: string,
  file: File,
): Promise<AttendanceEvidenceUploadSession> {
  const contentType = file.type as AttendanceEvidenceContentType;
  const session = await requestAttendanceEvidenceUploadUrl(idToken, employeeId, contentType, file.size);
  await putAttendanceEvidenceFile(session.uploadUrl, file, contentType);
  return session;
}

/** DEC-ADP-LINK-EMAIL-001: vincula la ficha con la cuenta de usuario del mismo correo (MANAGE_EMPLOYEES, sin body). */
export async function linkEmployeeAccount(idToken: string, employeeId: string): Promise<EmployeeResponse> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/employees/{id}/link-account', {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** ADP-03: reclasifica una falta como justificada o injustificada. El descuento lo recalcula el servidor. */
export async function reclassifyAttendance(
  idToken: string,
  attendanceId: string,
  status: 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA',
  justification: string,
): Promise<AttendanceRecord> {
  const { data, error, response } = await hrAdministrationApiClient.PATCH('/attendance/{id}/reclassify', {
    params: { path: { id: attendanceId } },
    headers: authHeaders(idToken),
    body: { status, justification },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

export async function getEmployeeAttendance(idToken: string, employeeId: string, month: string): Promise<AttendanceRecord[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/employees/{id}/attendance', {
    params: { path: { id: employeeId }, query: { month } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

export async function getAttendanceSummary(idToken: string, scope: HrScope, month: string): Promise<AttendanceSummary> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/attendance/summary', {
    params: { query: { ...scope, month } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

/** ADP-03 - "Aplicar descuento" (fin de mes, BR-ADP-001). Sin `employeeIds` aplica a todos. */
export async function applyMonthDeductions(
  idToken: string,
  scope: HrScope,
  month: string,
  employeeIds?: string[],
): Promise<ApplyDeductionsResult> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/attendance/apply-deductions', {
    headers: authHeaders(idToken),
    body: { ...scope, month, ...(employeeIds ? { employeeIds } : {}) },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

// --- ADP-04: permisos -------------------------------------------------------------

export interface RequestLeaveInput {
  type: LeaveType;
  date: string;
  startTime?: string;
  endTime?: string;
  reason: string;
}

export async function requestLeave(idToken: string, employeeId: string, input: RequestLeaveInput): Promise<LeaveRequest> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/employees/{id}/leaves', {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
    body: {
      type: input.type,
      date: input.date,
      reason: input.reason,
      ...(input.startTime ? { startTime: input.startTime } : {}),
      ...(input.endTime ? { endTime: input.endTime } : {}),
    },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

export async function getEmployeeLeaves(idToken: string, employeeId: string): Promise<LeaveRequest[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/employees/{id}/leaves', {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

export async function resolveLeave(
  idToken: string,
  leaveId: string,
  status: 'AUTORIZADO' | 'DENEGADO',
  resolutionNotes?: string,
): Promise<LeaveRequest> {
  const { data, error, response } = await hrAdministrationApiClient.PATCH('/leaves/{id}/resolve', {
    params: { path: { id: leaveId } },
    headers: authHeaders(idToken),
    body: { status, ...(resolutionNotes ? { resolutionNotes } : {}) },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

// --- ADP-04: evidencia de permisos --------------------------------------------------

export const LEAVE_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export type LeaveEvidenceType = (typeof LEAVE_EVIDENCE_TYPES)[number];
export const LEAVE_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

export async function listLeaveEvidence(idToken: string, leaveId: string): Promise<LeaveEvidence[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/leaves/{id}/evidence', {
    params: { path: { id: leaveId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

/**
 * Sube el sustento en 3 pasos (mismo patron que Devoluciones): URL firmada -> subida directa del archivo ->
 * registro del objeto en el permiso. Devuelve la evidencia ya adjunta.
 */
export async function attachLeaveEvidence(idToken: string, leaveId: string, file: File): Promise<LeaveEvidence> {
  const contentType = file.type as LeaveEvidenceType;
  const session = await hrAdministrationApiClient.POST('/leaves/{id}/evidence/upload-url', {
    params: { path: { id: leaveId } },
    headers: authHeaders(idToken),
    body: { contentType, contentLength: file.size },
  });
  if (session.error || !session.data) throw toCommandError(session.error, session.response.status);

  let uploaded: Response;
  try {
    uploaded = await fetch(session.data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
  } catch {
    throw new HrCommandError(0, null);
  }
  if (!uploaded.ok) throw new HrCommandError(uploaded.status, null);

  const recorded = await hrAdministrationApiClient.POST('/leaves/{id}/evidence', {
    params: { path: { id: leaveId } },
    headers: authHeaders(idToken),
    body: { objectUrl: session.data.objectUrl, contentType },
  });
  if (recorded.error || !recorded.data) throw toCommandError(recorded.error, recorded.response.status);
  return recorded.data;
}

// --- ADP-05: vacaciones -----------------------------------------------------------

export async function scheduleVacation(
  idToken: string,
  employeeId: string,
  input: { startDate: string; endDate: string; notes?: string },
): Promise<VacationRequest> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/employees/{id}/vacations', {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
    body: { startDate: input.startDate, endDate: input.endDate, ...(input.notes ? { notes: input.notes } : {}) },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

export async function getEmployeeVacations(idToken: string, employeeId: string): Promise<VacationRequest[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/employees/{id}/vacations', {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

/** Calendario del AREA para un anio; solo sirve para detectar el conflicto puntual (no se muestra completo). */
export async function getVacationsCalendar(
  idToken: string,
  scope: HrScope,
  areaId: string,
  year: number,
  signal?: AbortSignal,
): Promise<VacationRequest[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/vacations/calendar', {
    params: { query: { ...scope, areaId, year } },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

// --- ADP-06 / ADP-07 / ADP-08: salidas a campo ------------------------------------

export async function listFieldTrips(
  idToken: string,
  scope: HrScope,
  options: { status?: FieldTripStatus; employeeId?: string } = {},
  signal?: AbortSignal,
): Promise<FieldTrip[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/field-trips', {
    params: {
      query: {
        ...scope,
        ...(options.status ? { status: options.status } : {}),
        ...(options.employeeId ? { employeeId: options.employeeId } : {}),
      },
    },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

export interface RequestFieldTripInput {
  destination: string;
  objective: string;
  estimatedDeparture: string;
  estimatedReturn: string;
}

export async function requestFieldTrip(idToken: string, employeeId: string, input: RequestFieldTripInput): Promise<FieldTrip> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/employees/{id}/field-trips', {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
    body: input,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** ADP-06: la ficha del propio usuario (no exige permisos de Personal). 404 EMPLOYEE_NOT_LINKED si aun no esta vinculada. */
export async function getMyEmployee(idToken: string, scope: HrScope): Promise<MyEmployee> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/me/employee', {
    params: { query: scope },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** ADP-07: rechaza la salida con un motivo (queda sin autorizacion; no abre mas niveles). */
export async function rejectFieldTrip(idToken: string, id: string, reason: string): Promise<FieldTrip> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/field-trips/{id}/reject', {
    params: { path: { id } },
    headers: authHeaders(idToken),
    body: { reason },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

export async function getFieldTrip(idToken: string, id: string): Promise<FieldTrip> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/field-trips/{id}', {
    params: { path: { id } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

/** El nivel que se envia es el nivel PENDIENTE actual de la salida (1, 2 o 3; nunca 4). */
export async function authorizeFieldTrip(idToken: string, id: string, authorizationLevel: 1 | 2 | 3, notes?: string): Promise<FieldTrip> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/field-trips/{id}/authorize', {
    params: { path: { id } },
    headers: authHeaders(idToken),
    body: { authorizationLevel, ...(notes ? { notes } : {}) },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** El servidor es quien avanza la cascada (N1 -> N2 -> N3 -> sin autorizacion); el cliente solo lo pide al vencer el tiempo. */
export async function advanceFieldTripTimeout(idToken: string, id: string): Promise<FieldTrip> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/field-trips/{id}/advance-timeout', {
    params: { path: { id } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

export async function evaluateFieldTripReturn(
  idToken: string,
  id: string,
  actualReturn: string,
  returnNotes?: string,
): Promise<FieldTrip> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/field-trips/{id}/return', {
    params: { path: { id } },
    headers: authHeaders(idToken),
    body: { actualReturn, ...(returnNotes ? { returnNotes } : {}) },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

// --- ADP-09: termino de la relacion laboral ---------------------------------------

export interface TerminateEmploymentInput {
  reason: TerminationReason;
  noticeDays: number;
  finalSettlementPaid: boolean;
  settlementAmount?: number;
  notes?: string;
}

export async function terminateEmployment(idToken: string, employeeId: string, input: TerminateEmploymentInput): Promise<TerminationResult> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/employees/{id}/terminate', {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
    body: {
      reason: input.reason,
      noticeDays: input.noticeDays,
      finalSettlementPaid: input.finalSettlementPaid,
      settlementAmount: input.settlementAmount ?? 0,
      ...(input.notes ? { notes: input.notes } : {}),
    },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

// --- ADP-01 / ADP-08: memos por reincidencia -------------------------------------

export async function getEmployeeMemos(idToken: string, employeeId: string): Promise<HrMemo[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/employees/{id}/memos', {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

// --- ADP-10: capacitacion interna -------------------------------------------------

export interface RegisterTrainingInput {
  topic: string;
  heldOn: string;
  attendeeIds: string[];
  durationMinutes?: number;
  comprehensionNotes?: string;
}

export async function registerTraining(idToken: string, scope: HrScope, input: RegisterTrainingInput): Promise<Training> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/trainings', {
    headers: { ...authHeaders(idToken), 'Idempotency-Key': crypto.randomUUID() },
    body: {
      ...scope,
      topic: input.topic,
      heldOn: input.heldOn,
      attendeeIds: input.attendeeIds,
      ...(input.durationMinutes ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.comprehensionNotes ? { comprehensionNotes: input.comprehensionNotes } : {}),
    },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

export async function listTrainings(idToken: string, scope: HrScope, limit?: number, signal?: AbortSignal): Promise<Training[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/trainings', {
    params: { query: { ...scope, ...(limit ? { limit } : {}) } },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

// --- Alta de personal (ADP-01) ----------------------------------------------------

export async function createEmployee(idToken: string, input: CreateEmployeeInput): Promise<EmployeeResponse> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/employees', {
    headers: { ...authHeaders(idToken), 'Idempotency-Key': crypto.randomUUID() },
    body: input,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
