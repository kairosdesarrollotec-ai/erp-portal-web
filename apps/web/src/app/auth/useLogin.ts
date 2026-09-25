import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMultiFactorResolver,
  signInWithEmailAndPassword,
  TotpMultiFactorGenerator,
  type AuthError,
  type MultiFactorError,
  type MultiFactorResolver,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { recordLoginAttempt } from './audit-client';
import { getActivationStatus, type ActivationStatus } from './activation-client';
import { getWorkContextAssignments, selectWorkContext } from './work-context-client';
import type { LoginFormValues } from './login.schema';
import type { MfaChallengeState } from './MfaChallengeModal';

/**
 * TR-01 - Inicio de sesion. Estados segun PANTALLAS-V2-B-TRANSVERSAL.md:
 * READY, VALIDATING, RECOVERABLE_ERROR, BLOCKING_ERROR,
 * EXTERNAL_DEPENDENCY_PENDING.
 *
 * NOTA: el campo del prototipo se llama "Correo o usuario", pero Firebase
 * Authentication (TDD-KAIROS-TRANSVERSAL 8.1/8.4) solo soporta email.
 * Mientras no exista una resolucion de usuario->email en el backend, este
 * campo se trata siempre como email.
 *
 * ACTIVATION_CHECK_FAILED (hallazgo de revision, portado de la correccion
 * fail-closed de HU-21): el chequeo de "primer acceso" (getActivationStatus)
 * es de seguridad, no cosmetico - un usuario con cambio de contrasena o
 * enrolamiento MFA obligatorio pendiente no puede entrar al tablero solo
 * porque el servicio de perfiles esta caido. Por eso NUNCA se navega a
 * /tablero salvo que el backend confirme de forma expresa
 * `requiresPasswordChange: false` y `requiresMfaEnrollment: false`;
 * cualquier timeout/401/403/5xx (o el fallo del propio getIdToken) dispara
 * este estado bloqueante y reintentable, reusando el usuario ya autenticado
 * (no pide credenciales de nuevo). Aplica igual al login directo y al login
 * que pasa por el reto MFA de TR-03 (HU-22).
 *
 * El chequeo TR-05 (asignaciones empresa/sede, HU-23) es posterior al
 * chequeo de activacion y es fail-open: si el backend de asignaciones no
 * responde, se navega al tablero sin contexto fijo en lugar de bloquear al
 * usuario, ya que no es un control de seguridad sino de UX.
 */
export type LoginScreenState =
  | 'READY'
  | 'VALIDATING'
  | 'RECOVERABLE_ERROR'
  | 'BLOCKING_ERROR'
  | 'EXTERNAL_DEPENDENCY_PENDING'
  | 'ACTIVATION_CHECK_FAILED';

const BLOCKING_ERROR_CODES = new Set(['auth/user-disabled']);
const EXTERNAL_DEPENDENCY_CODES = new Set([
  'auth/network-request-failed',
  'auth/too-many-requests',
]);
const MFA_REQUIRED_CODE = 'auth/multi-factor-auth-required';

// Hallazgo de revision - clasificacion de errores del reto MFA (punto 6):
// solo un codigo TOTP realmente invalido/expirado debe mostrarse como
// "código incorrecto". Todo lo demas (red, sesion de MFA vencida, backend
// caido) es un problema distinto y necesita su propio mensaje.
const MFA_INVALID_CODE_ERROR_CODES = new Set(['auth/invalid-verification-code', 'auth/code-expired']);
const MFA_SESSION_EXPIRED_ERROR_CODES = new Set([
  'auth/multi-factor-info-not-found',
  'auth/user-token-expired',
  'auth/invalid-multi-factor-session',
  'auth/user-mismatch',
]);

function mapFirebaseErrorToState(error: AuthError): LoginScreenState {
  if (BLOCKING_ERROR_CODES.has(error.code)) return 'BLOCKING_ERROR';
  if (EXTERNAL_DEPENDENCY_CODES.has(error.code)) return 'EXTERNAL_DEPENDENCY_PENDING';
  return 'RECOVERABLE_ERROR';
}

function mapMfaErrorToState(code: string | undefined): MfaChallengeState {
  if (code && MFA_INVALID_CODE_ERROR_CODES.has(code)) return 'RECOVERABLE_ERROR';
  if (code && MFA_SESSION_EXPIRED_ERROR_CODES.has(code)) return 'SESSION_EXPIRED';
  return 'VERIFICATION_UNAVAILABLE';
}

export function useLogin() {
  const [state, setState] = useState<LoginScreenState>('READY');
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaState, setMfaState] = useState<MfaChallengeState>('READY');
  const [pendingMfaEmail, setPendingMfaEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  // Compartido entre el login directo (sin MFA) y el paso final tras
  // resolver el reto MFA (TR-03) - ambos terminan igual: registrar la
  // auditoria de exito, chequear (fail-closed) si requiere activacion
  // (TR-02/HU-21), y luego resolver el contexto de trabajo (TR-05/HU-23).
  const resolveActivation = useCallback(
    async (user: User) => {
      let idToken: string;
      let activationStatus: ActivationStatus;
      try {
        idToken = await user.getIdToken();
        activationStatus = await getActivationStatus(idToken);
      } catch {
        // No se pudo confirmar el estado de activacion - fail-closed: se
        // bloquea el paso al tablero en lugar de asumir que no requiere
        // activacion.
        setPendingUser(user);
        setState('ACTIVATION_CHECK_FAILED');
        return;
      }

      if (activationStatus.requiresPasswordChange || activationStatus.requiresMfaEnrollment) {
        navigate('/activar-cuenta');
        return;
      }

      if (
        activationStatus.requiresPasswordChange === false &&
        activationStatus.requiresMfaEnrollment === false
      ) {
        // TR-05 (HU-23): decide a donde navegar segun cuantas asignaciones
        // empresa/sede tiene el usuario (BR-ORG-002).
        // - 0 o >1: el usuario elige en /seleccion-empresa-sede.
        // - 1: unica opcion, se fija/valida en backend antes de ir al tablero.
        // Fail-open: si el chequeo de asignaciones falla, navegar al tablero
        // sin contexto fijo (no es un control de seguridad).
        try {
          const assignments = await getWorkContextAssignments(idToken);
          if (assignments.length === 1) {
            const [only] = assignments;
            try {
              await selectWorkContext(idToken, only.companyId, only.branchId);
              navigate('/tablero');
              return;
            } catch {
              navigate('/seleccion-empresa-sede');
              return;
            }
          }
          navigate('/seleccion-empresa-sede');
          return;
        } catch {
          // Chequeo de asignaciones fallido - no bloquear al usuario.
          navigate('/tablero');
          return;
        }
      }

      // Respuesta inesperada (ni true ni false de forma explicita en algun
      // campo) - no se confirma "sin activacion pendiente", asi que tampoco
      // se navega directo al tablero.
      setPendingUser(user);
      setState('ACTIVATION_CHECK_FAILED');
    },
    [navigate],
  );

  const submit = useCallback(
    async (values: LoginFormValues) => {
      setState('VALIDATING');
      try {
        const credential = await signInWithEmailAndPassword(
          getFirebaseAuth(),
          values.emailOrUsername,
          values.password,
        );
        void recordLoginAttempt(values.emailOrUsername, 'SUCCESS', null);

        // TR-02 (HU-21): si el usuario esta en "primer acceso" (contrasena
        // temporal sin cambiar y/o MFA sin enrolar), se redirige a la
        // pantalla de activacion en lugar de ir directo al tablero.
        await resolveActivation(credential.user);
      } catch (error) {
        const authError = error as AuthError;

        // TR-03 - Desafio MFA: la cuenta tiene el segundo factor (TOTP)
        // enrolado (TR-02/HU-21). No es un error de credenciales - abre el
        // modal/hoja de verificacion en vez de RECOVERABLE_ERROR.
        if (authError.code === MFA_REQUIRED_CODE) {
          const resolver = getMultiFactorResolver(
            getFirebaseAuth(),
            authError as unknown as MultiFactorError,
          );
          setMfaResolver(resolver);
          const totpHint = resolver.hints.find(
            (hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID,
          );
          setMfaState(totpHint ? 'READY' : 'UNSUPPORTED_FACTOR');
          setPendingMfaEmail(values.emailOrUsername);
          setState('READY');
          return;
        }

        const nextState = mapFirebaseErrorToState(authError);
        setState(nextState);
        void recordLoginAttempt(values.emailOrUsername, 'FAILURE', authError.code ?? 'unknown');
      }
    },
    [resolveActivation],
  );

  const confirmMfa = useCallback(
    async (code: string) => {
      if (!mfaResolver) return;
      const totpHint = mfaResolver.hints.find(
        (hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID,
      );
      if (!totpHint) {
        setMfaState('UNSUPPORTED_FACTOR');
        return;
      }

      setMfaState('VALIDATING');
      try {
        const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, code);
        const credential = await mfaResolver.resolveSignIn(assertion);
        setMfaResolver(null);
        const email = pendingMfaEmail ?? credential.user.email ?? 'unknown';
        setPendingMfaEmail(null);
        void recordLoginAttempt(email, 'SUCCESS', null);
        await resolveActivation(credential.user);
      } catch (error) {
        const mfaError = error as { code?: string };
        setMfaState(mapMfaErrorToState(mfaError.code));
        void recordLoginAttempt(pendingMfaEmail ?? 'unknown', 'FAILURE', mfaError.code ?? 'mfa/unknown-error');
      }
    },
    [mfaResolver, pendingMfaEmail, resolveActivation],
  );

  const cancelMfa = useCallback(() => {
    setMfaResolver(null);
    setMfaState('READY');
    setPendingMfaEmail(null);
  }, []);

  const retryActivationCheck = useCallback(async () => {
    if (!pendingUser) return;
    setState('VALIDATING');
    await resolveActivation(pendingUser);
  }, [pendingUser, resolveActivation]);

  return {
    state,
    submit,
    retryActivationCheck,
    mfaChallenge: {
      isOpen: mfaResolver !== null,
      state: mfaState,
      onConfirm: confirmMfa,
      onCancel: cancelMfa,
    },
  };
}
