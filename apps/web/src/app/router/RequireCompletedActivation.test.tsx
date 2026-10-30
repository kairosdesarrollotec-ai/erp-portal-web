import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireCompletedActivation } from './RequireCompletedActivation';
import { ActivationApiError } from '../auth/activation-client';
import { useOfflineMode } from '../../offline/session/offline-mode';

const getActivationStatusMock = vi.fn();
const readOfflineSnapshotMock = vi.fn();
const markSessionVerifiedMock = vi.fn();
const revokeLocalSessionMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'token' } }),
}));
vi.mock('../auth/activation-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../auth/activation-client')>();
  return { ...original, getActivationStatus: (...args: unknown[]) => getActivationStatusMock(...args) };
});
vi.mock('../../offline/session/offline-session', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../offline/session/offline-session')>();
  return {
    ...original,
    readOfflineSnapshot: () => readOfflineSnapshotMock(),
    markSessionVerified: () => markSessionVerifiedMock(),
  };
});
vi.mock('../../offline/session/revoke-local-session', () => ({
  revokeLocalSession: () => revokeLocalSessionMock(),
}));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/devoluciones/r1/checklist']}>
      <Routes>
        <Route element={<RequireCompletedActivation />}>
          <Route path="/devoluciones/r1/checklist" element={<div>checklist de recepción</div>} />
        </Route>
        <Route path="/" element={<div>login</div>} />
        <Route path="/activar-cuenta" element={<div>activación</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const ACTIVATED = { requiresPasswordChange: false, requiresMfaEnrollment: false };

describe('RequireCompletedActivation · modo sin conexión (V-27, SDD-TRANSVERSAL §17)', () => {
  beforeEach(() => {
    getActivationStatusMock.mockReset();
    readOfflineSnapshotMock.mockReset();
    markSessionVerifiedMock.mockReset().mockResolvedValue(undefined);
    revokeLocalSessionMock.mockReset().mockResolvedValue(undefined);
    useOfflineMode.getState().setActive(false);
  });

  it('con el servidor confirmando la cuenta renderiza la ruta y guarda la verificación', async () => {
    getActivationStatusMock.mockResolvedValue(ACTIVATED);
    renderGuard();
    expect(await screen.findByText('checklist de recepción')).toBeInTheDocument();
    expect(markSessionVerifiedMock).toHaveBeenCalled();
    expect(useOfflineMode.getState().active).toBe(false);
  });

  it('sin red y con una verificación vigente (< 8 h) entra en modo sin conexión', async () => {
    getActivationStatusMock.mockRejectedValue(new TypeError('Failed to fetch'));
    readOfflineSnapshotMock.mockResolvedValue({ verifiedAt: Date.now(), resources: {} });
    renderGuard();
    expect(await screen.findByText('checklist de recepción')).toBeInTheDocument();
    expect(useOfflineMode.getState().active).toBe(true);
  });

  it('sin red y sin verificación vigente sigue bloqueando (no pasa de largo)', async () => {
    getActivationStatusMock.mockRejectedValue(new TypeError('Failed to fetch'));
    readOfflineSnapshotMock.mockResolvedValue(null);
    renderGuard();
    expect(await screen.findByText('No pudimos verificar tu cuenta')).toBeInTheDocument();
    expect(screen.queryByText('checklist de recepción')).not.toBeInTheDocument();
    expect(useOfflineMode.getState().active).toBe(false);
  });

  it('un 5xx del servidor NO activa el modo sin conexión', async () => {
    getActivationStatusMock.mockRejectedValue(new ActivationApiError('boom', 503));
    readOfflineSnapshotMock.mockResolvedValue({ verifiedAt: Date.now(), resources: {} });
    renderGuard();
    expect(await screen.findByText('No pudimos verificar tu cuenta')).toBeInTheDocument();
    expect(readOfflineSnapshotMock).not.toHaveBeenCalled();
  });

  it('un 403 (sesión revocada) bloquea y elimina los datos locales', async () => {
    getActivationStatusMock.mockRejectedValue(new ActivationApiError('revocada', 403));
    readOfflineSnapshotMock.mockResolvedValue({ verifiedAt: Date.now(), resources: {} });
    renderGuard();
    await waitFor(() => expect(revokeLocalSessionMock).toHaveBeenCalled());
    expect(await screen.findByText('login')).toBeInTheDocument();
    expect(useOfflineMode.getState().active).toBe(false);
  });

  it('al volver la conexión reverifica y sale del modo sin conexión', async () => {
    getActivationStatusMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    readOfflineSnapshotMock.mockResolvedValue({ verifiedAt: Date.now(), resources: {} });
    renderGuard();
    await screen.findByText('checklist de recepción');
    expect(useOfflineMode.getState().active).toBe(true);

    getActivationStatusMock.mockResolvedValue(ACTIVATED);
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(useOfflineMode.getState().active).toBe(false));
    expect(screen.getByText('checklist de recepción')).toBeInTheDocument();
  });

  it('al volver la conexión, si el servidor responde 401 se revoca y se elimina lo local', async () => {
    getActivationStatusMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    readOfflineSnapshotMock.mockResolvedValue({ verifiedAt: Date.now(), resources: {} });
    renderGuard();
    await screen.findByText('checklist de recepción');

    getActivationStatusMock.mockRejectedValue(new ActivationApiError('no autorizado', 401));
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(revokeLocalSessionMock).toHaveBeenCalled());
    expect(await screen.findByText('login')).toBeInTheDocument();
  });
});
