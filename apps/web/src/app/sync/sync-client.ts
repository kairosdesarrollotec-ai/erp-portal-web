import { syncApiClient } from '../../api/sync-api-client';
import type { components } from '../../api/sync.generated';

/**
 * Cliente de sync.yaml 1.1.0 (TR-08 / ENTREGA-04 / DEV-04): sincronizacion offline de checklists y conflictos.
 * Todos los comandos llevan Idempotency-Key; resolver exige If-Match con la `etag` del conflicto.
 */
export type SyncChecklistType = components['schemas']['SyncChecklistType'];
export type SyncChecklistRequest = components['schemas']['SyncChecklistRequest'];
export type SyncChecklistResult = components['schemas']['SyncChecklistResult'];
export type SyncChecklistStatusResponse = components['schemas']['SyncChecklistStatusResponse'];
export type SyncConflict = components['schemas']['SyncConflict'];
export type SyncFieldVersion = components['schemas']['SyncFieldVersion'];
export type SyncEvidenceVersion = components['schemas']['SyncEvidenceVersion'];
export type SyncResolution = components['schemas']['SyncResolution'];
export type ResolveSyncConflictRequest = components['schemas']['ResolveSyncConflictRequest'];
export type ResolveSyncConflictResponse = components['schemas']['ResolveSyncConflictResponse'];
export type SyncFieldInput = components['schemas']['SyncFieldInput'];
export type SyncFieldRevision = components['schemas']['SyncFieldRevision'];
export type SyncEvidenceInput = components['schemas']['SyncEvidenceInput'];

/** Cuerpo `{ statusCode, code, detail }` que el backend devuelve en 4xx. */
export class SyncCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operacion de sincronizacion no se pudo completar (${status})`);
  }
}

function toError(error: unknown, response: Response): SyncCommandError {
  const problem = (error as { code?: string; detail?: string } | null | undefined) ?? null;
  return new SyncCommandError(response.status, problem);
}

const bearer = (idToken: string) => ({ Authorization: `Bearer ${idToken}` });

/** POST /sync/checklists/{type}/{sourceId}/commands/sync */
export async function syncChecklist(
  idToken: string,
  checklistType: SyncChecklistType,
  sourceId: string,
  body: SyncChecklistRequest,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<SyncChecklistResult> {
  const { data, error, response } = await syncApiClient.POST(
    '/sync/checklists/{checklistType}/{sourceId}/commands/sync',
    {
      params: { path: { checklistType, sourceId }, header: { 'Idempotency-Key': idempotencyKey } },
      headers: bearer(idToken),
      body,
    },
  );
  if (error || !data) throw toError(error, response);
  return data;
}

/** GET /sync/checklists/{type}/{sourceId}: estado confirmado por el SERVIDOR. */
export async function getChecklistSyncStatus(
  idToken: string,
  checklistType: SyncChecklistType,
  sourceId: string,
  companyId: string,
  branchId: string,
): Promise<SyncChecklistStatusResponse> {
  const { data, error, response } = await syncApiClient.GET('/sync/checklists/{checklistType}/{sourceId}', {
    params: { path: { checklistType, sourceId }, query: { companyId, branchId } },
    headers: bearer(idToken),
  });
  if (error || !data) throw toError(error, response);
  return data;
}

/** GET /sync/conflicts (por defecto solo OPEN). */
export async function listSyncConflicts(
  idToken: string,
  params: {
    companyId: string;
    branchId: string;
    checklistType: SyncChecklistType;
    sourceId?: string;
    status?: 'OPEN' | 'RESOLVED';
  },
): Promise<SyncConflict[]> {
  const { data, error, response } = await syncApiClient.GET('/sync/conflicts', {
    params: { query: params },
    headers: bearer(idToken),
  });
  if (error || !data) throw toError(error, response);
  return data;
}

/** POST /sync/conflicts/{id}/commands/resolve con If-Match = `conflict.etag`. */
export async function resolveSyncConflict(
  idToken: string,
  conflict: Pick<SyncConflict, 'id' | 'etag'>,
  body: ResolveSyncConflictRequest,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<ResolveSyncConflictResponse> {
  const { data, error, response } = await syncApiClient.POST('/sync/conflicts/{conflictId}/commands/resolve', {
    params: {
      path: { conflictId: conflict.id },
      header: { 'If-Match': conflict.etag, 'Idempotency-Key': idempotencyKey },
    },
    headers: bearer(idToken),
    body,
  });
  if (error || !data) throw toError(error, response);
  return data;
}
