import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { multiFactor, TotpMultiFactorGenerator, updatePassword, type TotpSecret } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { completeActivation } from './activation-client';
import type { ActivationPasswordFormValues } from './activation.schema';

/**
 * TR-02 - Activa tu cuenta (2 pasos). Fuente: PANTALLAS-V2-B-TRANSVERSAL.md.
 * Estados cubiertos por prototipo aprobado, desktop y mobile: paso 1 READY
 * (PROTO-TR-02-ACTIVACION-PASO-1 desktop, PROTO-TR-02-ACTIVACION-PASO-1-MOVIL
 * mobile), paso 2 READY (PROTO-TR-02-ACTIVACION-PASO-2 desktop,
 * PROTO-TR-02-ACTIVACION-PASO-2-MOVIL mobile) y paso 2 RECOVERABLE_ERROR
 * (PROTO-TR-02-ACTIVACION-PASO-2-ERROR desktop, PROTO-TR-02-ACTIVACION-
 * PASO-2-ERROR-MOVIL mobile) - los 6 registrados y aprobados por Producto.
 * LOADING y VALIDATING no tienen prototipo propio (mismo patron que TR-01:
 * reutiliza el boton en estado deshabilitado / un estado de carga breve).
 *
 * MFA: TOTP nativo de Firebase Multi-Factor (PROP-002 en docs/decision-
 * log.md del repo backend, confirmado por el usuario) - multiFactor(user)
 * .getSession() + TotpMultiFactorGenerator, no una implementacion propia
 * de TOTP. `secretKey` se expone porque el prototipo mobile incluye un
 * boton "Ingresar clave manual" como alternativa a escanear el QR.
 *
 * RECUPERABILIDAD (hallazgo de revision post-PR): cambiar contrasena ->
 * generar secreto -> enrolar MFA -> completar perfil en el backend es una
 * secuencia de 4 pasos con 2 sistemas (Firebase + backend propio) que no
 * comparten una transaccion. Si el usuario cierra la pestana o pierde
 * conexion entre el enrolamiento MFA (que ya quedo hecho en Firebase) y la
 * confirmacion con el backend (`completeActivation`), un reintento ingenuo
 * que vuelva a pedir la contrasena y a re-enrolar MFA desde cero fallaria
 * (Firebase ya tiene un factor TOTP para ese usuario) y dejaria el estado
 * mas desalineado todavia. Por eso:
 *  - al montar el hook se consulta el estado real en Firebase
 *    (`multiFactor(user).enrolledFactors`) para retomar el paso pendiente
 *    en vez de asumir siempre 'PASSWORD'.
 *  - `completeActivation` se trata como idempotente: se puede reintentar
 *    solo esa llamada tantas veces como haga falta sin repetir el cambio de
 *    contrasena ni el enrolamiento.
 *  - los errores se distinguen en vez de un catch generico: sesion perdida
 *    (REAUTH_REQUIRED), red/backend caido (NETWORK_ERROR / BACKEND_UNAVAILABLE)
 *    y codigo TOTP invalido (RECOVERABLE_ERROR, unico con prototipo propio).
 */
export type ActivationStep = 'PASSWORD' | 'MFA';
export type ActivationScreenState =
  | 'LOADING'
  | 'READY'
  | 'VALIDATING'
  | 'RECOVERABLE_ERROR'
  | 'REAUTH_REQUIRED'
  | 'NETWORK_ERROR'
  | 'BACKEND_UNAVAILABLE';

export type PasswordStepErrorKind = 'REAUTH_REQUIRED' | 'NETWORK_ERROR' | 'VALIDATION_ERROR';

const REAUTH_ERROR_CODES = new Set(['auth/requires-recent-login']);
const NETWORK_ERROR_CODES = new Set(['auth/network-request-failed']);

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code?.toString()
    : undefined;
}

export function useActivation() {
  const [step, setStep] = useState<ActivationStep>('PASSWORD');
  const [state, setState] = useState<ActivationScreenState>('LOADING');
  const [passwordError, setPasswordError] = useState<PasswordStepErrorKind | null>(null);
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const navigate = useNavigate();

  // Al entrar (o recargar la pagina a mitad del flujo) se retoma el paso
  // pendiente real en vez de asumir 'PASSWORD'. Si Firebase ya tiene un
  // factor TOTP enrolado, la contrasena y el MFA ya se resolvieron en un
  // intento previo y solo falta confirmar con el backend.
  useEffect(() => {
    let cancelled = false;

    async function resume() {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        // RequireAuthenticatedUser (router) ya deberia haber redirigido
        // antes de llegar aqui sin sesion - defensa en profundidad.
        if (!cancelled) setState('REAUTH_REQUIRED');
        return;
      }

      const alreadyEnrolled = multiFactor(user).enrolledFactors.length > 0;
      if (!alreadyEnrolled) {
        if (!cancelled) setState('READY');
        return;
      }

      try {
        const idToken = await user.getIdToken(true);
        await completeActivation(idToken);
        if (!cancelled) navigate('/tablero');
      } catch {
        if (!cancelled) {
          setStep('MFA');
          setState('BACKEND_UNAVAILABLE');
        }
      }
    }

    void resume();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitPassword = useCallback(async (values: ActivationPasswordFormValues) => {
    setState('VALIDATING');
    setPasswordError(null);
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) {
        setPasswordError('REAUTH_REQUIRED');
        setState('READY');
        return;
      }

      await updatePassword(user, values.newPassword);

      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      setTotpSecret(secret);

      setState('READY');
      setStep('MFA');
    } catch (error) {
      const code = errorCode(error);
      if (code && REAUTH_ERROR_CODES.has(code)) {
        setPasswordError('REAUTH_REQUIRED');
      } else if (code && NETWORK_ERROR_CODES.has(code)) {
        setPasswordError('NETWORK_ERROR');
      } else {
        // Validacion de Firebase (p.ej. contrasena rechazada por politica
        // del proyecto) u otro error no clasificado.
        setPasswordError('VALIDATION_ERROR');
      }
      setState('READY');
    }
  }, []);

  const submitMfaCode = useCallback(
    async (code: string) => {
      setState('VALIDATING');
      try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) {
          setState('REAUTH_REQUIRED');
          return;
        }

        const alreadyEnrolled = multiFactor(user).enrolledFactors.length > 0;
        if (!alreadyEnrolled) {
          if (!totpSecret) {
            setState('REAUTH_REQUIRED');
            return;
          }
          const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, code);
          await multiFactor(user).enroll(assertion, 'App de autenticación');
        }
        // Si ya estaba enrolado (reintento tras una falla previa del
        // backend) no se vuelve a enrolar - se salta directo a confirmar.

        try {
          const idToken = await user.getIdToken(true);
          await completeActivation(idToken);
        } catch {
          // El enrolamiento MFA en Firebase ya esta hecho; solo fallo la
          // confirmacion con el backend. No se reintenta el enrolamiento
          // (desalinearia Firebase/backend todavia mas) - se distingue de
          // un codigo TOTP invalido.
          setState('BACKEND_UNAVAILABLE');
          return;
        }

        navigate('/tablero');
      } catch (error) {
        const code = errorCode(error);
        if (code && NETWORK_ERROR_CODES.has(code)) {
          setState('NETWORK_ERROR');
        } else {
          // auth/invalid-verification-code y similares - TR-02 paso 2
          // RECOVERABLE_ERROR, PROTO-TR-02-ACTIVACION-PASO-2-ERROR.
          setState('RECOVERABLE_ERROR');
        }
      }
    },
    [navigate, totpSecret],
  );

  // Reintento dedicado cuando lo unico que fallo fue completeActivation
  // (BACKEND_UNAVAILABLE) - no repite el enrolamiento MFA.
  const retryCompleteActivation = useCallback(async () => {
    setState('VALIDATING');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('REAUTH_REQUIRED');
        return;
      }
      const idToken = await user.getIdToken(true);
      await completeActivation(idToken);
      navigate('/tablero');
    } catch {
      setState('BACKEND_UNAVAILABLE');
    }
  }, [navigate]);

  const qrCodeUrl = totpSecret
    ? totpSecret.generateQrCodeUrl(getFirebaseAuth().currentUser?.email ?? undefined, 'VeloxRent')
    : null;

  return {
    step,
    state,
    passwordError,
    qrCodeUrl,
    secretKey: totpSecret?.secretKey ?? null,
    submitPassword,
    submitMfaCode,
    retryCompleteActivation,
  };
}
