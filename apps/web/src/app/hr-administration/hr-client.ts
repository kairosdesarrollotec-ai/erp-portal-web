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

export interface LogAttendanceInput {
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
}

/**
 * Registra una marcacion. El monto del descuento y los minutos de tardanza NO los ingresa la
 * persona (ADP-03): se envian en 0 (valores por defecto del contrato) y los calcula el servidor.
 */
export async function logAttendance(idToken: string, employeeId: string, input: LogAttendanceInput): Promise<AttendanceRecord> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/employees/{id}/attendance', {
    params: { path: { id: employeeId } },
    headers: authHeaders(idToken),
    body: {
      date: input.date,
      status: input.status,
      minutesLate: 0,
      deductionAmount: 0,
      ...(input.checkInTime ? { checkInTime: input.checkInTime } : {}),
      ...(input.checkOutTime ? { checkOutTime: input.checkOutTime } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
    },
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

export async function getAttendanceSummary(idToken: string, companyId: string, month: string): Promise<AttendanceSummary> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/attendance/summary', {
    params: { query: { companyId, month } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}

/** ADP-03 - "Aplicar descuento" (fin de mes, BR-ADP-001). Sin `employeeIds` aplica a todos. */
export async function applyMonthDeductions(
  idToken: string,
  companyId: string,
  month: string,
  employeeIds?: string[],
): Promise<ApplyDeductionsResult> {
  const { data, error, response } = await hrAdministrationApiClient.POST('/attendance/apply-deductions', {
    headers: authHeaders(idToken),
    body: { companyId, month, ...(employeeIds ? { employeeIds } : {}) },
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
  companyId: string,
  areaId: string,
  year: number,
  signal?: AbortSignal,
): Promise<VacationRequest[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET('/vacations/calendar', {
    params: { query: { companyId, areaId, year } },
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
