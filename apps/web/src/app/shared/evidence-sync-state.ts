/**
 * Estado de sincronizacion del checklist de evidencias, comun a ENTREGA-04
 * (rentals) y DEV-04 (returns), ADR-KAI-004.
 *
 * SYNCED solo se alcanza cuando el listado del SERVIDOR cumple los minimos y no
 * hay nada pendiente en la cola local; nunca por lo subido localmente.
 */
export const REQUIRED_EVIDENCE_PHOTOS = 35;
export const REQUIRED_EVIDENCE_VIDEOS = 3;

export type EvidenceSyncState = 'OFFLINE' | 'SYNCING' | 'SYNCED' | 'ONLINE';

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
}

export function isServerConfirmed(i: Pick<EvidenceSyncInput, 'serverLoaded' | 'photosCount' | 'videosCount'>): boolean {
  return (
    i.serverLoaded && i.photosCount >= REQUIRED_EVIDENCE_PHOTOS && i.videosCount >= REQUIRED_EVIDENCE_VIDEOS
  );
}

export function deriveEvidenceSyncState(i: EvidenceSyncInput): EvidenceSyncState {
  if (!i.isOnline) return 'OFFLINE';
  if (i.syncing) return 'SYNCING';
  if (isServerConfirmed(i) && i.pendingCount === 0) return 'SYNCED';
  return 'ONLINE';
}

/** "Continuar" solo con conexion, sin sincronizacion en curso, sin pendientes y confirmado por el servidor. */
export function canContinueFromEvidence(i: EvidenceSyncInput): boolean {
  return deriveEvidenceSyncState(i) === 'SYNCED';
}
