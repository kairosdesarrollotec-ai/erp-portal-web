import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginScreen } from './LoginScreen';

const signInMock = vi.fn();
const resolveSignInMock = vi.fn();
const assertionForSignInMock = vi.fn((..._args: unknown[]) => 'mock-assertion');

// Mutable a proposito: distintos tests necesitan simular hints distintos
// (ausencia de TOTP, multiples factores) - ver hallazgo "no asumir
// hints[0]" en useLogin.ts.
let mfaHints: Array<{ uid: string; factorId: string }> = [
  { uid: 'totp-factor-uid', factorId: 'totp' },
];

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInMock(...args),
  getMultiFactorResolver: () => ({
    hints: mfaHints,
    resolveSignIn: (...args: unknown[]) => resolveSignInMock(...args),
  }),
  TotpMultiFactorGenerator: {
    // Constante real de Firebase - el mock la reproduce a proposito para
    // que la comparacion `hint.factorId === TotpMultiFactorGenerator.FACTOR_ID`
    // se ejerza de verdad en vez de matchear "undefined === undefined".
    FACTOR_ID: 'totp',
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
    mfaHints = [{ uid: 'totp-factor-uid', factorId: 'totp' }];
  });

  async function openMfaChallenge() {
    signInMock.mockRejectedValue({ code: 'auth/multi-factor-auth-required' });
    renderScreen();

    const submitButton = screen.getByRole('button', { name: 'Ingresar' });
    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'x' } });
    // fireEvent.click no mueve el foco como un click real del navegador -
    // se fuerza aca para que Radix capture correctamente "el elemento
    // enfocado antes de abrir el dialogo" y lo pueda restaurar al cerrar.
    submitButton.focus();
    fireEvent.click(submitButton);
    await screen.findByRole('dialog', { name: 'Confirma tu identidad' });
    return submitButton;
  }

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
    await openMfaChallenge();

    expect(screen.getByRole('dialog', { name: 'Confirma tu identidad' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  function typeCode(code: string) {
    code.split('').forEach((digit, index) => {
      fireEvent.change(screen.getByTestId(`mfa-digit-${index}`), { target: { value: digit } });
    });
  }

  it('TR-03: confirma el codigo TOTP y completa el segundo factor del login', async () => {
    await openMfaChallenge();

    resolveSignInMock.mockResolvedValue({ user: { email: 'user@veloxrent.pe' } });
    typeCode('123456');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));

    await waitFor(() => {
      expect(resolveSignInMock).toHaveBeenCalledWith('mock-assertion');
    });
    expect(assertionForSignInMock).toHaveBeenCalledWith('totp-factor-uid', '123456');
  });

  it('TR-03: "Cancelar" cierra el reto MFA y vuelve al formulario de login', async () => {
    await openMfaChallenge();

    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' })[0]);

    expect(screen.queryByRole('dialog', { name: 'Confirma tu identidad' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Correo o usuario')).toBeInTheDocument();
    expect(resolveSignInMock).not.toHaveBeenCalled();
  });

  it('TR-03: Escape cierra el reto MFA (hallazgo de revision - antes no tenia manejo de teclado)', async () => {
    await openMfaChallenge();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Confirma tu identidad' })).not.toBeInTheDocument();
    });
    expect(resolveSignInMock).not.toHaveBeenCalled();
  });

  it('TR-03: al cerrar el reto MFA, el foco vuelve al boton que lo abrio (hallazgo de revision - restauracion de foco)', async () => {
    const submitButton = await openMfaChallenge();

    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' })[0]);

    await waitFor(() => expect(document.activeElement).toBe(submitButton));
  });

  it('TR-03: el foco queda atrapado dentro del dialogo (hallazgo de revision - sin focus trap antes)', async () => {
    await openMfaChallenge();

    // El primer digito tiene autoFocus - confirmar que el foco arranca
    // dentro del dialogo, no en el formulario de login que sigue en el DOM
    // detras del modal.
    expect(document.activeElement).toBe(screen.getByTestId('mfa-digit-0'));
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('TR-03: muestra error recuperable con un codigo TOTP invalido, sin cerrar el reto ni asumirlo para otros errores', async () => {
    await openMfaChallenge();

    resolveSignInMock.mockRejectedValue({ code: 'auth/invalid-verification-code' });
    typeCode('000000');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));

    expect(await screen.findAllByText(/Código incorrecto o expirado/)).not.toHaveLength(0);
    expect(screen.getByRole('dialog', { name: 'Confirma tu identidad' })).toBeInTheDocument();
    expect(screen.getByTestId('mfa-digit-0')).toHaveAttribute('aria-invalid', 'true');
  });

  it('TR-03: un fallo de red al verificar NO se muestra como "código incorrecto" (hallazgo de revision - error demasiado amplio)', async () => {
    await openMfaChallenge();

    resolveSignInMock.mockRejectedValue({ code: 'auth/network-request-failed' });
    typeCode('123456');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));

    expect(await screen.findByText(/problema de conexión/i)).toBeInTheDocument();
    expect(screen.queryByText(/Código incorrecto o expirado/)).not.toBeInTheDocument();
  });

  it('TR-03: si el resolver no trae un hint TOTP, no asume hints[0] - muestra un estado sin casillas de codigo', async () => {
    mfaHints = [{ uid: 'phone-uid', factorId: 'phone' }];

    await openMfaChallenge();

    expect(screen.getByText(/No podemos verificar este método desde aquí/)).toBeInTheDocument();
    expect(screen.queryByTestId('mfa-digit-0')).not.toBeInTheDocument();
    // Dos botones con el mismo nombre accesible "Cerrar" en este estado (la
    // X del dialogo y el boton de accion del panel bloqueante) - cualquiera
    // de los dos debe cerrar el reto.
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' })[0]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('TR-03: con multiples factores enrolados, selecciona explicitamente el hint TOTP (no el primero de la lista)', async () => {
    mfaHints = [
      { uid: 'phone-uid', factorId: 'phone' },
      { uid: 'totp-factor-uid', factorId: 'totp' },
    ];

    await openMfaChallenge();
    resolveSignInMock.mockResolvedValue({ user: { email: 'user@veloxrent.pe' } });
    typeCode('654321');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));

    await waitFor(() => expect(resolveSignInMock).toHaveBeenCalled());
    expect(assertionForSignInMock).toHaveBeenCalledWith('totp-factor-uid', '654321');
  });

  it('TR-03: fail-secure - si el chequeo de activacion falla tras un login por MFA, NO navega al tablero', async () => {
    await openMfaChallenge();
    resolveSignInMock.mockResolvedValue({ user: { email: 'user@veloxrent.pe' } });
    typeCode('123456');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));

    // getActivationStatus esta mockeado para fallar siempre en este archivo
    // (linea 33) - el hallazgo "se hereda el fail-open de activacion" pedia
    // exactamente que este caso NUNCA navegue al tablero.
    expect(await screen.findByText('No pudimos verificar tu cuenta')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fail-secure: un login directo (sin MFA) tampoco navega al tablero si el chequeo de activacion falla', async () => {
    signInMock.mockResolvedValue({
      user: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
    });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Abcdefg1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('No pudimos verificar tu cuenta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
