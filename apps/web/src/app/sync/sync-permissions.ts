import type { SyncChecklistType } from './sync-client';

export type SyncAction = 'READ' | 'CAPTURE' | 'RESOLVE';

/**
 * Espejo EXACTO de SYNC_PERMISSION_MAP (erp-api-local .../sync-conflicts/application/services/sync-access.service.ts).
 * No hay acciones nuevas en ADM-02: reutiliza las existentes. El back sigue autorizando; esto solo evita mostrar
 * acciones que devolverian 403. Resolver (supervisor) es PROVISIONAL en el back.
 */
export const SYNC_PERMISSION_MAP: Readonly<
  Record<SyncChecklistType, Readonly<Record<SyncAction, { module: 'RENTAL' | 'RETURN'; action: string }>>>
> = {
  ENTREGA: {
    READ: { module: 'RENTAL', action: 'READ' },
    CAPTURE: { module: 'RENTAL', action: 'UPLOAD_EVIDENCE' },
    RESOLVE: { module: 'RENTAL', action: 'MANAGE_CONTRACT_TEMPLATES' },
  },
  RECEPCION: {
    READ: { module: 'RETURN', action: 'READ' },
    CAPTURE: { module: 'RETURN', action: 'UPLOAD_EVIDENCE' },
    RESOLVE: { module: 'RETURN', action: 'CLOSE' },
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
