import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MfaStepUpCancelledError, useMfaStepUp } from './useMfaStepUp';

const reauthMock = vi.fn();
const resolveSignInMock = vi.fn();
const getIdTokenMock = vi.fn();
const assertionMock = vi.fn((..._args: unknown[]) => 'assertion');
let hints: Array<{ uid: string; factorId: string }> = [];
let currentUser: unknown;

vi.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: (email: string, password: string) => ({ email, password }) },
  reauthenticateWithCredential: (...args: unknown[]) => reauthMock(...args),
  getMultiFactorResolver: () => ({ hints, resolveSignIn: (...a: unknown[]) => resolveSignInMock(...a) }),
  TotpMultiFactorGenerator: { FACTOR_ID: 'totp', assertionForSignIn: (...a: unknown[]) => assertionMock(...a) },
}));
vi.mock('../providers/firebase', () => ({ getFirebaseAuth: () => ({ currentUser }) }));

const MFA_ERROR = { code: 'auth/multi-factor-auth-required' };

describe('useMfaStepUp (SEC-F4: reautenticacion con MFA)', () => {
  beforeEach(() => {
    reauthMock.mockReset().mockRejectedValue(MFA_ERROR);
    resolveSignInMock.mockReset().mockResolvedValue({});
    assertionMock.mockClear();
    getIdTokenMock.mockReset().mockResolvedValue('fresh-token');
    hints = [{ uid: 'totp-uid', factorId: 'totp' }];
    currentUser = { email: 'admin@veloxrent.pe', getIdToken: getIdTokenMock };
  });

  it('reautentica con contrasena + TOTP y entrega un token renovado (forceRefresh)', async () => {
    const { result } = renderHook(() => useMfaStepUp());
    let promise!: Promise<string>;
    act(() => {
      promise = result.current.request();
    });
    expect(result.current.challenge.isOpen).toBe(true);
    expect(result.current.challenge.requirePassword).toBe(true);

    await act(async () => {
      await result.current.challenge.onConfirm('123456', 'secreto');
    });

    await expect(promise).resolves.toBe('fresh-token');
    expect(assertionMock).toHaveBeenCalledWith('totp-uid', '123456');
    expect(getIdTokenMock).toHaveBeenCalledWith(true);
    expect(result.current.challenge.isOpen).toBe(false);
  });

  it('contrasena incorrecta: error recuperable INVALID_CREDENTIALS y no entrega token', async () => {
    reauthMock.mockRejectedValue({ code: 'auth/invalid-credential' });
    const { result } = renderHook(() => useMfaStepUp());
    act(() => {
      void result.current.request().catch(() => undefined);
    });
    await act(async () => {
      await result.current.challenge.onConfirm('123456', 'mala');
    });
    expect(result.current.challenge.state).toBe('INVALID_CREDENTIALS');
    expect(result.current.challenge.isOpen).toBe(true);
    expect(resolveSignInMock).not.toHaveBeenCalled();
    expect(getIdTokenMock).not.toHaveBeenCalled();
  });

  it('codigo TOTP invalido: RECOVERABLE_ERROR y no entrega token', async () => {
    resolveSignInMock.mockRejectedValue({ code: 'auth/invalid-verification-code' });
    const { result } = renderHook(() => useMfaStepUp());
    act(() => {
      void result.current.request().catch(() => undefined);
    });
    await act(async () => {
      await result.current.challenge.onConfirm('000000', 'secreto');
    });
    expect(result.current.challenge.state).toBe('RECOVERABLE_ERROR');
    expect(getIdTokenMock).not.toHaveBeenCalled();
  });

  it('cuenta sin MFA enrolado (reautentica sin segundo factor): UNSUPPORTED_FACTOR, falla cerrado', async () => {
    reauthMock.mockResolvedValue({});
    const { result } = renderHook(() => useMfaStepUp());
    act(() => {
      void result.current.request().catch(() => undefined);
    });
    await act(async () => {
      await result.current.challenge.onConfirm('123456', 'secreto');
    });
    expect(result.current.challenge.state).toBe('UNSUPPORTED_FACTOR');
    expect(getIdTokenMock).not.toHaveBeenCalled();
  });

  it('sin hint TOTP: UNSUPPORTED_FACTOR', async () => {
    hints = [{ uid: 'sms', factorId: 'phone' }];
    const { result } = renderHook(() => useMfaStepUp());
    act(() => {
      void result.current.request().catch(() => undefined);
    });
    await act(async () => {
      await result.current.challenge.onConfirm('123456', 'secreto');
    });
    expect(result.current.challenge.state).toBe('UNSUPPORTED_FACTOR');
  });

  it('error de red no se presenta como codigo incorrecto', async () => {
    reauthMock.mockRejectedValue({ code: 'auth/network-request-failed' });
    const { result } = renderHook(() => useMfaStepUp());
    act(() => {
      void result.current.request().catch(() => undefined);
    });
    await act(async () => {
      await result.current.challenge.onConfirm('123456', 'secreto');
    });
    expect(result.current.challenge.state).toBe('VERIFICATION_UNAVAILABLE');
  });

  it('sin sesion de Firebase: SESSION_EXPIRED', async () => {
    currentUser = null;
    const { result } = renderHook(() => useMfaStepUp());
    act(() => {
      void result.current.request().catch(() => undefined);
    });
    await act(async () => {
      await result.current.challenge.onConfirm('123456', 'secreto');
    });
    expect(result.current.challenge.state).toBe('SESSION_EXPIRED');
  });

  it('cancelar rechaza la promesa: la accion original no se ejecuta', async () => {
    const { result } = renderHook(() => useMfaStepUp());
    let promise!: Promise<string>;
    act(() => {
      promise = result.current.request();
    });
    const assertion = expect(promise).rejects.toBeInstanceOf(MfaStepUpCancelledError);
    act(() => result.current.challenge.onCancel());
    await assertion;
    await waitFor(() => expect(result.current.challenge.isOpen).toBe(false));
  });
});
