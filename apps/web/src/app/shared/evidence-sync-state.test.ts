import { describe, expect, it } from 'vitest';
import { canContinueFromEvidence, deriveEvidenceSyncState, type EvidenceSyncInput } from './evidence-sync-state';

const base: EvidenceSyncInput = {
  isOnline: true,
  syncing: false,
  serverLoaded: true,
  photosCount: 35,
  videosCount: 3,
  pendingCount: 0,
};

describe('deriveEvidenceSyncState', () => {
  it('SYNCED solo con servidor confirmando 35 fotos + 3 videos y cola vacia', () => {
    expect(deriveEvidenceSyncState(base)).toBe('SYNCED');
    expect(canContinueFromEvidence(base)).toBe(true);
  });
  it('OFFLINE tiene prioridad', () => {
    expect(deriveEvidenceSyncState({ ...base, isOnline: false, syncing: true })).toBe('OFFLINE');
    expect(canContinueFromEvidence({ ...base, isOnline: false })).toBe(false);
  });
  it('SYNCING mientras se sube', () => {
    expect(deriveEvidenceSyncState({ ...base, syncing: true })).toBe('SYNCING');
  });
  it('pendientes locales o servidor incompleto no es SYNCED', () => {
    expect(deriveEvidenceSyncState({ ...base, pendingCount: 1 })).toBe('ONLINE');
    expect(deriveEvidenceSyncState({ ...base, photosCount: 34 })).toBe('ONLINE');
    expect(deriveEvidenceSyncState({ ...base, videosCount: 2 })).toBe('ONLINE');
    expect(deriveEvidenceSyncState({ ...base, serverLoaded: false })).toBe('ONLINE');
    expect(canContinueFromEvidence({ ...base, pendingCount: 2 })).toBe(false);
  });
});

describe('deriveEvidenceSyncState con confirmacion /sync del servidor (sync.yaml)', () => {
  const offlineFlow = { loaded: true, status: 'SYNCED' as const, serverConfirmedAt: '2026-10-19T15:00:00Z' };

  it('SYNC_CONFLICT del servidor bloquea aunque los conteos esten completos', () => {
    const i = { ...base, serverSync: { loaded: true, status: 'SYNC_CONFLICT' as const, serverConfirmedAt: null } };
    expect(deriveEvidenceSyncState(i)).toBe('SYNC_CONFLICT');
    expect(canContinueFromEvidence(i)).toBe(false);
  });
  it('SYNC_CONFLICT bloquea tambien con conteos incompletos', () => {
    const i = { ...base, photosCount: 3, serverSync: { loaded: true, status: 'SYNC_CONFLICT' as const } };
    expect(deriveEvidenceSyncState(i)).toBe('SYNC_CONFLICT');
  });
  it('offline y syncing tienen prioridad sobre el conflicto', () => {
    const c = { loaded: true, status: 'SYNC_CONFLICT' as const };
    expect(deriveEvidenceSyncState({ ...base, isOnline: false, serverSync: c })).toBe('OFFLINE');
    expect(deriveEvidenceSyncState({ ...base, syncing: true, serverSync: c })).toBe('SYNCING');
  });
  it('flujo offline: SYNCED solo con servidor confirmado Y conteos completos', () => {
    expect(deriveEvidenceSyncState({ ...base, serverSync: offlineFlow })).toBe('SYNCED');
    expect(deriveEvidenceSyncState({ ...base, photosCount: 34, serverSync: offlineFlow })).toBe('ONLINE');
  });
  it('estado /sync sin cargar o con error NO es SYNCED (deny-by-default)', () => {
    expect(deriveEvidenceSyncState({ ...base, serverSync: { loaded: false } })).toBe('ONLINE');
    expect(canContinueFromEvidence({ ...base, serverSync: { loaded: false } })).toBe(false);
  });
  it('respaldo: expediente sin flujo offline (serverConfirmedAt nulo) conserva el criterio de conteos', () => {
    const noOffline = { loaded: true, status: 'SYNCED' as const, serverConfirmedAt: null };
    expect(deriveEvidenceSyncState({ ...base, serverSync: noOffline })).toBe('SYNCED');
    expect(deriveEvidenceSyncState({ ...base, videosCount: 2, serverSync: noOffline })).toBe('ONLINE');
  });
  it('sin serverSync (undefined) el comportamiento es el anterior', () => {
    expect(deriveEvidenceSyncState(base)).toBe('SYNCED');
  });
  it('pendientes locales impiden SYNCED aunque el servidor confirme', () => {
    expect(deriveEvidenceSyncState({ ...base, pendingCount: 1, serverSync: offlineFlow })).toBe('ONLINE');
  });
});
