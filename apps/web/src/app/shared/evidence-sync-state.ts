/**
 * Estado de sincronizacion del checklist de evidencias, comun a ENTREGA-04
 * (rentals) y DEV-04 (returns), ADR-KAI-004.
 *
 * SYNCED solo se alcanza cuando el listado del SERVIDOR cumple los minimos y no
 * hay nada pendiente en la cola local; nunca por lo subido localmente.
 *
 * sync.yaml 1.0.0: cuando el hook de estado de sincronizacion informa `serverSync`
 * (GET /sync/checklists/{type}/{sourceId}), el SERVIDOR manda:
 *  - status SYNC_CONFLICT => estado SYNC_CONFLICT (bloquea "Continuar" hasta que un supervisor resuelva);
 *  - status aun sin cargar o con error de carga => NO es SYNCED (deny-by-default);
 *  - status SYNCED => ademas de los conteos del listado, que el servidor confirme.
 * Si el expediente nunca uso el flujo offline el servidor responde SYNCED con serverConfirmedAt nulo y el backend no
 * bloquea el cierre: se mantiene el comportamiento anterior (solo conteos). Sin `serverSync` (undefined) tambien.
 */
export const REQUIRED_EVIDENCE_PHOTOS = 35;
export const REQUIRED_EVIDENCE_VIDEOS = 3;

export type EvidenceSyncState = 'OFFLINE' | 'SYNCING' | 'SYNC_CONFLICT' | 'SYNCED' | 'ONLINE';

/** Estado de GET /sync/checklists/... tal como lo confirma el servidor. */
export interface ServerSyncInput {
  /** La consulta ya respondio con exito. */
  loaded: boolean;
  status?: 'SYNCED' | 'SYNC_CONFLICT';
  /** Nulo si el expediente no uso el flujo offline. */
  serverConfirmedAt?: string | null;
}

export interface EvidenceSyncInput {
  isOnline: boolean;
  /** Sincronizacion de la cola Dexie o subida directa en curso. */
  syncing: boolean;
  /** El listado del servidor ya cargo. */
  serverLoaded: boolean;
  photosCount: number;
  videosCount: number;
  /** Items locales pendientes en la cola Dexie. */
  pendingCount: number;
  /** Opcional: confirmacion del servidor via /sync. Ausente => comportamiento previo (conteos). */
  serverSync?: ServerSyncInput;
}

export function isServerConfirmed(i: Pick<EvidenceSyncInput, 'serverLoaded' | 'photosCount' | 'videosCount'>): boolean {
  return (
    i.serverLoaded && i.photosCount >= REQUIRED_EVIDENCE_PHOTOS && i.videosCount >= REQUIRED_EVIDENCE_VIDEOS
  );
}

/** El servidor tiene un conflicto abierto en este checklist. */
export function hasServerConflict(i: Pick<EvidenceSyncInput, 'serverSync'>): boolean {
  return i.serverSync?.loaded === true && i.serverSync.status === 'SYNC_CONFLICT';
}

/** Conteos del listado Y (si se consulto) confirmacion /sync del servidor. */
export function isChecklistServerConfirmed(i: EvidenceSyncInput): boolean {
  if (!isServerConfirmed(i)) return false;
  if (!i.serverSync) return true; // sin consulta /sync: comportamiento previo
  return i.serverSync.loaded && i.serverSync.status === 'SYNCED';
}

export function deriveEvidenceSyncState(i: EvidenceSyncInput): EvidenceSyncState {
  if (!i.isOnline) return 'OFFLINE';
  if (i.syncing) return 'SYNCING';
  if (hasServerConflict(i)) return 'SYNC_CONFLICT';
  if (isChecklistServerConfirmed(i) && i.pendingCount === 0) return 'SYNCED';
  return 'ONLINE';
}

/** "Continuar" solo con conexion, sin sincronizacion en curso, sin pendientes y confirmado por el servidor. */
export function canContinueFromEvidence(i: EvidenceSyncInput): boolean {
  return deriveEvidenceSyncState(i) === 'SYNCED';
}
