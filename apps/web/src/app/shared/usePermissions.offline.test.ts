import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePermissionsStore } from './usePermissions';
import { useWorkSession } from './useWorkSession';
import { clearPermissions } from '../../test/permissions';

const getMyPermissionsMock = vi.fn();
const recallPermissionsMock = vi.fn();
const rememberPermissionsMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'token' } }),
}));
vi.mock('./my-permissions-client', () => ({
  getMyPermissions: (...args: unknown[]) => getMyPermissionsMock(...args),
}));
vi.mock('../../offline/session/offline-session', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../offline/session/offline-session')>();
  return {
    ...original,
    recallPermissions: (...args: unknown[]) => recallPermissionsMock(...args),
    rememberPermissions: (...args: unknown[]) => rememberPermissionsMock(...args),
  };
});

const CTX = { companyId: 'c1', branchId: 'b1' };

describe('usePermissions · permisos guardados sin conexión (V-27)', () => {
  beforeEach(() => {
    clearPermissions();
    useWorkSession.getState().clearSession();
    getMyPermissionsMock.mockReset();
    recallPermissionsMock.mockReset();
    rememberPermissionsMock.mockReset();
  });

  it('con el servidor guarda una copia local de los permisos', async () => {
    getMyPermissionsMock.mockResolvedValue({
      role: null,
      matrixVersion: 4,
      permissions: [{ module: 'RETURN', action: 'UPLOAD_EVIDENCE' }],
    });
    await usePermissionsStore.getState().load(CTX);
    expect(usePermissionsStore.getState().status).toBe('ready');
    expect(usePermissionsStore.getState().fromSnapshot).toBe(false);
    expect(rememberPermissionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ contextKey: 'c1:b1', granted: ['RETURN.UPLOAD_EVIDENCE'], matrixVersion: 4 }),
    );
  });

  it('sin red usa los últimos permisos conocidos de ese contexto', async () => {
    getMyPermissionsMock.mockRejectedValue(new TypeError('Failed to fetch'));
    recallPermissionsMock.mockResolvedValue({
      contextKey: 'c1:b1',
      granted: ['RETURN.UPLOAD_EVIDENCE'],
      matrixVersion: 4,
      role: null,
    });
    await usePermissionsStore.getState().load(CTX);
    const state = usePermissionsStore.getState();
    expect(state.status).toBe('ready');
    expect(state.fromSnapshot).toBe(true);
    expect(state.granted.has('RETURN.UPLOAD_EVIDENCE')).toBe(true);
  });

  it('sin red y sin copia local deniega todo (deny-by-default)', async () => {
    getMyPermissionsMock.mockRejectedValue(new TypeError('Failed to fetch'));
    recallPermissionsMock.mockResolvedValue(null);
    await usePermissionsStore.getState().load(CTX);
    expect(usePermissionsStore.getState().status).toBe('error');
    expect(usePermissionsStore.getState().granted.size).toBe(0);
  });

  it('un 403 del servidor NO usa la copia local', async () => {
    getMyPermissionsMock.mockRejectedValue(Object.assign(new Error('forbidden'), { status: 403 }));
    recallPermissionsMock.mockResolvedValue({ contextKey: 'c1:b1', granted: ['X.Y'], matrixVersion: 1, role: null });
    await usePermissionsStore.getState().load(CTX);
    expect(usePermissionsStore.getState().status).toBe('error');
    expect(recallPermissionsMock).not.toHaveBeenCalled();
  });
});
