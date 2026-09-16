import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMultiFactorResolver,
  signInWithEmailAndPassword,
  TotpMultiFactorGenerator,
  type AuthError,
  type MultiFactorError,
  type MultiFactorResolver,
  type UserCredential,
} from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { recordLoginAttempt } from './audit-client';
import { getActivationStatus } from './activation-client';
import { getWorkContextAssignments } from './work-context-client';
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
const MFA_REQUIRED_CODE = 'auth/multi-factor-auth-required';

function mapFirebaseErrorToState(error: AuthError): LoginScreenState {
  if (BLOCKING_ERROR_CODES.has(error.code)) return 'BLOCKING_ERROR';
  if (EXTERNAL_DEPENDENCY_CODES.has(error.code)) return 'EXTERNAL_DEPENDENCY_PENDING';
  // auth/invalid-credential, auth/wrong-password, auth/user-not-found, etc.
  // - TR-01 punto 14: nunca revela si el correo existe o no.
  return 'RECOVERABLE_ERROR';
}

export function useLogin() {
  const [state, setState] = useState<LoginScreenState>('READY');
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaState, setMfaState] = useState<MfaChallengeState>('READY');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  // Compartido entre el login directo (sin MFA) y el paso final tras
  // resolver el reto MFA (TR-03) - ambos terminan igual: registrar la
  // auditoria de exito, chequear si requiere activacion (TR-02/HU-21),
  // chequear si requiere elegir contexto de trabajo (TR-05/HU-23) y
  // navegar.
  const completeSuccessfulLogin = useCallback(
    async (credential: UserCredential, email: string) => {
      // El registro de auditoria nunca debe bloquear la navegacion del
      // usuario que ya se autentico correctamente (fire-and-forget) - si
      // el endpoint esta lento o no responde, no debe dejar el boton en
      // VALIDATING indefinidamente.
      void recordLoginAttempt(email, 'SUCCESS', null);

      let idToken: string | null = null;
      try {
        idToken = await credential.user.getIdToken();
      } catch {
        idToken = null;
      }

      if (idToken) {
        // TR-02 (HU-21): si el usuario esta en "primer acceso" (contrasena
        // temporal sin cambiar y/o MFA sin enrolar), se redirige a la
        // pantalla de activacion en lugar de ir directo al tablero. Si el
        // chequeo falla (backend caido, usuario sin UserProfile todavia -
        // ver PROP-001 en docs/decision-log.md del repo backend) se asume
        // que NO requiere activacion, para no bloquear el acceso de un
        // usuario ya autenticado correctamente por una falla de este
        // chequeo adicional.
        try {
          const activationStatus = await getActivationStatus(idToken);
          if (activationStatus.requiresPasswordChange || activationStatus.requiresMfaEnrollment) {
            navigate('/activar-cuenta');
            return;
          }
        } catch {
          // Ver nota arriba.
        }

        // TR-05 (HU-23): si el usuario tiene mas de 1 asignacion
        // empresa/sede, elige el contexto de trabajo antes de llegar al
        // tablero (BR-ORG-002). Con 0 o 1 asignacion, o si el chequeo
        // falla, se va directo al tablero - mismo criterio de no bloquear
        // el acceso que el chequeo de activacion.
        try {
          const assignments = await getWorkContextAssignments(idToken);
          if (assignments.length > 1) {
            navigate('/seleccion-empresa-sede');
            return;
          }
        } catch {
          // Ver nota arriba.
        }
      }

      navigate('/tablero');
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
        await completeSuccessfulLogin(credential, values.emailOrUsername);
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
          setMfaState('READY');
          setPendingEmail(values.emailOrUsername);
          setState('READY');
          return;
        }

        const nextState = mapFirebaseErrorToState(authError);
        setState(nextState);
        void recordLoginAttempt(values.emailOrUsername, 'FAILURE', authError.code ?? 'unknown');
      }
    },
    [completeSuccessfulLogin],
  );

  const confirmMfa = useCallback(
    async (code: string) => {
      if (!mfaResolver) return;
      const hint = mfaResolver.hints[0];
      setMfaState('VALIDATING');
      try {
        const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code);
        const credential = await mfaResolver.resolveSignIn(assertion);
        setMfaResolver(null);
        const email = pendingEmail ?? credential.user.email ?? '';
        setPendingEmail(null);
        await completeSuccessfulLogin(credential, email);
      } catch {
        // Codigo TOTP incorrecto o expirado - "RECOVERABLE_ERROR" del reto
        // MFA (punto 9 del contrato), nunca revela mas detalle que eso.
        setMfaState('RECOVERABLE_ERROR');
        void recordLoginAttempt(pendingEmail ?? 'unknown', 'FAILURE', 'mfa/invalid-code');
      }
    },
    [mfaResolver, pendingEmail, completeSuccessfulLogin],
  );

  const cancelMfa = useCallback(() => {
    setMfaResolver(null);
    setMfaState('READY');
    setPendingEmail(null);
    setState('READY');
  }, []);

  return {
    state,
    submit,
    mfaChallenge: {
      isOpen: mfaResolver !== null,
      state: mfaState,
      onConfirm: confirmMfa,
      onCancel: cancelMfa,
    },
  };
}
