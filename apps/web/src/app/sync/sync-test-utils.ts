import type { SyncChecklistStatusResponse, SyncChecklistType, SyncConflict } from './sync-client';

/** Fixtures compartidos por las pruebas de sincronizacion (no se importa desde codigo de produccion). */
export function syncedStatus(
  checklistType: SyncChecklistType,
  sourceId: string,
  overrides: Partial<SyncChecklistStatusResponse> = {},
): SyncChecklistStatusResponse {
  return { checklistType, sourceId, status: 'SYNCED', serverConfirmedAt: null, stateVersion: null, openConflicts: [], fieldRevisions: [], ...overrides };
}

export function makeConflict(overrides: Partial<SyncConflict> = {}): SyncConflict {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    auditRef: 'SYNC-ERR-AB12CD34',
    checklistType: 'ENTREGA',
    sourceId: 'rent-1',
    rentalId: 'rent-1',
    kind: 'FIELD',
    key: 'notes',
    status: 'OPEN',
    canMerge: false,
    serverVersion: { value: 'Rayón en puerta', by: 'Carlos Ruiz', at: '2026-10-19T15:00:00Z', deviceId: 'dev-2' },
    localVersion: { value: 'Sin daños', by: 'Ana Torres', at: '2026-10-19T15:05:00Z', deviceId: 'dev-1' },
    resolution: null,
    reason: null,
    detectedBy: 'uid-1',
    deviceId: 'dev-1',
    resolvedBy: null,
    resolvedAt: null,
    version: 1,
    etag: '"1"',
    createdAt: '2026-10-19T15:06:00Z',
    ...overrides,
  };
}
