import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { can, permissionKey, usePermissions, usePermissionsStore } from './usePermissions';
import { useWorkSession } from './useWorkSession';
import { clearPermissions, roleRef } from '../../test/permissions';

const getMyPermissionsMock = vi.fn();
const getIdTokenMock = vi.fn();
let currentUser: { getIdToken: () => Promise<string> } | null = null;

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser }),
}));

vi.mock('./my-permissions-client', () => ({
  getMyPermissions: (...args: unknown[]) => getMyPermissionsMock(...args),
}));

const RESPONSE = {
  role: roleRef(null, 'Supervisor de incidencias'),
  matrixVersion: 7,
  permissions: [
    { module: 'INCIDENT', action: 'VIEW' },
    { module: 'RESERVATION', action: 'READ_LIST' },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  clearPermissions();
  getMyPermissionsMock.mockReset();
  getIdTokenMock.mockReset().mockResolvedValue('fake-id-token');
  currentUser = { getIdToken: getIdTokenMock };
});

describe('can (funcion pura)', () => {
  it('evalua module.action contra un conjunto de permisos concedidos', () => {
    const granted = new Set([permissionKey('INCIDENT', 'VIEW')]);
    expect(can(granted, 'INCIDENT', 'VIEW')).toBe(true);
    expect(can(granted, 'INCIDENT', 'CREATE')).toBe(false);
    expect(can(granted, 'RESERVATION', 'VIEW')).toBe(false);
  });

  it('acepta tambien la lista cruda de /me/permissions', () => {
    const list = [{ module: 'ADMIN' as const, action: 'MANAGE_USERS' }];
    expect(can(list, 'ADMIN', 'MANAGE_USERS')).toBe(true);
    expect(can(list, 'ADMIN', 'VIEW_AUDIT')).toBe(false);
  });
});

describe('usePermissions (store alimentado por GET /me/permissions)', () => {
  it('estado inicial idle: no concede nada', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.status).toBe('idle');
    expect(result.current.ready).toBe(false);
    expect(result.current.can('INCIDENT', 'VIEW')).toBe(false);
  });

  it('mientras carga (loading) no concede acciones restringidas y al terminar (ready) concede las recibidas', async () => {
    const pending = deferred<typeof RESPONSE>();
    getMyPermissionsMock.mockReturnValue(pending.promise);
    const { result } = renderHook(() => usePermissions());

    let loading!: Promise<void>;
    act(() => {
      loading = usePermissionsStore.getState().load({ companyId: 'c1', branchId: 'b1' });
    });
    expect(result.current.status).toBe('loading');
    expect(result.current.can('INCIDENT', 'VIEW')).toBe(false);

    await act(async () => {
      pending.resolve(RESPONSE);
      await loading;
    });
    expect(getMyPermissionsMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
    expect(result.current.status).toBe('ready');
    expect(result.current.matrixVersion).toBe(7);
    expect(result.current.can('INCIDENT', 'VIEW')).toBe(true);
    expect(result.current.can('INCIDENT', 'CREATE')).toBe(false);
  });

  it('guarda el nombre visible del rol en la sesion', async () => {
    getMyPermissionsMock.mockResolvedValue(RESPONSE);
    await act(async () => {
      await usePermissionsStore.getState().load({ companyId: 'c1', branchId: 'b1' });
    });
    expect(useWorkSession.getState().role).toEqual(RESPONSE.role);
  });

  it('un error de carga deniega todo (deny-by-default) y se puede reintentar', async () => {
    getMyPermissionsMock.mockRejectedValueOnce(new Error('403'));
    const { result } = renderHook(() => usePermissions());
    await act(async () => {
      await usePermissionsStore.getState().load({ companyId: 'c1', branchId: 'b1' });
    });
    expect(result.current.status).toBe('error');
    expect(result.current.can('INCIDENT', 'VIEW')).toBe(false);

    getMyPermissionsMock.mockResolvedValueOnce(RESPONSE);
    await act(async () => {
      await usePermissionsStore.getState().load({ companyId: 'c1', branchId: 'b1' });
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.can('INCIDENT', 'VIEW')).toBe(true);
  });

  it('sin usuario autenticado queda en error', async () => {
    currentUser = null;
    await act(async () => {
      await usePermissionsStore.getState().load({ companyId: 'c1', branchId: 'b1' });
    });
    expect(usePermissionsStore.getState().status).toBe('error');
    expect(getMyPermissionsMock).not.toHaveBeenCalled();
  });

  it('no repite la llamada para el mismo contexto, salvo force', async () => {
    getMyPermissionsMock.mockResolvedValue(RESPONSE);
    const { load } = usePermissionsStore.getState();
    await act(async () => {
      await load({ companyId: 'c1', branchId: 'b1' });
      await load({ companyId: 'c1', branchId: 'b1' });
    });
    expect(getMyPermissionsMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await load({ companyId: 'c1', branchId: 'b1' }, { force: true });
    });
    expect(getMyPermissionsMock).toHaveBeenCalledTimes(2);
  });

  it('al cambiar de empresa/sede vacia los permisos y recarga; una respuesta tardia del contexto anterior se descarta', async () => {
    const first = deferred<typeof RESPONSE>();
    const second = deferred<typeof RESPONSE>();
    getMyPermissionsMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => usePermissions());

    let p1!: Promise<void>;
    let p2!: Promise<void>;
    act(() => {
      p1 = usePermissionsStore.getState().load({ companyId: 'c1', branchId: 'b1' });
    });
    act(() => {
      p2 = usePermissionsStore.getState().load({ companyId: 'c2', branchId: 'b2' });
    });
    expect(result.current.status).toBe('loading');

    await act(async () => {
      second.resolve({ ...RESPONSE, permissions: [{ module: 'ADMIN', action: 'VIEW_AUDIT' }] });
      await p2;
    });
    await act(async () => {
      first.resolve(RESPONSE);
      await p1;
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.can('ADMIN', 'VIEW_AUDIT')).toBe(true);
    expect(result.current.can('INCIDENT', 'VIEW')).toBe(false);
    expect(usePermissionsStore.getState().contextKey).toBe('c2:b2');
  });

  it('reset (cerrar sesion) vuelve a idle y descarta una carga en vuelo', async () => {
    const pending = deferred<typeof RESPONSE>();
    getMyPermissionsMock.mockReturnValue(pending.promise);
    let loading!: Promise<void>;
    act(() => {
      loading = usePermissionsStore.getState().load({ companyId: 'c1', branchId: 'b1' });
    });
    act(() => usePermissionsStore.getState().reset());
    await act(async () => {
      pending.resolve(RESPONSE);
      await loading;
    });
    expect(usePermissionsStore.getState().status).toBe('idle');
    expect(usePermissionsStore.getState().granted.size).toBe(0);
  });
});
