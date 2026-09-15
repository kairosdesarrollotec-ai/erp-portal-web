import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, type AuthError } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { recordLoginAttempt } from './audit-client';
import { getActivationStatus } from './activation-client';
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
 */
export type LoginScreenState =
  | 'READY'
  | 'VALIDATING'
  | 'RECOVERABLE_ERROR'
  | 'BLOCKING_ERROR'
  | 'EXTERNAL_DEPENDENCY_PENDING';

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
  const navigate = useNavigate();

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
        // pantalla de activacion en lugar de ir directo al tablero. Si el
        // chequeo falla (backend caido, usuario sin UserProfile todavia -
        // ver PROP-001 en docs/decision-log.md del repo backend) se asume
        // que NO requiere activacion, para no bloquear el acceso de un
        // usuario ya autenticado correctamente por una falla de este
        // chequeo adicional.
        try {
          const idToken = await credential.user.getIdToken();
          const activationStatus = await getActivationStatus(idToken);
          if (activationStatus.requiresPasswordChange || activationStatus.requiresMfaEnrollment) {
            navigate('/activar-cuenta');
            return;
          }
        } catch {
          // Ver nota arriba.
        }

        navigate('/tablero');
      } catch (error) {
        const authError = error as AuthError;
        const nextState = mapFirebaseErrorToState(authError);
        setState(nextState);
        void recordLoginAttempt(values.emailOrUsername, 'FAILURE', authError.code ?? 'unknown');
      }
    },
    [navigate],
  );

  return { state, submit };
}
