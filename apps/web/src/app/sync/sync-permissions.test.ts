import { describe, expect, it } from 'vitest';
import { can } from '../shared/usePermissions';
import { SYNC_PERMISSION_MAP, canSyncAction } from './sync-permissions';
import { canSuperviseSync } from './useSyncCenter';

describe('sync-permissions (espejo de SYNC_PERMISSION_MAP del back)', () => {
  it('el mapa coincide con el del back', () => {
    expect(SYNC_PERMISSION_MAP.ENTREGA).toEqual({
      READ: { module: 'RENTAL', action: 'READ' },
      CAPTURE: { module: 'RENTAL', action: 'UPLOAD_EVIDENCE' },
      RESOLVE: { module: 'SYNC', action: 'SUPERVISE_CONFLICTS' },
    });
    expect(SYNC_PERMISSION_MAP.RECEPCION).toEqual({
      READ: { module: 'RETURN', action: 'READ' },
      CAPTURE: { module: 'RETURN', action: 'UPLOAD_EVIDENCE' },
      RESOLVE: { module: 'SYNC', action: 'SUPERVISE_CONFLICTS' },
    });
  });

  it('resolver ENTREGA y RECEPCION exige la acción propia SYNC.SUPERVISE_CONFLICTS (deny-by-default)', () => {
    const granted = new Set(['RENTAL.UPLOAD_EVIDENCE', 'RETURN.UPLOAD_EVIDENCE']);
    const check = (type: 'ENTREGA' | 'RECEPCION', a: 'READ' | 'CAPTURE' | 'RESOLVE', g: Set<string>) =>
      canSyncAction((m, act) => can(g, m, act), type, a);
    expect(check('ENTREGA', 'CAPTURE', granted)).toBe(true);
    expect(check('ENTREGA', 'RESOLVE', granted)).toBe(false);
    expect(check('RECEPCION', 'RESOLVE', granted)).toBe(false);
    expect(check('ENTREGA', 'RESOLVE', new Set(['SYNC.SUPERVISE_CONFLICTS']))).toBe(true);
    expect(check('RECEPCION', 'RESOLVE', new Set(['SYNC.SUPERVISE_CONFLICTS']))).toBe(true);
    expect(check('RECEPCION', 'RESOLVE', new Set(['RETURN.CLOSE']))).toBe(false);
    expect(check('ENTREGA', 'RESOLVE', new Set(['RENTAL.MANAGE_CONTRACT_TEMPLATES']))).toBe(false);
  });

  it('canSuperviseSync evalúa la acción propia SYNC.SUPERVISE_CONFLICTS', () => {
    expect(canSuperviseSync((m, act) => can(new Set(['SYNC.SUPERVISE_CONFLICTS']), m, act))).toBe(true);
    expect(canSuperviseSync((m, act) => can(new Set(['RETURN.CLOSE', 'RENTAL.MANAGE_CONTRACT_TEMPLATES']), m, act))).toBe(false);
  });
});
