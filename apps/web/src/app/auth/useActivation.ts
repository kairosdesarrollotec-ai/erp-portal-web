import { useCallback, useState } from 'react';
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
 * VALIDATING no tiene prototipo propio (mismo patron que TR-01: reutiliza
 * el boton en estado deshabilitado).
 *
 * MFA: TOTP nativo de Firebase Multi-Factor (PROP-002 en docs/decision-
 * log.md del repo backend, confirmado por el usuario) - multiFactor(user)
 * .getSession() + TotpMultiFactorGenerator, no una implementacion propia
 * de TOTP. `secretKey` se expone porque el prototipo mobile incluye un
 * boton "Ingresar clave manual" como alternativa a escanear el QR.
 */
export type ActivationStep = 'PASSWORD' | 'MFA';
export type ActivationScreenState = 'READY' | 'VALIDATING' | 'RECOVERABLE_ERROR';

export function useActivation() {
  const [step, setStep] = useState<ActivationStep>('PASSWORD');
  const [state, setState] = useState<ActivationScreenState>('READY');
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const navigate = useNavigate();

  const submitPassword = useCallback(async (values: ActivationPasswordFormValues) => {
    setState('VALIDATING');
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No hay una sesion activa. Vuelve a iniciar sesion.');
      }

      await updatePassword(user, values.newPassword);

      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      setTotpSecret(secret);

      setState('READY');
      setStep('MFA');
    } catch {
      // El prototipo no tiene un estado de error propio para el paso 1
      // (el formulario ya bloquea contraseñas invalidas antes de enviar) -
      // se mantiene READY para permitir reintentar.
      setState('READY');
    }
  }, []);

  const submitMfaCode = useCallback(
    async (code: string) => {
      setState('VALIDATING');
      try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user || !totpSecret) {
          throw new Error('No hay una sesion de activacion valida.');
        }

        const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, code);
        await multiFactor(user).enroll(assertion, 'App de autenticacion');

        const idToken = await user.getIdToken(true);
        await completeActivation(idToken);

        navigate('/tablero');
      } catch {
        // TR-02 paso 2 RECOVERABLE_ERROR - PROTO-TR-02-ACTIVACION-PASO-2-ERROR:
        // codigo TOTP incorrecto o expirado (auth/invalid-verification-code)
        // o cualquier otra falla del enrolamiento/activacion.
        setState('RECOVERABLE_ERROR');
      }
    },
    [navigate, totpSecret],
  );

  const qrCodeUrl = totpSecret
    ? totpSecret.generateQrCodeUrl(
        getFirebaseAuth().currentUser?.email ?? undefined,
        'VeloxRent',
      )
    : null;

  return {
    step,
    state,
    qrCodeUrl,
    secretKey: totpSecret?.secretKey ?? null,
    submitPassword,
    submitMfaCode,
  };
}
