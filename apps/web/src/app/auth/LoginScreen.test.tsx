import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginScreen } from './LoginScreen';

const signInMock = vi.fn();

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInMock(...args),
}));

vi.mock('../providers/firebase', () => ({
  firebaseAuth: {},
}));

vi.mock('./audit-client', () => ({
  recordLoginAttempt: vi.fn().mockResolvedValue(undefined),
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
  });

  it('muestra "Credenciales invalidas" (RECOVERABLE_ERROR) sin revelar si el correo existe', async () => {
    signInMock.mockRejectedValue({ code: 'auth/invalid-credential' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contrasena'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales invalidas');
  });

  it('muestra "Cuenta bloqueada" (BLOCKING_ERROR) y deshabilita el formulario', async () => {
    signInMock.mockRejectedValue({ code: 'auth/user-disabled' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contrasena'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cuenta bloqueada, contacta a tu administrador',
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ingresar' })).toBeDisabled();
    });
  });

  it('valida campos obligatorios sin llamar a Firebase', async () => {
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Ingresa tu correo o usuario')).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });
});
