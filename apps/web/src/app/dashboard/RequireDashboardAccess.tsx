import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { getActivationStatus } from '../auth/activation-client';

/**
 * Guard central de /tablero (hallazgo de revision, PR #9 finding #3):
 * antes la ruta no exigia nada - se podia entrar por URL directa sin
 * sesion, con "primer acceso" sin completar, o con un contexto de trabajo
 * nunca elegido (useDashboard.ts ya se defendia de esto ultimo con su
 * propio estado UNRESOLVED, pero eso corre DESPUES de montar la pantalla).
 *
 * Lo que este guard verifica, y por que:
 * - Usuario autenticado (Firebase). Usa `onAuthStateChanged`, no lee
 *   `currentUser` una sola vez - al recargar la pagina, Firebase todavia
 *   no restauro la sesion persistida en el primer render sincronico, y
 *   leer `currentUser` en ese instante da `null` aunque el usuario SI
 *   tenga sesion (mismo razonamiento que RequireAuth para TR-05, HU-23,
 *   PR #8 - este componente no puede reusar ese exactamente porque esta
 *   rama todavia no lo tiene mergeado, pero es la misma logica).
 * - Activacion completa (TR-02/HU-21): si el usuario esta en "primer
 *   acceso" (contrasena temporal sin cambiar y/o MFA sin enrolar), se
 *   redirige a /activar-cuenta en vez de dejarlo ver el tablero. Fail-open
 *   si el chequeo en si falla (red/backend) - mismo criterio que
 *   useLogin.ts, no bloquea a un usuario ya autenticado por una falla de
 *   este chequeo adicional.
 *
 * Lo que este guard NO verifica, y por que:
 * - "MFA" no es un chequeo aparte posible desde el cliente: Firebase exige
 *   resolver el segundo factor (TR-03) ANTES de que exista una sesion -
 *   si `onAuthStateChanged` entrega un usuario, ese usuario ya paso por
 *   MFA si lo tenia enrolado (no hay forma de "saltarselo" y llegar aqui
 *   con una sesion valida). Re-chequear esto en el cliente seria
 *   redundante, no una verificacion real adicional.
 * - "Contexto valido" (empresa/sede) no se duplica aqui: useDashboard.ts
 *   ya resuelve y valida el contexto contra el backend (hallazgo #2 de
 *   este mismo PR) antes de llamar al endpoint del tablero - duplicar esa
 *   logica en el guard solo la fragmentaria en dos lugares que podrian
 *   desincronizarse.
 */
export type DashboardGuardStatus = 'checking' | 'authenticated' | 'anonymous' | 'requires-activation';

export function RequireDashboardAccess({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DashboardGuardStatus>('checking');

  useEffect(() => {
    async function checkActivation(user: User) {
      try {
        const idToken = await user.getIdToken();
        const activationStatus = await getActivationStatus(idToken);
        if (activationStatus.requiresPasswordChange || activationStatus.requiresMfaEnrollment) {
          setStatus('requires-activation');
          return;
        }
      } catch {
        // Ver nota arriba - fail-open ante fallo tecnico del chequeo.
      }
      setStatus('authenticated');
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (!user) {
        setStatus('anonymous');
        return;
      }
      void checkActivation(user);
    });
    return unsubscribe;
  }, []);

  if (status === 'checking') return null;
  if (status === 'anonymous') return <Navigate to="/" replace />;
  if (status === 'requires-activation') return <Navigate to="/activar-cuenta" replace />;
  return <>{children}</>;
}
