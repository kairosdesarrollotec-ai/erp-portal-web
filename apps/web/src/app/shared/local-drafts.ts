/**
 * local-drafts.ts
 *
 * Utilidad para leer el conteo de borradores locales pendientes de sincronización.
 *
 * UX-ID: TR-09
 * PROTO-ID: PROTO-TR-09-MODAL-CERRAR-SESION-CON-FORMULARIOS-PEND
 *
 * TR-08 (implementado): lee borradores desde Dexie/IndexedDB.
 * Casos offline aprobados (TDD-00 §3.4, TD-FE-008): ALQ-09, DEV-04.
 *
 * Nota de diseño: Dexie es asíncrono. Esta función devuelve el último
 * conteo conocido (cacheado). Para mantenerlo actualizado, llamar
 * `refreshLocalDraftCount()` en mount desde el hook `useLocalDraftCount`
 * en UserMenuDropdown.tsx.
 */
import { countPendingAll } from '../../offline/queue/evidence-upload-queue';
import { countPendingUnsyncedItems } from '../../offline/crypto/local-encryption';

let _cachedCount = 0;

export function getLocalDraftCount(): number {
  return _cachedCount;
}

export async function refreshLocalDraftCount(): Promise<void> {
  try {
    const pending = await countPendingUnsyncedItems();
    _cachedCount = pending.total;
  } catch {
    _cachedCount = await countPendingAll();
  }
}

