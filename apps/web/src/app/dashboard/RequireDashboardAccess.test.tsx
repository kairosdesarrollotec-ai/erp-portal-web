import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireDashboardAccess } from './RequireDashboardAccess';

const onAuthStateChangedMock = vi.fn();
const getActivationStatusMock = vi.fn();

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => onAuthStateChangedMock(...args),
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({}),
}));

vi.mock('../auth/activation-client', () => ({
  getActivationStatus: (...args: unknown[]) => getActivationStatusMock(...args),
}));

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/tablero']}>
      <Routes>
        <Route
          path="/tablero"
          element={
            <RequireDashboardAccess>
              <p>Tablero</p>
            </RequireDashboardAccess>
          }
        />
        <Route path="/" element={<p>Pantalla de login</p>} />
        <Route path="/activar-cuenta" element={<p>Activar cuenta</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const user = { uid: 'user-1', getIdToken: vi.fn().mockResolvedValue('fake-id-token') };

describe('RequireDashboardAccess (finding #3)', () => {
  beforeEach(() => {
    onAuthStateChangedMock.mockReset();
    getActivationStatusMock.mockReset();
  });

  it('sin sesion (acceso directo por URL), redirige a login y nunca monta el tablero', async () => {
    onAuthStateChangedMock.mockImplementation((_auth, callback: (u: unknown) => void) => {
      callback(null);
      return () => {};
    });

    renderGuarded();

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
    expect(screen.queryByText('Tablero')).not.toBeInTheDocument();
  });

  it('con sesion pero activacion incompleta, redirige a /activar-cuenta en vez de mostrar el tablero', async () => {
    onAuthStateChangedMock.mockImplementation((_auth, callback: (u: unknown) => void) => {
      callback(user);
      return () => {};
    });
    getActivationStatusMock.mockResolvedValue({ requiresPasswordChange: true, requiresMfaEnrollment: false });

    renderGuarded();

    expect(await screen.findByText('Activar cuenta')).toBeInTheDocument();
    expect(screen.queryByText('Tablero')).not.toBeInTheDocument();
  });

  it('con sesion y activacion completa, muestra el tablero', async () => {
    onAuthStateChangedMock.mockImplementation((_auth, callback: (u: unknown) => void) => {
      callback(user);
      return () => {};
    });
    getActivationStatusMock.mockResolvedValue({ requiresPasswordChange: false, requiresMfaEnrollment: false });

    renderGuarded();

    expect(await screen.findByText('Tablero')).toBeInTheDocument();
  });

  it('si el chequeo de activacion falla (red/backend), no bloquea el acceso (fail-open, mismo criterio que useLogin.ts)', async () => {
    onAuthStateChangedMock.mockImplementation((_auth, callback: (u: unknown) => void) => {
      callback(user);
      return () => {};
    });
    getActivationStatusMock.mockRejectedValue(new Error('offline'));

    renderGuarded();

    expect(await screen.findByText('Tablero')).toBeInTheDocument();
  });
});
