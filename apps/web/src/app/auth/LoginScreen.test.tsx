import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginScreen } from './LoginScreen';
import { recordLoginAttempt } from './audit-client';

const signInMock = vi.fn();
const resolveSignInMock = vi.fn();
const sendPasswordResetEmailMock = vi.fn();
const assertionForSignInMock = vi.fn((..._args: unknown[]) => 'mock-assertion');
const getActivationStatusMock = vi.fn();
const navigateMock = vi.fn();

// Mutable a proposito: distintos tests necesitan simular hints distintos
// (ausencia de TOTP, multiples factores) - ver hallazgo "no asumir
// hints[0]" en useLogin.ts.
let mfaHints: Array<{ uid: string; factorId: string }> = [
  { uid: 'totp-factor-uid', factorId: 'totp' },
];

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInMock(...args),
  sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmailMock(...args),
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
  getActivationStatus: (...args: unknown[]) => getActivationStatusMock(...args),
}));

const getWorkContextAssignmentsMock = vi.fn().mockRejectedValue(new Error('offline'));
const selectWorkContextMock = vi.fn().mockResolvedValue(undefined);
vi.mock('./work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
  selectWorkContext: (...args: unknown[]) => selectWorkContextMock(...args),
}));

function mockSuccessfulSignIn() {
  signInMock.mockResolvedValue({
    user: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
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
    localStorage.clear();
    signInMock.mockReset();
    sendPasswordResetEmailMock.mockReset().mockResolvedValue(undefined);
    vi.mocked(recordLoginAttempt).mockClear();
    resolveSignInMock.mockReset();
    assertionForSignInMock.mockClear();
    getActivationStatusMock.mockReset();
    navigateMock.mockReset();
    mfaHints = [{ uid: 'totp-factor-uid', factorId: 'totp' }];
    getWorkContextAssignmentsMock.mockReset().mockRejectedValue(new Error('offline'));
    selectWorkContextMock.mockReset().mockResolvedValue(undefined);
    // Por defecto, sin activacion pendiente - los tests que necesitan
    // simular el chequeo caido lo sobreescriben explicitamente.
    getActivationStatusMock.mockResolvedValue({
      requiresPasswordChange: false,
      requiresMfaEnrollment: false,
    });
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

  function typeCode(code: string) {
    code.split('').forEach((digit, index) => {
      fireEvent.change(screen.getByTestId(`mfa-digit-${index}`), { target: { value: digit } });
    });
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

  // D6 - TR-01 punto 11: CADA intento de login (fallo y exito, con o sin MFA) se reporta a POST /audit/login-attempts.
  function fillAndSubmit() {
    fireEvent.change(screen.getByLabelText('Correo o usuario'), { target: { value: 'user@veloxrent.pe' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
  }

  it('auditoria: un login con contraseña correcta registra SUCCESS (sin contraseña)', async () => {
    mockSuccessfulSignIn();
    renderScreen();
    fillAndSubmit();
    await waitFor(() => expect(recordLoginAttempt).toHaveBeenCalledWith('user@veloxrent.pe', 'SUCCESS', null));
    expect(recordLoginAttempt).toHaveBeenCalledTimes(1);
  });

  it('auditoria: un login con contraseña incorrecta registra FAILURE con el código del error', async () => {
    signInMock.mockRejectedValue({ code: 'auth/invalid-credential' });
    renderScreen();
    fillAndSubmit();
    await screen.findByRole('alert');
    expect(recordLoginAttempt).toHaveBeenCalledWith('user@veloxrent.pe', 'FAILURE', 'auth/invalid-credential');
  });

  it('auditoria: el login no espera ni se rompe si el registro de auditoría se cuelga o falla', async () => {
    vi.mocked(recordLoginAttempt).mockReturnValue(new Promise(() => undefined));
    mockSuccessfulSignIn();
    renderScreen();
    fillAndSubmit();
    await waitFor(() => expect(getActivationStatusMock).toHaveBeenCalled());
    await waitFor(() => expect(navigateMock).toHaveBeenCalled());
    vi.mocked(recordLoginAttempt).mockResolvedValue(undefined);
  });

  it('auditoria MFA: el segundo factor correcto registra SUCCESS y el código inválido registra FAILURE', async () => {
    await openMfaChallenge();
    resolveSignInMock.mockRejectedValueOnce({ code: 'auth/invalid-verification-code' });
    typeCode('000000');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));
    await waitFor(() =>
      expect(recordLoginAttempt).toHaveBeenCalledWith('user@veloxrent.pe', 'FAILURE', 'auth/invalid-verification-code'),
    );

    resolveSignInMock.mockResolvedValue({ user: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('t') } });
    typeCode('123456');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));
    await waitFor(() => expect(recordLoginAttempt).toHaveBeenCalledWith('user@veloxrent.pe', 'SUCCESS', null));
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
    getActivationStatusMock.mockRejectedValue(new Error('offline'));
    await openMfaChallenge();
    resolveSignInMock.mockResolvedValue({ user: { email: 'user@veloxrent.pe' } });
    typeCode('123456');
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));

    expect(await screen.findByText('No pudimos verificar tu cuenta')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fail-secure: un login directo (sin MFA) tampoco navega al tablero si el chequeo de activacion falla', async () => {
    getActivationStatusMock.mockRejectedValue(new Error('offline'));
    mockSuccessfulSignIn();
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Abcdefg1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('No pudimos verificar tu cuenta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
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

  it('TR-05: consulta las asignaciones de empresa/sede tras un login exitoso, con el token recien obtenido', async () => {
    signInMock.mockResolvedValue({
      user: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
    });
    getWorkContextAssignmentsMock.mockReset().mockResolvedValue([]);
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => {
      expect(getWorkContextAssignmentsMock).toHaveBeenCalledWith('fake-id-token');
    });
  });

  it('ofrece un botón "¿Olvidaste tu contraseña?" que envía el correo vía Firebase Auth si se indica el email', async () => {
    renderScreen();
    const forgotBtn = screen.getByRole('button', { name: /Olvidaste tu contraseña/i });
    expect(forgotBtn).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), {
      target: { value: 'user@veloxrent.pe' },
    });
    fireEvent.click(forgotBtn);

    await waitFor(() => {
      expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(expect.anything(), 'user@veloxrent.pe');
    });
    expect(await screen.findByTestId('reset-email-success')).toHaveTextContent(
      'Se envió un enlace para restablecer tu contraseña a tu correo.',
    );
  });

  it('muestra error si se intenta recuperar la contraseña sin ingresar el correo', async () => {
    renderScreen();
    const forgotBtn = screen.getByRole('button', { name: /Olvidaste tu contraseña/i });
    fireEvent.click(forgotBtn);

    expect(await screen.findByText('Ingresa tu correo para restablecer la contraseña')).toBeInTheDocument();
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });

  it('bloquea la cuenta tras 5 intentos fallidos consecutivos durante 15 minutos (BLOCKING_ERROR)', async () => {
    signInMock.mockRejectedValue({ code: 'auth/invalid-credential' });
    renderScreen();

    const emailInput = screen.getByLabelText('Correo o usuario');
    const passwordInput = screen.getByLabelText('Contraseña');
    const submitBtn = screen.getByRole('button', { name: 'Ingresar' });

    for (let i = 1; i <= 4; i++) {
      fireEvent.change(emailInput, { target: { value: 'bloqueo@veloxrent.pe' } });
      fireEvent.change(passwordInput, { target: { value: `bad-pass-${i}` } });
      fireEvent.click(submitBtn);
      await screen.findByRole('alert');
    }

    // El 5to intento fallido debe bloquear la cuenta inmediatamente
    fireEvent.change(emailInput, { target: { value: 'bloqueo@veloxrent.pe' } });
    fireEvent.change(passwordInput, { target: { value: 'bad-pass-5' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Tu cuenta está bloqueada')).toBeInTheDocument();
    expect(screen.getByText('Contacta a tu administrador para reactivarla')).toBeInTheDocument();
    expect(screen.queryByLabelText('Correo o usuario')).not.toBeInTheDocument();
  });

  it('un intento posterior en estado bloqueado no vuelve a consultar a Firebase', async () => {
    signInMock.mockRejectedValue({ code: 'auth/invalid-credential' });
    renderScreen();

    const emailInput = screen.getByLabelText('Correo o usuario');
    const passwordInput = screen.getByLabelText('Contraseña');
    const submitBtn = screen.getByRole('button', { name: 'Ingresar' });

    for (let i = 1; i <= 5; i++) {
      fireEvent.change(emailInput, { target: { value: 'bloqueo2@veloxrent.pe' } });
      fireEvent.change(passwordInput, { target: { value: `bad-pass-${i}` } });
      fireEvent.click(submitBtn);
      if (i < 5) {
        await screen.findByRole('alert');
      }
    }

    expect(await screen.findByText('Tu cuenta está bloqueada')).toBeInTheDocument();
    expect(signInMock).toHaveBeenCalledTimes(5);
  });

  it('C8: auth/too-many-requests muestra aviso de intentos excesivos en vez de error de conexion', async () => {
    signInMock.mockRejectedValue({ code: 'auth/too-many-requests' });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Correo o usuario'), { target: { value: 'user@veloxrent.pe' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Demasiados intentos fallidos')).toBeInTheDocument();
    expect(screen.getByText('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')).toBeInTheDocument();
  });
});
