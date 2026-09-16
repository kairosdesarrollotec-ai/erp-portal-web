import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginScreen } from './LoginScreen';

const signInMock = vi.fn();
const resolveSignInMock = vi.fn();
const assertionForSignInMock = vi.fn((..._args: unknown[]) => 'mock-assertion');

const mfaResolver = {
  hints: [{ uid: 'totp-factor-uid' }],
  resolveSignIn: (...args: unknown[]) => resolveSignInMock(...args),
};

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInMock(...args),
  getMultiFactorResolver: () => mfaResolver,
  TotpMultiFactorGenerator: {
    assertionForSignIn: (...args: unknown[]) => assertionForSignInMock(...args),
  },
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({}),
}));

vi.mock('./audit-client', () => ({
  recordLoginAttempt: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./activation-client', () => ({
  getActivationStatus: vi.fn().mockRejectedValue(new Error('offline')),
}));

function renderScreen() {
  return render(
    <MemoryRouter>
      <LoginScreen />
    </MemoryRouter>,
  );
}

describe('LoginScreen (TR-01)', () => {
  beforeEach(() => {
    signInMock.mockReset();
    resolveSignInMock.mockReset();
    assertionForSignInMock.mockClear();
  });

  it('muestra el banner "Correo o contraseña incorrectos" (RECOVERABLE_ERROR) sin revelar si el correo existe, y conserva los campos', async () => {
    signInMock.mockRejectedValue({ code: 'auth/invalid-credential' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
    expect(screen.getByLabelText('Correo o usuario')).toHaveValue('user@veloxrent.pe');
  });

  it('reemplaza el formulario por la pantalla completa de cuenta bloqueada (BLOCKING_ERROR)', async () => {
    signInMock.mockRejectedValue({ code: 'auth/user-disabled' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Tu cuenta está bloqueada')).toBeInTheDocument();
    expect(screen.getByText('Contacta a tu administrador para reactivarla')).toBeInTheDocument();
    // El formulario ya no existe en este estado (pantalla completa, no un mensaje inline).
    expect(screen.queryByLabelText('Correo o usuario')).not.toBeInTheDocument();
  });

  it('valida campos obligatorios sin llamar a Firebase', async () => {
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Ingresa tu correo o usuario')).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('muestra el icono para alternar visibilidad de la contraseña', () => {
    renderScreen();
    expect(screen.getByLabelText('Mostrar contraseña')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Mostrar contraseña'));
    expect(screen.getByLabelText('Ocultar contraseña')).toBeInTheDocument();
  });

  it('TR-03: abre el reto MFA cuando Firebase exige el segundo factor, en vez de mostrar error de credenciales', async () => {
    signInMock.mockRejectedValue({ code: 'auth/multi-factor-auth-required' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('dialog', { name: 'Confirma tu identidad' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('TR-03: confirma el codigo TOTP y completa el segundo factor del login', async () => {
    signInMock.mockRejectedValue({ code: 'auth/multi-factor-auth-required' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    await screen.findByRole('dialog', { name: 'Confirma tu identidad' });

    resolveSignInMock.mockResolvedValue({ user: { email: 'user@veloxrent.pe' } });
    '123456'.split('').forEach((digit, index) => {
      fireEvent.change(screen.getByTestId(`mfa-digit-desktop-${index}`), { target: { value: digit } });
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Confirmar/ })[0]);

    await waitFor(() => {
      expect(resolveSignInMock).toHaveBeenCalledWith('mock-assertion');
    });
    expect(assertionForSignInMock).toHaveBeenCalledWith('totp-factor-uid', '123456');
  });

  it('TR-03: "Cancelar" cierra el reto MFA y vuelve al formulario de login', async () => {
    signInMock.mockRejectedValue({ code: 'auth/multi-factor-auth-required' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    await screen.findByRole('dialog', { name: 'Confirma tu identidad' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' })[0]);

    expect(screen.queryByRole('dialog', { name: 'Confirma tu identidad' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Correo o usuario')).toBeInTheDocument();
    expect(resolveSignInMock).not.toHaveBeenCalled();
  });

  it('TR-03: muestra error recuperable con un codigo TOTP invalido, sin cerrar el reto', async () => {
    signInMock.mockRejectedValue({ code: 'auth/multi-factor-auth-required' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    await screen.findByRole('dialog', { name: 'Confirma tu identidad' });

    resolveSignInMock.mockRejectedValue({ code: 'auth/invalid-verification-code' });
    '000000'.split('').forEach((digit, index) => {
      fireEvent.change(screen.getByTestId(`mfa-digit-desktop-${index}`), { target: { value: digit } });
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Confirmar/ })[0]);

    expect(
      await screen.findAllByText(/Código incorrecto o expirado/),
    ).not.toHaveLength(0);
    expect(screen.getByRole('dialog', { name: 'Confirma tu identidad' })).toBeInTheDocument();
  });
});
