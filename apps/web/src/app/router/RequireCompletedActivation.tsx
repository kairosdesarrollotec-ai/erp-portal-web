import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getActivationStatus } from '../auth/activation-client';
import { GuardBlockingScreen, GuardLoadingScreen } from './GuardScreens';

type ActivationGuardState = 'CHECKING' | 'COMPLETED' | 'PENDING' | 'ERROR';

/**
 * Guard de ruta - hallazgo de revision: `/tablero` no debe ser accesible
 * directamente sin pasar por la verificacion de activacion, ni asumir que
 * "no responde" equivale a "no requiere activacion" (ver fix del mismo
 * hallazgo en useLogin.ts). Solo se renderiza `/tablero` cuando el backend
 * confirma de forma expresa que ambos flags son `false`; un timeout/401/
 * 403/5xx deja al usuario en un estado bloqueante y reintentable, nunca
 * pasa de largo.
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
        setState(activationCompleted ? 'COMPLETED' : 'PENDING');
      } catch {
        if (!cancelled) setState('ERROR');
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state === 'CHECKING') {
    return <GuardLoadingScreen />;
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
