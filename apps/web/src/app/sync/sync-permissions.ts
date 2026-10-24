import type { SyncChecklistType } from './sync-client';

export type SyncAction = 'READ' | 'CAPTURE' | 'RESOLVE';

/**
 * Espejo EXACTO de SYNC_PERMISSION_MAP (erp-api-local .../sync-conflicts/application/services/sync-access.service.ts).
 * RESOLVE usa la acción propia SYNC.SUPERVISE_CONFLICTS (supervisor: Administración + Gerencia por defecto).
 */
export const SYNC_PERMISSION_MAP: Readonly<
  Record<SyncChecklistType, Readonly<Record<SyncAction, { module: 'RENTAL' | 'RETURN' | 'SYNC'; action: string }>>>
> = {
  ENTREGA: {
    READ: { module: 'RENTAL', action: 'READ' },
    CAPTURE: { module: 'RENTAL', action: 'UPLOAD_EVIDENCE' },
    RESOLVE: { module: 'SYNC', action: 'SUPERVISE_CONFLICTS' },
  },
  RECEPCION: {
    READ: { module: 'RETURN', action: 'READ' },
    CAPTURE: { module: 'RETURN', action: 'UPLOAD_EVIDENCE' },
    RESOLVE: { module: 'SYNC', action: 'SUPERVISE_CONFLICTS' },
  },
};

/** `can` del front (usePermissions().can) aplicado al mapa del back. */
export function canSyncAction(
  can: (module: string, action: string) => boolean,
  checklistType: SyncChecklistType,
  action: SyncAction,
): boolean {
  const { module, action: matrixAction } = SYNC_PERMISSION_MAP[checklistType][action];
  return can(module, matrixAction);
}
