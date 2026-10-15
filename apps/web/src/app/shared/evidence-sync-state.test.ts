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
