import { hrAdministrationApiClient } from "../../api/hr-administration-api-client";
import type { components } from "../../api/hr-administration.generated";
import type { AttendanceStatus, FieldTripStatus, TerminationReason } from "./hr-domain";
import {
  HrApiError,
  HrCommandError,
  type AttendanceRecord,
  type CreateEmployeeInput,
  type EmployeeResponse,
  type FieldTrip,
  type HrMemo,
  type HrScope,
  type MyEmployee,
  type TerminationResult,
  type Training,
  type UpdateEmployeeInput,
  type UpdateEmployeeResult,
} from "./hr-client";
const authHeaders = (idToken: string) => ({ Authorization: `Bearer ${idToken}` });
function toCommandError(error: unknown, status: number): HrCommandError {
  const problem = (error as { code?: string; detail?: string } | null | undefined) ?? null;
  return new HrCommandError(status, problem && typeof problem === "object" ? problem : null);
}
// --- ADP-06 / ADP-07 / ADP-08: salidas a campo ------------------------------------
export async function listFieldTrips(idToken: string, scope: HrScope, options: { status?: FieldTripStatus; employeeId?: string } = {}, signal?: AbortSignal): Promise<FieldTrip[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/field-trips", {
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
  const { data, error, response } = await hrAdministrationApiClient.POST("/employees/{id}/field-trips", {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
    body: input,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** ADP-06: la ficha del propio usuario (no exige permisos de Personal). 404 EMPLOYEE_NOT_LINKED si aun no esta vinculada. */
export async function getMyEmployee(idToken: string, scope: HrScope): Promise<MyEmployee> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/me/employee", {
    params: { query: scope },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** ADP-07: rechaza la salida con un motivo (queda sin autorizacion; no abre mas niveles). */
export async function rejectFieldTrip(idToken: string, id: string, reason: string): Promise<FieldTrip> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/field-trips/{id}/reject", {
    params: { path: { id } },
    headers: authHeaders(idToken),
    body: { reason },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
export async function getFieldTrip(idToken: string, id: string): Promise<FieldTrip> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/field-trips/{id}", {
    params: { path: { id } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
/** El nivel que se envia es el nivel PENDIENTE actual de la salida (1, 2 o 3; nunca 4). */
export async function authorizeFieldTrip(idToken: string, id: string, authorizationLevel: 1 | 2 | 3, notes?: string): Promise<FieldTrip> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/field-trips/{id}/authorize", {
    params: { path: { id } },
    headers: authHeaders(idToken),
    body: { authorizationLevel, ...(notes ? { notes } : {}) },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** El servidor es quien avanza la cascada (N1 -> N2 -> N3 -> sin autorizacion); el cliente solo lo pide al vencer el tiempo. */
export async function advanceFieldTripTimeout(idToken: string, id: string): Promise<FieldTrip> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/field-trips/{id}/advance-timeout", {
    params: { path: { id } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
export async function evaluateFieldTripReturn(idToken: string, id: string, actualReturn: string, returnNotes?: string): Promise<FieldTrip> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/field-trips/{id}/return", {
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
  const { data, error, response } = await hrAdministrationApiClient.POST("/employees/{id}/terminate", {
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
  const { data, error, response } = await hrAdministrationApiClient.GET("/employees/{id}/memos", {
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
  const { data, error, response } = await hrAdministrationApiClient.POST("/trainings", {
    headers: { ...authHeaders(idToken), "Idempotency-Key": crypto.randomUUID() },
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
  const { data, error, response } = await hrAdministrationApiClient.GET("/trainings", {
    params: { query: { ...scope, ...(limit ? { limit } : {}) } },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
// --- Alta de personal (ADP-01) ----------------------------------------------------
export async function createEmployee(idToken: string, input: CreateEmployeeInput): Promise<EmployeeResponse> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/employees", {
    headers: { ...authHeaders(idToken), "Idempotency-Key": crypto.randomUUID() },
    body: input,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/**
 * Edita la ficha (MANAGE_EMPLOYEES). `expectedVersion` viaja como `If-Match: "<version>"` (DEC-ADP-EDIT-ETAG-001): si la ficha
 * cambio desde que se leyo el servidor responde 412 EMPLOYEE_VERSION_CONFLICT sin aplicar nada. Si el correo cambia en una
 * ficha vinculada, la respuesta trae `accountRelink` (RELINKED / UNLINKED); 409 EMPLOYEE_ACCOUNT_ALREADY_LINKED si la cuenta
 * del correo nuevo ya pertenece a otra ficha.
 */
export async function updateEmployee(idToken: string, employeeId: string, input: UpdateEmployeeInput, expectedVersion?: number): Promise<UpdateEmployeeResult> {
  const { data, error, response } = await hrAdministrationApiClient.PATCH("/employees/{id}", {
    params: { path: { id: employeeId }, header: expectedVersion === undefined ? {} : { "If-Match": `"${expectedVersion}"` } },
    headers: authHeaders(idToken),
    body: input,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
// --- hr-administration 0.10.0 (22-oct #9): asistencia propia con geocerca, revision y configuracion por sede -------------
export type MyAttendance = components["schemas"]["MyAttendanceResponse"];
export type BranchGeofence = components["schemas"]["BranchGeofenceResponse"];
export type LogMyAttendanceInput = Omit<components["schemas"]["LogMyAttendanceRequest"], "companyId" | "branchId" | "status"> & {
  /** CHECK_OUT no envía estado; CHECK_IN usa PRESENTE o TARDANZA. */
  status?: AttendanceStatus;
};
/** GET /me/attendance: mis marcas del mes y la geocerca de la sede. */
export async function getMyAttendance(idToken: string, scope: HrScope, month?: string, signal?: AbortSignal): Promise<MyAttendance> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/me/attendance", {
    params: { query: { ...scope, ...(month ? { month } : {}) } },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
/** POST /me/attendance: marca la propia entrada o salida (foto obligatoria en la entrada; ubicacion obligatoria). */
export async function logMyAttendance(idToken: string, scope: HrScope, input: LogMyAttendanceInput, idempotencyKey: string = crypto.randomUUID()): Promise<AttendanceRecord> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/me/attendance", {
    params: { header: { "Idempotency-Key": idempotencyKey } },
    headers: authHeaders(idToken),
    body: { ...scope, ...input } as components["schemas"]["LogMyAttendanceRequest"],
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** GET /attendance/pending-review: marcas fuera de la geocerca que esperan revision. */
export async function listAttendancePendingReview(idToken: string, scope: HrScope, limit = 100, signal?: AbortSignal): Promise<AttendanceRecord[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/attendance/pending-review", {
    params: { query: { ...scope, limit } },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
export interface ReviewAttendanceInput {
  decision: "APPROVE" | "CORRECT";
  note?: string;
  status?: AttendanceStatus;
  minutesLate?: number;
}
/** PATCH /attendance/{id}/review: aprobar tal cual o corregir (nota obligatoria al corregir). */
export async function reviewAttendance(idToken: string, attendanceId: string, input: ReviewAttendanceInput): Promise<AttendanceRecord> {
  const { data, error, response } = await hrAdministrationApiClient.PATCH("/attendance/{id}/review", {
    params: { path: { id: attendanceId } },
    headers: authHeaders(idToken),
    body: input as components["schemas"]["ReviewAttendanceRequest"],
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** GET /branches/{branchId}/geofence. */
export async function getBranchGeofence(idToken: string, scope: HrScope, signal?: AbortSignal): Promise<BranchGeofence> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/branches/{branchId}/geofence", {
    params: { path: { branchId: scope.branchId }, query: { companyId: scope.companyId } },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
/** PUT /branches/{branchId}/geofence: centro + radio (10..5000 m). */
export async function setBranchGeofence(idToken: string, scope: HrScope, input: { latitude: number; longitude: number; radiusMeters: number }): Promise<BranchGeofence> {
  const { data, error, response } = await hrAdministrationApiClient.PUT("/branches/{branchId}/geofence", {
    params: { path: { branchId: scope.branchId } },
    headers: authHeaders(idToken),
    body: { companyId: scope.companyId, ...input },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** DELETE /branches/{branchId}/geofence: la sede queda sin geocerca (ninguna marca se considera fuera). */
export async function deleteBranchGeofence(idToken: string, scope: HrScope): Promise<BranchGeofence> {
  const { data, error, response } = await hrAdministrationApiClient.DELETE("/branches/{branchId}/geofence", {
    params: { path: { branchId: scope.branchId }, query: { companyId: scope.companyId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
