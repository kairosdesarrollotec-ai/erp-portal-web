import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useSessionTimeout, SESSION_EXPIRED_PATH } from './useSessionTimeout';
import { useWorkSession } from './useWorkSession';

const MIN = 60_000;
const signOutMock = vi.fn().mockResolvedValue(undefined);
const navigateMock = vi.fn();
let lastSignInTime: string | undefined;

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('firebase/auth', () => ({ signOut: (...args: unknown[]) => signOutMock(...args) }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { metadata: { lastSignInTime } } }),
}));

function Probe() {
  useSessionTimeout();
  return null;
}

function mount() {
  return render(
    <MemoryRouter>
      <Probe />
    </MemoryRouter>,
  );
}

const roleOf = (key: string | null) => ({ id: 'r1', name: 'Rol', key });

describe('useSessionTimeout (SEC-F3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T10:00:00Z'));
    signOutMock.mockClear();
    navigateMock.mockClear();
    window.localStorage.clear();
    lastSignInTime = new Date(Date.now()).toUTCString();
    useWorkSession.setState({ role: roleOf('FRONT_OFFICE') });
  });
  afterEach(async () => {
    // Desmontar antes de modificar el store: de lo contrario un Probe aun
    // suscrito recibe esta actualizacion fuera de act durante el teardown.
    await act(async () => {
      cleanup();
    });
    vi.useRealTimers();
    await act(async () => {
      useWorkSession.setState({ role: null });
    });
  });

  it('cierra la sesion tras 30 min sin actividad (rol general) y redirige con el aviso', async () => {
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(29 * MIN); });
    expect(signOutMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2 * MIN); });
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(SESSION_EXPIRED_PATH, { replace: true });
    expect(useWorkSession.getState().role).toBeNull();
  });

  it('un rol privilegiado (GERENCIA) se cierra a los 15 min', async () => {
    useWorkSession.setState({ role: roleOf('GERENCIA') });
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(14 * MIN); });
    expect(signOutMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(2 * MIN); });
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('con rol desconocido aplica 15 min (falla cerrado)', async () => {
    useWorkSession.setState({ role: null });
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(16 * MIN); });
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('la actividad del usuario reinicia el contador', async () => {
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(20 * MIN); });
    await act(async () => { window.dispatchEvent(new Event('keydown')); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20 * MIN); });
    expect(signOutMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(11 * MIN); });
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('la actividad en otra pestana (localStorage) evita el cierre', async () => {
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(25 * MIN); });
    await act(async () => { window.localStorage.setItem('kairos.session.lastActivity', String(Date.now())); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20 * MIN); });
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('cierra a las 8 h aunque el usuario siga activo', async () => {
    lastSignInTime = new Date(Date.now() - 8 * 60 * MIN + 5 * MIN).toUTCString();
    mount();
    for (let i = 0; i < 10; i += 1) {
      await act(async () => {
        window.dispatchEvent(new Event('pointerdown'));
        await vi.advanceTimersByTimeAsync(MIN);
      });
    }
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('cierra la sesion una sola vez y navega aunque signOut falle', async () => {
    signOutMock.mockRejectedValueOnce(new Error('offline'));
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(31 * MIN); });
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledTimes(1);
  });
});
