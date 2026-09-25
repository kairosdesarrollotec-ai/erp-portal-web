import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { ActivationScreen } from './ActivationScreen';

/**
 * Hallazgo MEDIO de revalidacion PR#4 ("CI y trazabilidad siguen
 * incompletos"): faltaba evidencia automatizada de accesibilidad (axe)
 * sobre las pantallas del flujo. Cubre los dos pasos con prototipo propio
 * (PASSWORD y MFA/QR) - RECOVERABLE_ERROR y BACKEND_UNAVAILABLE quedan
 * fuera de este archivo porque no cambian la estructura semantica base,
 * solo agregan una alerta ya cubierta por aria-describedby/role="alert"
 * (ver ActivationScreen.test.tsx).
 */

vi.mock('firebase/auth', () => ({
  updatePassword: vi.fn().mockResolvedValue(undefined),
  multiFactor: () => ({
    getSession: vi.fn().mockResolvedValue({}),
    enroll: vi.fn(),
    enrolledFactors: [] as unknown[],
  }),
  TotpMultiFactorGenerator: {
    generateSecret: vi.fn().mockResolvedValue({
      generateQrCodeUrl: () => 'otpauth://totp/VeloxRent:user@veloxrent.pe',
      secretKey: 'ABCD1234',
    }),
    assertionForEnrollment: vi.fn(),
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
  completeActivation: vi.fn().mockResolvedValue(undefined),
  getActivationStatus: vi.fn().mockResolvedValue({ requiresPasswordChange: false, requiresMfaEnrollment: false }),
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

describe('ActivationScreen (TR-02) — accesibilidad (axe)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('paso 1 (PASSWORD) no tiene violaciones de accesibilidad detectables por axe', async () => {
    const { container } = renderScreen();
    await screen.findByLabelText('Nueva contraseña');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('paso 2 (MFA/QR) no tiene violaciones de accesibilidad detectables por axe', async () => {
    const { container } = renderScreen();
    await screen.findByLabelText('Nueva contraseña');

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'Abcdefg1' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Abcdefg1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByText('Protege tu cuenta');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
