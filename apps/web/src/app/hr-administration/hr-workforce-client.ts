import { hrAdministrationApiClient } from "../../api/hr-administration-api-client";
import type { components } from "../../api/hr-administration.generated";
import { ATTENDANCE_LOCATION_SENDING_ENABLED, type AttendanceLocation } from "./attendance-location";
import type { AttendanceStatus, LeaveType } from "./hr-domain";
import {
  HrApiError,
  HrCommandError,
  type ApplyDeductionsResult,
  type AttendanceRecord,
  type AttendanceSummary,
  type EmployeeResponse,
  type HrScope,
  type LeaveEvidence,
  type LeaveRequest,
  type VacationRequest,
} from "./hr-client";
const authHeaders = (idToken: string) => ({ Authorization: `Bearer ${idToken}` });
function toCommandError(error: unknown, status: number): HrCommandError {
  const problem = (error as { code?: string; detail?: string } | null | undefined) ?? null;
  return new HrCommandError(status, problem && typeof problem === "object" ? problem : null);
}
// --- ADP-02 / ADP-03: asistencia --------------------------------------------------
/** DEC-ADP-ATT-EVIDENCE-001 - foto de WhatsApp (reloj + hora + rostro) que corrobora la marcacion. Requiere storageRef o url. */
export interface AttendanceEvidenceInput {
  kind: "WHATSAPP_PHOTO";
  storageRef?: string;
  url?: string;
  /** Hora de Lima sin offset: `YYYY-MM-DDTHH:mm[:ss]`. */
  capturedAtLocal: string;
  note?: string;
}
export interface LogAttendanceInput {
  /** HU-29: ubicación automática; solo viaja si ATTENDANCE_LOCATION_SENDING_ENABLED (hr-administration 0.8.0). */
  location?: AttendanceLocation | null;
  date: string;
  status: AttendanceStatus;
  /** Obligatorio (> 0) solo para TARDANZA; para el resto no se envia. */
  minutesLate?: number;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  /** OBLIGATORIA para PRESENTE y TARDANZA (422 ATTENDANCE_EVIDENCE_REQUIRED); opcional en faltas y permisos. */
  evidence?: AttendanceEvidenceInput;
  /** Registro «a nombre de otro» (ADP-02): motivo obligatorio (22-oct, Respuestas #10/#20). */
  reason?: string;
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
    ...(input.status === "TARDANZA" && input.minutesLate ? { minutesLate: input.minutesLate } : {}),
    ...(input.checkInTime ? { checkInTime: input.checkInTime } : {}),
    ...(input.checkOutTime ? { checkOutTime: input.checkOutTime } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.evidence ? { evidence: input.evidence } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(ATTENDANCE_LOCATION_SENDING_ENABLED && input.location ? { ...input.location } : {}),
  } as unknown as components["schemas"]["LogAttendanceRequest"];
  const { data, error, response } = await hrAdministrationApiClient.POST("/employees/{id}/attendance", {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
    body,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
export const ATTENDANCE_EVIDENCE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
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
export async function requestAttendanceEvidenceUploadUrl(idToken: string, employeeId: string, contentType: AttendanceEvidenceContentType, contentLength: number): Promise<AttendanceEvidenceUploadSession> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/employees/{id}/attendance/evidence/upload-url", {
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
    uploaded = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
  } catch {
    throw new HrCommandError(0, null);
  }
  if (!uploaded.ok) throw new HrCommandError(uploaded.status, null);
}
/** Pide la URL firmada y sube la foto; devuelve la sesion (con `storageRef` para log-attendance). */
export async function uploadAttendanceEvidence(idToken: string, employeeId: string, file: File): Promise<AttendanceEvidenceUploadSession> {
  const contentType = file.type as AttendanceEvidenceContentType;
  const session = await requestAttendanceEvidenceUploadUrl(idToken, employeeId, contentType, file.size);
  await putAttendanceEvidenceFile(session.uploadUrl, file, contentType);
  return session;
}
/** DEC-ADP-LINK-EMAIL-001: vincula la ficha con la cuenta de usuario del mismo correo (MANAGE_EMPLOYEES, sin body). */
export async function linkEmployeeAccount(idToken: string, employeeId: string): Promise<EmployeeResponse> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/employees/{id}/link-account", {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** ADP-03: reclasifica una falta como justificada o injustificada. El descuento lo recalcula el servidor. */
export async function reclassifyAttendance(idToken: string, attendanceId: string, status: "FALTA_JUSTIFICADA" | "FALTA_INJUSTIFICADA", justification: string): Promise<AttendanceRecord> {
  const { data, error, response } = await hrAdministrationApiClient.PATCH("/attendance/{id}/reclassify", {
    params: { path: { id: attendanceId } },
    headers: authHeaders(idToken),
    body: { status, justification },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
export async function getEmployeeAttendance(idToken: string, employeeId: string, month: string): Promise<AttendanceRecord[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/employees/{id}/attendance", {
    params: { path: { id: employeeId }, query: { month } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
export async function getAttendanceSummary(idToken: string, scope: HrScope, month: string): Promise<AttendanceSummary> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/attendance/summary", {
    params: { query: { ...scope, month } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
/** ADP-03 - "Aplicar descuento" (fin de mes, BR-ADP-001). Sin `employeeIds` aplica a todos. */
export async function applyMonthDeductions(idToken: string, scope: HrScope, month: string, employeeIds?: string[]): Promise<ApplyDeductionsResult> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/attendance/apply-deductions", {
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
  const { data, error, response } = await hrAdministrationApiClient.POST("/employees/{id}/leaves", {
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
  const { data, error, response } = await hrAdministrationApiClient.GET("/employees/{id}/leaves", {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
export async function resolveLeave(idToken: string, leaveId: string, status: "AUTORIZADO" | "DENEGADO", resolutionNotes?: string): Promise<LeaveRequest> {
  const { data, error, response } = await hrAdministrationApiClient.PATCH("/leaves/{id}/resolve", {
    params: { path: { id: leaveId } },
    headers: authHeaders(idToken),
    body: { status, ...(resolutionNotes ? { resolutionNotes } : {}) },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
// --- ADP-04: evidencia de permisos --------------------------------------------------
export const LEAVE_EVIDENCE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type LeaveEvidenceType = (typeof LEAVE_EVIDENCE_TYPES)[number];
export const LEAVE_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
export async function listLeaveEvidence(idToken: string, leaveId: string): Promise<LeaveEvidence[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/leaves/{id}/evidence", {
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
  const session = await hrAdministrationApiClient.POST("/leaves/{id}/evidence/upload-url", {
    params: { path: { id: leaveId } },
    headers: authHeaders(idToken),
    body: { contentType, contentLength: file.size },
  });
  if (session.error || !session.data) throw toCommandError(session.error, session.response.status);
  let uploaded: Response;
  try {
    uploaded = await fetch(session.data.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
  } catch {
    throw new HrCommandError(0, null);
  }
  if (!uploaded.ok) throw new HrCommandError(uploaded.status, null);
  const recorded = await hrAdministrationApiClient.POST("/leaves/{id}/evidence", {
    params: { path: { id: leaveId } },
    headers: authHeaders(idToken),
    body: { objectUrl: session.data.objectUrl, contentType },
  });
  if (recorded.error || !recorded.data) throw toCommandError(recorded.error, recorded.response.status);
  return recorded.data;
}
// --- ADP-05: vacaciones -----------------------------------------------------------
export async function scheduleVacation(idToken: string, employeeId: string, input: { startDate: string; endDate: string; notes?: string }): Promise<VacationRequest> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/employees/{id}/vacations", {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
    body: { startDate: input.startDate, endDate: input.endDate, ...(input.notes ? { notes: input.notes } : {}) },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/**
 * Reprograma unas vacaciones en conflicto a otra fecha libre (hr-administration 0.10.0, #10; sin lista de espera). Motivo
 * obligatorio. 409 VACATION_OVERLAP si las nuevas fechas tambien chocan; queda REPROGRAMADA con las fechas originales.
 */
export async function rescheduleVacation(idToken: string, vacationId: string, input: { startDate: string; endDate: string; reason: string }, idempotencyKey: string = crypto.randomUUID()): Promise<VacationRequest> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/vacations/{id}/reschedule", {
    params: { path: { id: vacationId }, header: { "Idempotency-Key": idempotencyKey } },
    headers: authHeaders(idToken),
    body: input,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** Cancela unas vacaciones (SOLICITADA / PROGRAMADA / REPROGRAMADA) liberando el cupo del area. Motivo obligatorio. */
export async function cancelVacation(idToken: string, vacationId: string, input: { reason: string }, idempotencyKey: string = crypto.randomUUID()): Promise<VacationRequest> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/vacations/{id}/cancel", {
    params: { path: { id: vacationId }, header: { "Idempotency-Key": idempotencyKey } },
    headers: authHeaders(idToken),
    body: input,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** R4: Gerencia resuelve vacaciones: aprueba con grantedDays (soporta menos días), reprograma o rechaza/cancela */
export async function resolveVacation(idToken: string, vacationId: string, input: { status: "PROGRAMADA" | "REPROGRAMADA" | "CANCELADA"; grantedDays?: number; statusReason?: string }): Promise<VacationRequest> {
  const { data, error, response } = await hrAdministrationApiClient.PATCH("/vacations/{id}/resolve", {
    params: { path: { id: vacationId } },
    headers: authHeaders(idToken),
    body: input,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** R4: Listar solicitudes de permiso del propio colaborador */
export async function listMyLeaves(idToken: string, scope: HrScope): Promise<LeaveRequest[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/me/leaves", {
    params: { query: scope },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
/** R4: Solicitar permiso propio (autoservicio) */
export async function requestMyLeave(idToken: string, scope: HrScope, input: { type: LeaveType; date: string; reason: string; startTime?: string; endTime?: string }, idempotencyKey: string = crypto.randomUUID()): Promise<LeaveRequest> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/me/leaves", {
    params: { query: scope, header: { "Idempotency-Key": idempotencyKey } },
    headers: authHeaders(idToken),
    body: input,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** R4: Listar solicitudes de vacaciones del propio colaborador */
export async function listMyVacations(idToken: string, scope: HrScope): Promise<VacationRequest[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/me/vacations", {
    params: { query: scope },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
/** R4: Solicitar vacaciones propias (autoservicio, estado SOLICITADA) */
export async function requestMyVacation(idToken: string, scope: HrScope, input: { startDate: string; endDate: string; notes?: string }, idempotencyKey: string = crypto.randomUUID()): Promise<VacationRequest> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/me/vacations", {
    params: { query: scope, header: { "Idempotency-Key": idempotencyKey } },
    headers: authHeaders(idToken),
    body: input,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
export async function getEmployeeVacations(idToken: string, employeeId: string): Promise<VacationRequest[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/employees/{id}/vacations", {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
/** Calendario del AREA para un anio; solo sirve para detectar el conflicto puntual (no se muestra completo). */
export async function getVacationsCalendar(idToken: string, scope: HrScope, areaId: string, year: number, signal?: AbortSignal): Promise<VacationRequest[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/vacations/calendar", {
    params: { query: { ...scope, areaId, year } },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
export * from "./hr-field-trips-client";
