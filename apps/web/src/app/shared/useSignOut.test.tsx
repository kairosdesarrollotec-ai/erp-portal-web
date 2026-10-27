import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const signOutMock = vi.fn().mockResolvedValue(undefined);
const clearSession = vi.fn();
const permissionsReset = vi.fn();
const countPending = vi.fn();
const discardKeys = vi.fn().mockResolvedValue(undefined);
const purge = vi.fn().mockResolvedValue(undefined);

vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('firebase/auth', () => ({ signOut: (...a: unknown[]) => signOutMock(...a) }));
vi.mock('../providers/firebase', () => ({ getFirebaseAuth: () => ({ currentUser: { uid: 'usr-1' } }) }));
vi.mock('./useWorkSession', () => ({
  useWorkSession: (selector: (s: { clearSession: () => void }) => unknown) => selector({ clearSession }),
}));
vi.mock('./usePermissions', () => ({ usePermissionsStore: { getState: () => ({ reset: permissionsReset }) } }));
vi.mock('../../offline/crypto/local-encryption', () => ({
  countPendingUnsyncedItems: (...a: unknown[]) => countPending(...a),
  discardUserCryptoKeys: (...a: unknown[]) => discardKeys(...a),
}));
vi.mock('../../offline/crypto/sealed-store', () => ({ purgeLocalSensitiveData: (...a: unknown[]) => purge(...a) }));

import { describePendingOnSignOut, useSignOut } from './useSignOut';

describe('useSignOut — cierre de sesión con datos offline (SDD-00 §17.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('sin pendientes: cierra sesión sin preguntar, borra datos y descarta la clave', async () => {
    countPending.mockResolvedValue({ total: 0, evidence: 0, fieldEdits: 0, attendance: 0 });
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { result } = renderHook(() => useSignOut());

    await result.current();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(purge).toHaveBeenCalled();
    expect(discardKeys).toHaveBeenCalledWith('usr-1');
    expect(signOutMock).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('con pendientes y el usuario cancela: no borra nada ni cierra sesión', async () => {
    countPending.mockResolvedValue({ total: 3, evidence: 1, fieldEdits: 1, attendance: 1 });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result } = renderHook(() => useSignOut());

    await result.current();

    expect(purge).not.toHaveBeenCalled();
    expect(discardKeys).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('con pendientes y el usuario confirma: avisa qué se perderá, luego borra y cierra sesión', async () => {
    countPending.mockResolvedValue({ total: 2, evidence: 0, fieldEdits: 0, attendance: 2 });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { result } = renderHook(() => useSignOut());

    await result.current();

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('2 marca(s) de asistencia'));
    expect(purge).toHaveBeenCalled();
    expect(discardKeys).toHaveBeenCalledWith('usr-1');
    expect(signOutMock).toHaveBeenCalled();
  });

  it('el texto del aviso lista cada tipo de dato pendiente', () => {
    const text = describePendingOnSignOut({ evidence: 2, fieldEdits: 3, attendance: 1 });
    expect(text).toContain('1 marca(s) de asistencia');
    expect(text).toContain('2 foto(s) o video(s) sin subir');
    expect(text).toContain('3 dato(s) de checklist sin enviar');
  });
});
