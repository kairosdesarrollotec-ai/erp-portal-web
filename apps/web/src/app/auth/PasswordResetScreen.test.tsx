import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PasswordResetScreen } from './PasswordResetScreen';

const sendPasswordResetEmailMock = vi.fn();

vi.mock('firebase/auth', () => ({
  sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmailMock(...args),
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({}),
}));

function renderScreen() {
  return render(
    <MemoryRouter>
      <PasswordResetScreen />
    </MemoryRouter>,
  );
}

describe('PasswordResetScreen (TR-04, C7)', () => {
  beforeEach(() => {
    sendPasswordResetEmailMock.mockReset().mockResolvedValue(undefined);
  });

  it('renderiza el formulario con campo de correo y enlace para volver al login', () => {
    renderScreen();

    expect(screen.getByRole('heading', { name: 'Recuperar acceso' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar enlace de recuperación' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a iniciar sesión/i })).toBeInTheDocument();
  });

  it('valida que el correo no esté vacío', async () => {
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));

    expect(await screen.findByText('Ingresa tu correo electrónico')).toBeInTheDocument();
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it('valida el formato del correo', async () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'correo-invalido' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));

    expect(await screen.findByText('Ingresa un correo electrónico válido')).toBeInTheDocument();
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it('envía el correo de recuperación exitosamente y muestra la pantalla de confirmación', async () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'operador@veloxrent.pe' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));

    await waitFor(() => {
      expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(expect.anything(), 'operador@veloxrent.pe');
    });

    expect(await screen.findByTestId('reset-success-card')).toBeInTheDocument();
    expect(screen.getByText('Revisa tu correo')).toBeInTheDocument();
    expect(screen.getByText(/Si el correo está registrado, te llegará un enlace de restablecimiento/i)).toBeInTheDocument();
  });

  it('anti-enumeration: muestra la pantalla de confirmación incluso si el correo no existe (auth/user-not-found)', async () => {
    sendPasswordResetEmailMock.mockRejectedValue({ code: 'auth/user-not-found' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'no-existe@veloxrent.pe' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));

    await waitFor(() => {
      expect(sendPasswordResetEmailMock).toHaveBeenCalled();
    });

    // Seguridad: no debe filtrar si el correo existe o no
    expect(await screen.findByTestId('reset-success-card')).toBeInTheDocument();
    expect(screen.getByText('Revisa tu correo')).toBeInTheDocument();
  });

  it('muestra mensaje de reintento si Firebase responde con auth/too-many-requests', async () => {
    sendPasswordResetEmailMock.mockRejectedValue({ code: 'auth/too-many-requests' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'operador@veloxrent.pe' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));

    expect(await screen.findByText(/Demasiados intentos. Espera unos minutos e inténtalo de nuevo./i)).toBeInTheDocument();
  });
});
