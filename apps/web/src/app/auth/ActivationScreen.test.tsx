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
const completeActivationMock = vi.fn();
const getActivationStatusMock = vi.fn();

// enrolledFactors es mutable entre tests para poder simular el escenario de
// "reanudar" con MFA ya enrolado en Firebase (BACKEND_UNAVAILABLE).
let enrolledFactors: unknown[] = [];

vi.mock('firebase/auth', () => ({
  updatePassword: (...args: unknown[]) => updatePasswordMock(...args),
  multiFactor: () => ({
    getSession: getSessionMock,
    enroll: enrollMock,
    get enrolledFactors() {
      return enrolledFactors;
    },
  }),
  TotpMultiFactorGenerator: {
    generateSecret: (...args: unknown[]) => generateSecretMock(...args),
    assertionForEnrollment: (...args: unknown[]) => assertionForEnrollmentMock(...args),
    // Hallazgo alto de revision PR#4: el mock necesita este estatico real
    // para que hasTotpFactor() (useActivation.ts) pueda compararlo contra
    // factorId, igual que en produccion.
    FACTOR_ID: 'totp',
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
  completeActivation: (...args: unknown[]) => completeActivationMock(...args),
  getActivationStatus: (...args: unknown[]) => getActivationStatusMock(...args),
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

async function goToPasswordStep() {
  renderScreen();
  return screen.findByLabelText('Nueva contraseña');
}

describe('ActivationScreen (TR-02)', () => {
  beforeEach(() => {
    enrolledFactors = [];
    updatePasswordMock.mockReset().mockResolvedValue(undefined);
    getSessionMock.mockReset().mockResolvedValue({});
    enrollMock.mockReset().mockResolvedValue(undefined);
    generateSecretMock.mockReset().mockResolvedValue({
      generateQrCodeUrl: generateQrCodeUrlMock,
    });
    assertionForEnrollmentMock.mockReset().mockReturnValue({});
    completeActivationMock.mockReset().mockResolvedValue(undefined);
    // Por defecto, el backend ya no exige cambio de contrasena - preserva
    // el comportamiento de los tests preexistentes que reanudan directo a
    // completeActivation cuando ya hay TOTP enrolado.
    getActivationStatusMock.mockReset().mockResolvedValue({
      requiresPasswordChange: false,
      requiresMfaEnrollment: false,
    });
  });

  it('paso 1: mantiene "Continuar" deshabilitado hasta cumplir los 3 requisitos de contraseña', async () => {
    await goToPasswordStep();

    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'abcdefgh' },
    });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'Abcdefg1' },
    });
    expect(continueButton).toBeDisabled();
  });

  it('paso 1: mantiene "Continuar" deshabilitado si las contraseñas no coinciden, aunque cumplan los 3 requisitos', async () => {
    await goToPasswordStep();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'Abcdefg1' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'Abcdefg2' },
    });

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'Abcdefg1' },
    });

    expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled();
  });

  it('paso 1 -> paso 2: al continuar, cambia la contraseña en Firebase y avanza al QR + codigo', async () => {
    await goToPasswordStep();

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

  it('paso 2: agrupa el codigo con fieldset/legend y marca aria-invalid + aria-describedby cuando es invalido', async () => {
    enrollMock.mockRejectedValue({ code: 'auth/invalid-verification-code' });
    await goToPasswordStep();

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'Abcdefg1' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'Abcdefg1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByText('Protege tu cuenta');

    expect(screen.getByRole('group', { name: 'Código de 6 dígitos' })).toBeInTheDocument();

    const digitInputs = screen.getAllByRole('textbox');
    digitInputs.forEach((input, i) => {
      fireEvent.change(input, { target: { value: String((i + 1) % 10) } });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Activar cuenta' }));

    const errorMessage = await screen.findByText(/Código incorrecto o expirado/);
    expect(errorMessage).toHaveAttribute('id');

    const firstDigit = screen.getAllByRole('textbox')[0];
    expect(firstDigit).toHaveAttribute('aria-invalid', 'true');
    expect(firstDigit).toHaveAttribute('aria-describedby', errorMessage.getAttribute('id'));
  });

  it('paso 2: si completar la activacion falla tras enrolar, muestra un panel de reintento en vez de error de codigo invalido', async () => {
    completeActivationMock.mockRejectedValueOnce(new Error('backend caido'));
    await goToPasswordStep();

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

    expect(
      await screen.findByText(/no pudimos confirmarlo con el servidor/i),
    ).toBeInTheDocument();
    expect(enrollMock).toHaveBeenCalledTimes(1);

    completeActivationMock.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(completeActivationMock).toHaveBeenCalledTimes(2));
    // No se repite el enrolamiento MFA al reintentar solo la confirmacion.
    expect(enrollMock).toHaveBeenCalledTimes(1);
  });

  it('retoma en el paso MFA si Firebase ya tiene un factor TOTP enrolado (recarga a mitad del flujo)', async () => {
    enrolledFactors = [{ factorId: 'totp' }];
    renderScreen();

    await waitFor(() => expect(completeActivationMock).toHaveBeenCalledTimes(1));
  });

  /**
   * Hallazgo alto de revalidacion PR#4 ("la reanudacion puede omitir el
   * cambio obligatorio de contrasena"): TOTP ya enrolado en Firebase +
   * backend todavia exigiendo cambio de contrasena -> se queda en
   * PASSWORD, nunca llama completeActivation.
   */
  it('con TOTP ya enrolado pero requiresPasswordChange=true, permanece en el paso de contraseña sin completar la activacion', async () => {
    enrolledFactors = [{ factorId: 'totp' }];
    getActivationStatusMock.mockResolvedValue({
      requiresPasswordChange: true,
      requiresMfaEnrollment: false,
    });
    renderScreen();

    await screen.findByLabelText('Nueva contraseña');
    expect(completeActivationMock).not.toHaveBeenCalled();
  });

  it('con TOTP ya enrolado y requiresPasswordChange=false, completa la activacion y navega', async () => {
    enrolledFactors = [{ factorId: 'totp' }];
    getActivationStatusMock.mockResolvedValue({
      requiresPasswordChange: false,
      requiresMfaEnrollment: false,
    });
    renderScreen();

    await waitFor(() => expect(completeActivationMock).toHaveBeenCalledTimes(1));
  });

  it('si consultar el estado de activacion falla (backend caido) con TOTP ya enrolado, muestra el panel de reintento', async () => {
    enrolledFactors = [{ factorId: 'totp' }];
    getActivationStatusMock.mockRejectedValue(new Error('backend caido'));
    renderScreen();

    expect(
      await screen.findByText(/no pudimos confirmarlo con el servidor/i),
    ).toBeInTheDocument();
    expect(completeActivationMock).not.toHaveBeenCalled();
  });

  /**
   * Hallazgo alto de revision PR#4 ("el flujo acepta cualquier factor MFA
   * como si fuera TOTP"): con 0 factores enrolados, retoma en el paso de
   * contraseña (READY), nunca salta directo a completeActivation.
   */
  it('con 0 factores enrolados, retoma en READY (paso contraseña) sin llamar completeActivation', async () => {
    enrolledFactors = [];
    renderScreen();

    await screen.findByLabelText('Nueva contraseña');
    expect(completeActivationMock).not.toHaveBeenCalled();
  });

  it('con un factor MFA no-TOTP enrolado, NO lo trata como TOTP ya enrolado y retoma en READY', async () => {
    enrolledFactors = [{ factorId: 'phone' }];
    renderScreen();

    await screen.findByLabelText('Nueva contraseña');
    expect(completeActivationMock).not.toHaveBeenCalled();
  });

  it('al confirmar el codigo, si el unico factor enrolado no es TOTP, igual enrola TOTP (no lo salta)', async () => {
    enrolledFactors = [{ factorId: 'phone' }];
    await goToPasswordStep();

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

    await waitFor(() => expect(enrollMock).toHaveBeenCalledTimes(1));
    expect(completeActivationMock).toHaveBeenCalledTimes(1);
  });
});
