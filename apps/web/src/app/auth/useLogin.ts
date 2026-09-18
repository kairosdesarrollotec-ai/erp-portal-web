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
// caido) es un problema distinto y necesita su propio mensaje - decirle a
// alguien "código incorrecto" cuando el problema fue de red hace que
// reintente el mismo código sin sentido, o que sospeche de su app
// autenticadora sin motivo.
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
  // auth/invalid-credential, auth/wrong-password, auth/user-not-found, etc.
  // - TR-01 punto 14: nunca revela si el correo existe o no.
  return 'RECOVERABLE_ERROR';
}

function mapMfaErrorToState(code: string | undefined): MfaChallengeState {
  if (code && MFA_INVALID_CODE_ERROR_CODES.has(code)) return 'RECOVERABLE_ERROR';
  if (code && MFA_SESSION_EXPIRED_ERROR_CODES.has(code)) return 'SESSION_EXPIRED';
  // Red, backend caido, o cualquier codigo que no reconocemos: nunca se
  // asume "código incorrecto" para algo que no sabemos que es.
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
  // auditoria de exito y chequear (fail-closed) si requiere activacion
  // (TR-02/HU-21) antes de navegar.
  const resolveActivation = useCallback(
    async (user: User) => {
      let activationStatus: ActivationStatus;
      try {
        const idToken = await user.getIdToken();
        activationStatus = await getActivationStatus(idToken);
      } catch {
        // No se pudo confirmar el estado de activacion - fail-closed: se
        // bloquea el paso al tablero en lugar de asumir que no requiere
        // activacion.
        setPendingUser(user);
        setState('ACTIVATION_CHECK_FAILED');
        return;
      }

      if (
        activationStatus.requiresPasswordChange === false &&
        activationStatus.requiresMfaEnrollment === false
      ) {
        navigate('/tablero');
        return;
      }

      if (activationStatus.requiresPasswordChange || activationStatus.requiresMfaEnrollment) {
        navigate('/activar-cuenta');
        return;
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
          // Hallazgo de revision (punto 1): no asumir hints[0] - solo TOTP
          // esta soportado (PROP-002), asi que se busca explicitamente el
          // hint con ese factorId. Si la cuenta tiene MFA enrolado pero no
          // con TOTP (o el resolver no trae ningun hint), no hay forma de
          // completar el reto con esta UI - se lo decimos al usuario en vez
          // de reventar contra hints[0].uid siendo undefined.
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
        // No deberia poder llegar aca (el boton de confirmar no se habilita
        // en este estado - ver MfaChallengeModal), pero por si el resolver
        // cambia entre el submit y la confirmacion.
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
