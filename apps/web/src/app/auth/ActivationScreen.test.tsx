import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActivationScreen } from './ActivationScreen';

const updatePasswordMock = vi.fn();
const getSessionMock = vi.fn();
const enrollMock = vi.fn();
const generateSecretMock = vi.fn();
const assertionForEnrollmentMock = vi.fn();
const generateQrCodeUrlMock = vi.fn(() => 'otpauth://totp/VeloxRent:user@veloxrent.pe');

vi.mock('firebase/auth', () => ({
  updatePassword: (...args: unknown[]) => updatePasswordMock(...args),
  multiFactor: () => ({ getSession: getSessionMock, enroll: enrollMock }),
  TotpMultiFactorGenerator: {
    generateSecret: (...args: unknown[]) => generateSecretMock(...args),
    assertionForEnrollment: (...args: unknown[]) => assertionForEnrollmentMock(...args),
  },
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      email: 'user@veloxrent.pe',
      getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
    },
  }),
}));

vi.mock('./activation-client', () => ({
  completeActivation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fake') },
}));

function renderScreen() {
  return render(
    <MemoryRouter>
      <ActivationScreen />
    </MemoryRouter>,
  );
}

describe('ActivationScreen (TR-02)', () => {
  beforeEach(() => {
    updatePasswordMock.mockReset().mockResolvedValue(undefined);
    getSessionMock.mockReset().mockResolvedValue({});
    enrollMock.mockReset().mockResolvedValue(undefined);
    generateSecretMock.mockReset().mockResolvedValue({
      generateQrCodeUrl: generateQrCodeUrlMock,
    });
    assertionForEnrollmentMock.mockReset().mockReturnValue({});
  });

  it('paso 1: mantiene "Continuar" deshabilitado hasta cumplir los 3 requisitos de contraseña', () => {
    renderScreen();

    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'abcdefgh' },
    });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'Abcdefg1' },
    });
    expect(continueButton).not.toBeDisabled();
  });

  it('paso 1 -> paso 2: al continuar, cambia la contraseña en Firebase y avanza al QR + codigo', async () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'Abcdefg1' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'Abcdefg1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Protege tu cuenta')).toBeInTheDocument();
    expect(updatePasswordMock).toHaveBeenCalledWith(expect.anything(), 'Abcdefg1');
    expect(screen.getByText(/Escanea este código/)).toBeInTheDocument();
  });

  it('paso 2: muestra el error de codigo incorrecto (RECOVERABLE_ERROR) si el enrolamiento falla', async () => {
    enrollMock.mockRejectedValue({ code: 'auth/invalid-verification-code' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'Abcdefg1' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'Abcdefg1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByText('Protege tu cuenta');

    const digitInputs = screen.getAllByRole('textbox');
    digitInputs.forEach((input, i) => {
      fireEvent.change(input, { target: { value: String((i + 1) % 10) } });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Activar cuenta' }));

    await waitFor(() =>
      expect(
        screen.getByText(/Código incorrecto o expirado/),
      ).toBeInTheDocument(),
    );
  });
});
