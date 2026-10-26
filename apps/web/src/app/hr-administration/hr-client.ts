import { hrAdministrationApiClient } from "../../api/hr-administration-api-client";
import type { components } from "../../api/hr-administration.generated";
import type { EmployeeStatus } from "./hr-domain";
export type EmployeeResponse = components["schemas"]["EmployeeResponse"];
export type EmployeeDetail = components["schemas"]["EmployeeDetailResponse"];
export type AttendanceRecord = components["schemas"]["AttendanceRecordResponse"];
export type AttendanceSummary = components["schemas"]["MonthlyAttendanceSummaryResponse"];
export type ApplyDeductionsResult = components["schemas"]["ApplyDeductionsResponse"];
export type LeaveRequest = components["schemas"]["LeaveRequestResponse"];
export type VacationRequest = components["schemas"]["VacationRequestResponse"];
export type FieldTrip = components["schemas"]["FieldTripResponse"];
export type TerminationResult = components["schemas"]["EmploymentTerminationResponse"];
export type HrMemo = components["schemas"]["HrMemoResponse"];
export type Training = components["schemas"]["TrainingResponse"];
export type LeaveEvidence = components["schemas"]["LeaveEvidenceResponse"];
export type MyEmployee = components["schemas"]["MyEmployeeResponse"];
export type AttendanceEvidence = components["schemas"]["AttendanceEvidenceResponse"];
/** H-02: area del catalogo de RR.HH. de la empresa (`code` = `Employee.areaId` cuando el area viene del catalogo). */
export type HrArea = components["schemas"]["HrArea"];
export type CreateEmployeeInput = components["schemas"]["CreateEmployeeRequest"];
export type UpdateEmployeeInput = components["schemas"]["UpdateEmployeeRequest"];
/** Respuesta del PATCH: la ficha + `accountRelink` solo si la edicion cambio el vinculo con la cuenta (DEC-ADP-RELINK-001). */
export type UpdateEmployeeResult = components["schemas"]["UpdateEmployeeResponse"];
export type AccountRelinkNotice = components["schemas"]["AccountRelinkNotice"];
export type HrDocument = components["schemas"]["HrDocumentResponse"];
export type HrDocumentCategory = components["schemas"]["HrDocumentCategory"];
export type PublishHrDocumentInput = components["schemas"]["PublishHrDocumentRequest"];
export type ConfirmHrDocumentReadResult = components["schemas"]["ConfirmHrDocumentReadResponse"];
/** Error HTTP de lectura (GET) - mismo patron que RecruitmentApiError. */
export class HrApiError extends Error {
  readonly name = "HrApiError";
  constructor(public readonly status: number) {
    super(`Error HTTP ${status} al consultar Administración de Personal`);
  }
}
/** Cuerpo `problem+json` que el backend devuelve en 4xx de comandos. */
export class HrCommandError extends Error {
  readonly name = "HrCommandError";
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
  return new HrCommandError(status, problem && typeof problem === "object" ? problem : null);
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
export async function listEmployees(idToken: string, scope: HrScope, options: ListEmployeesOptions = {}, signal?: AbortSignal): Promise<{ items: EmployeeResponse[]; total: number }> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/employees", {
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
export interface ListHrAreasOptions {
  /** Incluye las áreas desactivadas. Solo con HR_ADMINISTRATION.MANAGE_AREAS (Gerencia General); si no, 403. */
  includeInactive?: boolean;
}
/** Catalogo de areas de RR.HH. de la empresa (H-02). Lista vacia si la empresa aun no tiene catalogo. */
export async function listHrAreas(idToken: string, scope: HrScope, signal?: AbortSignal, options: ListHrAreasOptions = {}): Promise<HrArea[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/hr-areas", {
    params: { query: { ...scope, ...(options.includeInactive ? { includeInactive: true } : {}) } },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new HrApiError(response.status);
  return data.items;
}
/** Alta de un área del catálogo (solo Gerencia General). 409 HR_AREA_ALREADY_EXISTS, 422 HR_AREA_NAME_INVALID. */
export async function createHrArea(idToken: string, scope: HrScope, input: { name: string; description?: string }): Promise<HrArea> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/hr-areas", {
    headers: authHeaders(idToken),
    body: { ...scope, name: input.name, ...(input.description ? { description: input.description } : {}) },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** Desactiva un área (idempotente). 409 HR_AREA_IN_USE si hay colaboradores activos asignados. */
export async function deactivateHrArea(idToken: string, scope: HrScope, code: string): Promise<HrArea> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/hr-areas/{code}/deactivate", {
    params: { path: { code } },
    headers: authHeaders(idToken),
    body: scope,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** Reactiva un área desactivada (idempotente). */
export async function reactivateHrArea(idToken: string, scope: HrScope, code: string): Promise<HrArea> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/hr-areas/{code}/reactivate", {
    params: { path: { code } },
    headers: authHeaders(idToken),
    body: scope,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
export async function getEmployee(idToken: string, id: string, scope: HrScope): Promise<EmployeeDetail> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/employees/{id}", {
    params: { path: { id }, query: scope },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new HrApiError(response.status);
  return data;
}
export * from "./hr-workforce-client";
// --- HU-31: Documentos de Talento Humano ----------------------------------------
/** GET /hr-documents/active: listar documentos vigentes (con estado de lectura para el usuario). */
export async function listActiveHrDocuments(idToken: string, scope: HrScope, category?: HrDocumentCategory, signal?: AbortSignal): Promise<HrDocument[]> {
  const { data, error, response } = await hrAdministrationApiClient.GET("/hr-documents/active", {
    params: {
      query: {
        companyId: scope.companyId,
        branchId: scope.branchId,
        ...(category ? { category } : {}),
      },
    },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new HrApiError(response.status);
  return data.items;
}
/** POST /hr-documents: publicar o actualizar documento institucional (solo Gerencia General). */
export async function publishHrDocument(idToken: string, input: PublishHrDocumentInput): Promise<HrDocument> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/hr-documents", {
    headers: authHeaders(idToken),
    body: input,
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
/** POST /hr-documents/{id}/confirm-read: registrar confirmación de lectura del colaborador. */
export async function confirmHrDocumentRead(idToken: string, documentId: string, scope: HrScope): Promise<ConfirmHrDocumentReadResult> {
  const { data, error, response } = await hrAdministrationApiClient.POST("/hr-documents/{id}/confirm-read", {
    params: { path: { id: documentId }, query: { companyId: scope.companyId, branchId: scope.branchId } },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
