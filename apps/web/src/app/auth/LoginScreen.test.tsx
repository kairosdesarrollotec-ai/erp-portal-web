import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginScreen } from './LoginScreen';

const signInMock = vi.fn();
const getActivationStatusMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInMock(...args),
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({}),
}));

vi.mock('./audit-client', () => ({
  recordLoginAttempt: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./activation-client', () => ({
  getActivationStatus: (...args: unknown[]) => getActivationStatusMock(...args),
}));

function mockSuccessfulSignIn() {
  signInMock.mockResolvedValue({
    user: { getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  });
}

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
    getActivationStatusMock.mockReset();
    navigateMock.mockReset();
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

  it('navega al tablero solo cuando el backend confirma de forma expresa que no hay activacion pendiente', async () => {
    mockSuccessfulSignIn();
    getActivationStatusMock.mockResolvedValue({
      requiresPasswordChange: false,
      requiresMfaEnrollment: false,
    });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Abcdefg1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/tablero'));
  });

  it('NO navega al tablero (fail-closed) si el chequeo de activacion falla - muestra un estado bloqueante y reintentable', async () => {
    mockSuccessfulSignIn();
    getActivationStatusMock.mockRejectedValueOnce(new Error('servicio de perfiles caido'));
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Abcdefg1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('No pudimos verificar tu cuenta')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith('/tablero');

    getActivationStatusMock.mockResolvedValueOnce({
      requiresPasswordChange: false,
      requiresMfaEnrollment: false,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/tablero'));
    // El reintento reutiliza la sesion ya autenticada - no vuelve a llamar a Firebase.
    expect(signInMock).toHaveBeenCalledTimes(1);
  });
});
