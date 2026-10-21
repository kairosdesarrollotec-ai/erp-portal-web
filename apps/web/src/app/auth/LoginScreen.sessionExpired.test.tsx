import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginScreen } from './LoginScreen';

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  getMultiFactorResolver: vi.fn(),
  TotpMultiFactorGenerator: { FACTOR_ID: 'totp', assertionForSignIn: vi.fn() },
}));
vi.mock('../providers/firebase', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('./audit-client', () => ({ recordLoginAttempt: vi.fn() }));
vi.mock('./activation-client', () => ({ getActivationStatus: vi.fn() }));
vi.mock('./work-context-client', () => ({ getWorkContextAssignments: vi.fn(), selectWorkContext: vi.fn() }));

describe('LoginScreen - aviso de sesion expirada (SEC-F3 / TR-10)', () => {
  it('muestra el aviso con ?motivo=sesion-expirada', () => {
    render(
      <MemoryRouter initialEntries={['/?motivo=sesion-expirada']}>
        <LoginScreen />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Tu sesión expiró');
  });

  it('no muestra el aviso en un acceso normal', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LoginScreen />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Tu sesión expiró/)).toBeNull();
  });
});
