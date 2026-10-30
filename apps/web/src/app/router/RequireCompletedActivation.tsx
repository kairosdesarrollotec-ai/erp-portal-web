import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getActivationStatus } from '../auth/activation-client';
import { GuardBlockingScreen, GuardLoadingScreen } from './GuardScreens';
import {
  isNetworkFailure,
  isSessionRevoked,
  markSessionVerified,
  readOfflineSnapshot,
} from '../../offline/session/offline-session';
import { useOfflineMode } from '../../offline/session/offline-mode';
import { revokeLocalSession } from '../../offline/session/revoke-local-session';

type ActivationGuardState = 'CHECKING' | 'COMPLETED' | 'PENDING' | 'ERROR' | 'OFFLINE' | 'REVOKED';

/** Reverificación mientras se trabaja sin conexión (V-27): al volver la red y, por si el evento `online` no llega, cada 30 s. */
const OFFLINE_RECHECK_MS = 30_000;

/**
 * Guard de ruta - hallazgo de revision: `/tablero` no debe ser accesible
 * directamente sin pasar por la verificacion de activacion, ni asumir que
 * "no responde" equivale a "no requiere activacion" (ver fix del mismo
 * hallazgo en useLogin.ts). Solo se renderiza `/tablero` cuando el backend
 * confirma de forma expresa que ambos flags son `false`; un timeout/401/
 * 403/5xx deja al usuario en un estado bloqueante y reintentable, nunca
 * pasa de largo.
 *
 * V-27 (SDD-KAIROS-TRANSVERSAL §17): UNICA excepción — si la verificación falla por RED (el servidor no respondió) y
 * este dispositivo guarda una verificación hecha por el servidor hace menos de 8 h (sesión offline), se permite
 * arrancar en modo sin conexión; AuthenticatedLayout limita ese modo a los 2 checklists y Sincronización. Al volver la
 * red se reverifica con el servidor: un 401/403 (sesión revocada) bloquea el acceso y elimina los datos locales (§17.3).
 *
 * Se aplica solo a `/tablero` (no a `/activar-cuenta`, que es justamente la
 * pantalla para resolver una activacion pendiente) y va anidado dentro de
 * RequireAuthenticatedUser, del que depende un usuario ya autenticado.
 */
export function RequireCompletedActivation() {
  const [state, setState] = useState<ActivationGuardState>('CHECKING');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        // Defensa en profundidad: RequireAuthenticatedUser ya deberia haber
        // redirigido antes de que este guard se monte sin usuario.
        if (!cancelled) setState('ERROR');
        return;
      }
      try {
        const idToken = await user.getIdToken();
        const status = await getActivationStatus(idToken);
        if (cancelled) return;
        const activationCompleted =
          status.requiresPasswordChange === false && status.requiresMfaEnrollment === false;
        if (activationCompleted) {
          await markSessionVerified();
          if (cancelled) return;
          useOfflineMode.getState().setActive(false);
        }
        setState(activationCompleted ? 'COMPLETED' : 'PENDING');
      } catch (error) {
        if (cancelled) return;
        if (isSessionRevoked(error)) {
          await revokeLocalSession();
          if (!cancelled) setState('REVOKED');
          return;
        }
        if (isNetworkFailure(error)) {
          const snapshot = await readOfflineSnapshot();
          if (cancelled) return;
          if (snapshot) {
            useOfflineMode.getState().setActive(true);
            setState('OFFLINE');
            return;
          }
        }
        // Una reverificación silenciosa que falla no expulsa a quien ya trabaja sin conexión.
        setState((prev) => (prev === 'OFFLINE' ? 'OFFLINE' : 'ERROR'));
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (state !== 'OFFLINE') return;
    const recheck = () => setAttempt((n) => n + 1);
    window.addEventListener('online', recheck);
    const timer = window.setInterval(() => {
      if (typeof navigator === 'undefined' || navigator.onLine) recheck();
    }, OFFLINE_RECHECK_MS);
    return () => {
      window.removeEventListener('online', recheck);
      window.clearInterval(timer);
    };
  }, [state]);

  if (state === 'CHECKING') {
    return <GuardLoadingScreen />;
  }

  if (state === 'REVOKED') {
    return <Navigate to="/" replace />;
  }

  if (state === 'PENDING') {
    return <Navigate to="/activar-cuenta" replace />;
  }

  if (state === 'ERROR') {
    return (
      <GuardBlockingScreen
        onRetry={() => {
          // Regla de eslint react-hooks/set-state-in-effect: el reset a
          // CHECKING se hace aqui, en el handler que dispara el reintento,
          // no dentro del cuerpo del efecto - el efecto solo reacciona al
          // cambio de `attempt` y hace la consulta.
          setState('CHECKING');
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  return <Outlet />;
}
