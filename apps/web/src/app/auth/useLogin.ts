import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, type AuthError } from 'firebase/auth';
import { firebaseAuth } from '../providers/firebase';
import { recordLoginAttempt } from './audit-client';
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
        await signInWithEmailAndPassword(
          firebaseAuth,
          values.emailOrUsername,
          values.password,
        );
        await recordLoginAttempt(values.emailOrUsername, 'SUCCESS', null);
        // TR-02 (primer acceso) y TR-03 (MFA) dependen de flags de perfil
        // que todavia no existen en el backend (HU-21/HU-22, siguientes en
        // el plan) - por ahora todo login exitoso va directo a TR-06.
        navigate('/tablero');
      } catch (error) {
        const authError = error as AuthError;
        const nextState = mapFirebaseErrorToState(authError);
        setState(nextState);
        await recordLoginAttempt(values.emailOrUsername, 'FAILURE', authError.code ?? 'unknown');
      }
    },
    [navigate],
  );

  return { state, submit };
}
