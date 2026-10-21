import { useCallback, useRef, useState } from 'react';
import {
  EmailAuthProvider,
  getMultiFactorResolver,
  reauthenticateWithCredential,
  TotpMultiFactorGenerator,
  type MultiFactorError,
} from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import type { MfaChallengeState } from './MfaChallengeModal';

/**
 * SEC-F4 / TR-03 - reautenticacion con MFA ("step-up") para operaciones criticas
 * (TDD-00 8.4: MFA realizado en los ultimos 5 min). El back responde 403
 * `MFA_RECENT_REQUIRED`; el llamador pide `request()`, que abre el reto TR-03
 * (contrasena + codigo TOTP), reautentica al usuario actual con Firebase y devuelve un
 * ID token NUEVO (con `auth_time` y segundo factor actualizados) para reintentar.
 *
 * Firebase no permite reautenticar solo con TOTP: el flujo oficial es
 * reauthenticateWithCredential(contrasena) -> auth/multi-factor-auth-required ->
 * resolver.resolveSignIn(TOTP). Por eso el modal pide tambien la contrasena.
 *
 * Si el usuario cierra/cancela el reto, la promesa se rechaza con
 * `MfaStepUpCancelledError` y la accion original NO se ejecuta (TR-03 punto 14).
 */
export class MfaStepUpCancelledError extends Error {
  constructor() {
    super('Verificación cancelada: no se confirmó tu identidad.');
    this.name = 'MfaStepUpCancelledError';
  }
}

const MFA_REQUIRED_CODE = 'auth/multi-factor-auth-required';
const PASSWORD_ERROR_CODES = new Set(['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials']);
const CODE_ERROR_CODES = new Set(['auth/invalid-verification-code', 'auth/code-expired']);
const SESSION_ERROR_CODES = new Set([
  'auth/multi-factor-info-not-found',
  'auth/user-token-expired',
  'auth/invalid-multi-factor-session',
  'auth/user-mismatch',
  'auth/requires-recent-login',
  'auth/user-disabled',
]);

type Phase = 'PASSWORD' | 'CODE';

function mapStepUpError(code: string | undefined, phase: Phase): MfaChallengeState {
  if (code && CODE_ERROR_CODES.has(code)) return 'RECOVERABLE_ERROR';
  if (code && PASSWORD_ERROR_CODES.has(code)) return phase === 'PASSWORD' ? 'INVALID_CREDENTIALS' : 'RECOVERABLE_ERROR';
  if (code && SESSION_ERROR_CODES.has(code)) return 'SESSION_EXPIRED';
  // Red, limite de intentos o desconocido: nunca se dice "codigo incorrecto".
  return 'VERIFICATION_UNAVAILABLE';
}

export function useMfaStepUp() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<MfaChallengeState>('READY');
  const pending = useRef<{ resolve: (idToken: string) => void; reject: (error: Error) => void } | null>(null);

  const request = useCallback((): Promise<string> => {
    // Si ya hay un reto abierto se cancela el anterior (no se acumulan promesas colgadas).
    pending.current?.reject(new MfaStepUpCancelledError());
    return new Promise<string>((resolve, reject) => {
      pending.current = { resolve, reject };
      setState('READY');
      setIsOpen(true);
    });
  }, []);

  const confirm = useCallback(async (code: string, password?: string) => {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user || !user.email) {
      setState('SESSION_EXPIRED');
      return;
    }
    if (!password) {
      setState('INVALID_CREDENTIALS');
      return;
    }

    setState('VALIDATING');
    let phase: Phase = 'PASSWORD';
    try {
      try {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
        // Reautentico sin pedir segundo factor: la cuenta no tiene MFA enrolado, asi que
        // no se puede cumplir "MFA reciente". Falla cerrado (no se reintenta la operacion).
        setState('UNSUPPORTED_FACTOR');
        return;
      } catch (error) {
        if ((error as { code?: string }).code !== MFA_REQUIRED_CODE) throw error;
        phase = 'CODE';
        const resolver = getMultiFactorResolver(auth, error as unknown as MultiFactorError);
        const totpHint = resolver.hints.find((hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID);
        if (!totpHint) {
          setState('UNSUPPORTED_FACTOR');
          return;
        }
        await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, code));
      }

      // forceRefresh: el token anterior conserva el auth_time viejo.
      const freshToken = await user.getIdToken(true);
      const current = pending.current;
      pending.current = null;
      setIsOpen(false);
      current?.resolve(freshToken);
    } catch (error) {
      setState(mapStepUpError((error as { code?: string }).code, phase));
    }
  }, []);

  const cancel = useCallback(() => {
    const current = pending.current;
    pending.current = null;
    setIsOpen(false);
    setState('READY');
    current?.reject(new MfaStepUpCancelledError());
  }, []);

  return {
    request,
    challenge: { isOpen, state, requirePassword: true, onConfirm: confirm, onCancel: cancel },
  };
}
