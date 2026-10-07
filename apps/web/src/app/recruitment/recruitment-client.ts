import { recruitmentApiClient } from '../../api/recruitment-api-client';
import type { components } from '../../api/recruitment.generated';
import type { CandidateDecision, CandidateStage, InterviewResult, VacancySource, VacancyStatus } from './recruitment-domain';

export type VacancyResponse = components['schemas']['VacancyResponse'];
export type VacancyDetail = components['schemas']['VacancyDetailResponse'];
export type CandidateResponse = components['schemas']['CandidateResponse'];
export type CandidateDetail = components['schemas']['CandidateDetailResponse'];
export type InterviewResponse = components['schemas']['CandidateInterviewResponse'];
export type Interviewer = components['schemas']['InterviewerResponse'];
export type OnboardingResponse = components['schemas']['OnboardingResponse'];

/** Error HTTP de lectura (GET) - mismo patron que IncidentApiError / ReturnApiError. */
export class RecruitmentApiError extends Error {
  readonly name = 'RecruitmentApiError';
  constructor(public readonly status: number) {
    super(`Error HTTP ${status} al consultar Reclutamiento`);
  }
}

/** Cuerpo `problem+json` que el backend devuelve en 4xx de comandos. */
export class RecruitmentCommandError extends Error {
  readonly name = 'RecruitmentCommandError';
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }
}

const authHeaders = (idToken: string) => ({ Authorization: `Bearer ${idToken}` });
/** Mismo formato que el resto de modulos: version entrecomillada (`"3"`). */
const ifMatch = (version: number) => `"${version}"`;

function toCommandError(error: unknown, status: number): RecruitmentCommandError {
  const problem = (error as { code?: string; detail?: string } | null | undefined) ?? null;
  return new RecruitmentCommandError(status, problem && typeof problem === 'object' ? problem : null);
}

/** Contexto de trabajo (empresa/sede) que viaja en cada llamada. */
export interface RecruitmentScope {
  companyId: string;
  branchId: string;
}

// --- Vacantes (REC-01 / REC-02) -------------------------------------------------

export interface ListVacanciesOptions {
  status?: VacancyStatus;
  limit?: number;
  /** Paginacion keyset (cursorCreatedAt + cursorId del ultimo elemento). */
  cursor?: { createdAt: string; id: string };
}

/** REC-01 - bandeja de vacantes (GET /vacancies, paginacion keyset). */
export async function listVacancies(
  idToken: string,
  scope: RecruitmentScope,
  options: ListVacanciesOptions = {},
  signal?: AbortSignal,
): Promise<VacancyResponse[]> {
  const { data, error, response } = await recruitmentApiClient.GET('/vacancies', {
    params: {
      query: {
        ...scope,
        ...(options.status ? { status: options.status } : {}),
        ...(options.limit !== undefined ? { limit: options.limit } : {}),
        ...(options.cursor ? { cursorCreatedAt: options.cursor.createdAt, cursorId: options.cursor.id } : {}),
      },
    },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new RecruitmentApiError(response.status);
  return data;
}

/** REC-02 - detalle de la vacante; devuelve tambien la version (ETag) para publicar. */
export async function getVacancy(idToken: string, id: string, scope: RecruitmentScope): Promise<VacancyDetail> {
  const { data, error, response } = await recruitmentApiClient.GET('/vacancies/{id}', {
    params: { path: { id }, query: scope },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new RecruitmentApiError(response.status);
  return data;
}

export interface RegisterVacancyInput {
  title: string;
  department: string;
  source: VacancySource;
  isMechanic: boolean;
}

/** REC-01 - "Crear necesidad" (POST /vacancies, Idempotency-Key). */
export async function registerVacancy(
  idToken: string,
  scope: RecruitmentScope,
  input: RegisterVacancyInput,
): Promise<VacancyResponse> {
  const { data, error, response } = await recruitmentApiClient.POST('/vacancies', {
    params: { header: { 'Idempotency-Key': crypto.randomUUID() } },
    headers: authHeaders(idToken),
    body: { ...scope, ...input },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

export interface PublishVacancyInput {
  profileDescription: string;
  baseSalary: number;
  scheduleDetails: string;
  channels: string[];
}

/** REC-02 - "Publicar" (If-Match). */
export async function publishVacancy(
  idToken: string,
  id: string,
  version: number,
  scope: RecruitmentScope,
  input: PublishVacancyInput,
): Promise<VacancyDetail> {
  const { data, error, response } = await recruitmentApiClient.POST('/vacancies/{id}/commands/publish', {
    params: { path: { id }, header: { 'If-Match': ifMatch(version) } },
    headers: authHeaders(idToken),
    body: { ...scope, ...input },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

// --- Candidatos (REC-03 / REC-04) ----------------------------------------------

/** REC-03 - candidatos de una vacante (opcionalmente por etapa). */
export async function listCandidates(
  idToken: string,
  vacancyId: string,
  scope: RecruitmentScope,
  stage?: CandidateStage,
  signal?: AbortSignal,
): Promise<CandidateResponse[]> {
  const { data, error, response } = await recruitmentApiClient.GET('/vacancies/{id}/candidates', {
    params: { path: { id: vacancyId }, query: { ...scope, ...(stage ? { stage } : {}) } },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new RecruitmentApiError(response.status);
  return data;
}

export interface RegisterCandidateInput {
  fullName: string;
  documentType?: string;
  documentNumber: string;
  email?: string;
  phone?: string;
  cvDocumentId: string;
  salaryExpectation?: number;
}

/** REC-03 - "Crear candidato" (Idempotency-Key). */
export async function registerCandidate(
  idToken: string,
  vacancyId: string,
  scope: RecruitmentScope,
  input: RegisterCandidateInput,
): Promise<CandidateResponse> {
  const { data, error, response } = await recruitmentApiClient.POST('/vacancies/{id}/candidates', {
    params: { path: { id: vacancyId }, header: { 'Idempotency-Key': crypto.randomUUID() } },
    headers: authHeaders(idToken),
    body: {
      ...scope,
      fullName: input.fullName,
      documentType: input.documentType ?? 'DNI',
      documentNumber: input.documentNumber,
      cvDocumentId: input.cvDocumentId,
      ...(input.email ? { email: input.email } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.salaryExpectation !== undefined ? { salaryExpectation: input.salaryExpectation } : {}),
    },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** REC-04 / REC-05 / REC-06 / REC-07 / REC-08 - ficha completa (con entrevistas e incorporacion). */
export async function getCandidate(idToken: string, id: string, scope: RecruitmentScope): Promise<CandidateDetail> {
  const { data, error, response } = await recruitmentApiClient.GET('/candidates/{id}', {
    params: { path: { id }, query: scope },
    headers: authHeaders(idToken),
  });
  if (error || !data) throw new RecruitmentApiError(response.status);
  return data;
}

/** REC-03 - mover de etapa (siempre decision humana; solo hacia adelante). */
export async function changeCandidateStage(
  idToken: string,
  id: string,
  version: number,
  scope: RecruitmentScope,
  stage: CandidateStage,
): Promise<CandidateResponse> {
  const { data, error, response } = await recruitmentApiClient.POST('/candidates/{id}/commands/change-stage', {
    params: { path: { id }, header: { 'If-Match': ifMatch(version) } },
    headers: authHeaders(idToken),
    body: { ...scope, stage },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

// --- Entrevista (REC-05) -------------------------------------------------------

/** REC-05 - buscador de entrevistadores (GET /interviewers); `id` es el valor de `interviewerId`. */
export async function listInterviewers(
  idToken: string,
  scope: RecruitmentScope,
  q?: string,
  signal?: AbortSignal,
): Promise<Interviewer[]> {
  const term = q?.trim();
  const { data, error, response } = await recruitmentApiClient.GET('/interviewers', {
    params: { query: { ...scope, ...(term ? { q: term } : {}), limit: 20 } },
    headers: authHeaders(idToken),
    signal,
  });
  if (error || !data) throw new RecruitmentApiError(response.status);
  return data.items;
}

export interface ScheduleInterviewInput {
  scheduledAt: string;
  isVirtual: boolean;
  meetUrl?: string;
  location?: string;
  interviewerId: string;
}

export async function scheduleInterview(
  idToken: string,
  candidateId: string,
  scope: RecruitmentScope,
  input: ScheduleInterviewInput,
): Promise<InterviewResponse> {
  const { data, error, response } = await recruitmentApiClient.POST('/candidates/{id}/interviews', {
    params: { path: { id: candidateId } },
    headers: authHeaders(idToken),
    body: {
      ...scope,
      scheduledAt: input.scheduledAt,
      isVirtual: input.isVirtual,
      interviewerId: input.interviewerId,
      ...(input.meetUrl ? { meetUrl: input.meetUrl } : {}),
      ...(input.location ? { location: input.location } : {}),
    },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** REC-05 - "Registrar resultado": notas libres + Avanza / No avanza (sin puntaje numerico). */
export async function recordInterviewResult(
  idToken: string,
  interviewId: string,
  scope: RecruitmentScope,
  result: InterviewResult,
  qualitativeNotes: string,
): Promise<InterviewResponse> {
  const { data, error, response } = await recruitmentApiClient.POST('/interviews/{id}/commands/record-result', {
    params: { path: { id: interviewId } },
    headers: authHeaders(idToken),
    body: { ...scope, result, qualitativeNotes },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

// --- Decision, incorporacion y periodo de prueba (REC-06 / REC-07 / REC-08) ----

/** REC-06 - Contratar / No contratar (irreversible; If-Match). */
export async function decideCandidate(
  idToken: string,
  id: string,
  version: number,
  scope: RecruitmentScope,
  decision: CandidateDecision,
  decisionNotes?: string,
): Promise<CandidateDetail> {
  const { data, error, response } = await recruitmentApiClient.POST('/candidates/{id}/commands/decide', {
    params: { path: { id }, header: { 'If-Match': ifMatch(version) } },
    headers: authHeaders(idToken),
    body: { ...scope, decision, ...(decisionNotes ? { decisionNotes } : {}) },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

export interface CompleteOnboardingInput {
  startDate: string;
  inductionScheduled: boolean;
  equipmentAssigned: boolean;
  responsibilityCardSigned: boolean;
  notarizedContractSigned: boolean;
}

/** REC-07 - "Confirmar ingreso". */
export async function completeOnboarding(
  idToken: string,
  candidateId: string,
  scope: RecruitmentScope,
  input: CompleteOnboardingInput,
): Promise<OnboardingResponse> {
  const { data, error, response } = await recruitmentApiClient.POST('/candidates/{id}/commands/complete-onboarding', {
    params: { path: { id: candidateId } },
    headers: authHeaders(idToken),
    body: { ...scope, ...input },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}

/** REC-08 - evaluacion del periodo de prueba (positiva = pasa a planilla). */
export async function evaluateProbation(
  idToken: string,
  candidateId: string,
  scope: RecruitmentScope,
  passed: boolean,
  qualitativeEvaluation: string,
): Promise<OnboardingResponse> {
  const { data, error, response } = await recruitmentApiClient.POST('/candidates/{id}/commands/evaluate-probation', {
    params: { path: { id: candidateId } },
    headers: authHeaders(idToken),
    body: { ...scope, passed, qualitativeEvaluation },
  });
  if (error || !data) throw toCommandError(error, response.status);
  return data;
}
