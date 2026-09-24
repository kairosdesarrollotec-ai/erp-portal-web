import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, type AuthError, type User } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { recordLoginAttempt } from './audit-client';
import { getActivationStatus, type ActivationStatus } from './activation-client';
import type { LoginFormValues } from './login.schema';

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
 * ACTIVATION_CHECK_FAILED (hallazgo de revision post-PR): el chequeo de
 * "primer acceso" (getActivationStatus) es de seguridad, no cosmetico - un
 * usuario con cambio de contrasena o enrolamiento MFA obligatorio pendiente
 * no puede entrar al tablero solo porque el servicio de perfiles esta
 * caido. Por eso NUNCA se navega a /tablero salvo que el backend confirme
 * de forma expresa `requiresPasswordChange: false` y
 * `requiresMfaEnrollment: false`; cualquier timeout/401/403/5xx dispara
 * este estado bloqueante y reintentable (fail-closed), reusando el usuario
 * ya autenticado en Firebase para el reintento (no pide credenciales de
 * nuevo).
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

function mapFirebaseErrorToState(error: AuthError): LoginScreenState {
  if (BLOCKING_ERROR_CODES.has(error.code)) return 'BLOCKING_ERROR';
  if (EXTERNAL_DEPENDENCY_CODES.has(error.code)) return 'EXTERNAL_DEPENDENCY_PENDING';
  // auth/invalid-credential, auth/wrong-password, auth/user-not-found, etc.
  // - TR-01 punto 14: nunca revela si el correo existe o no.
  return 'RECOVERABLE_ERROR';
}

export function useLogin() {
  const [state, setState] = useState<LoginScreenState>('READY');
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const navigate = useNavigate();

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
        // El registro de auditoria nunca debe bloquear la navegacion del
        // usuario que ya se autentico correctamente (fire-and-forget) - si
        // el endpoint esta lento o no responde, no debe dejar el boton en
        // VALIDATING indefinidamente.
        void recordLoginAttempt(values.emailOrUsername, 'SUCCESS', null);

        // TR-02 (HU-21): si el usuario esta en "primer acceso" (contrasena
        // temporal sin cambiar y/o MFA sin enrolar), se redirige a la
        // pantalla de activacion en lugar de ir directo al tablero.
        await resolveActivation(credential.user);
      } catch (error) {
        const authError = error as AuthError;
        const nextState = mapFirebaseErrorToState(authError);
        setState(nextState);
        void recordLoginAttempt(values.emailOrUsername, 'FAILURE', authError.code ?? 'unknown');
      }
    },
    [resolveActivation],
  );

  const retryActivationCheck = useCallback(async () => {
    if (!pendingUser) return;
    setState('VALIDATING');
    await resolveActivation(pendingUser);
  }, [pendingUser, resolveActivation]);

  return { state, submit, retryActivationCheck };
}
