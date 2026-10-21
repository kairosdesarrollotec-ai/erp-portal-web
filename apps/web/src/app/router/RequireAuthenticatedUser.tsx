import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { GuardLoadingScreen } from './GuardScreens';
import { useSessionTimeout } from '../shared/useSessionTimeout';

type AuthGuardState = 'CHECKING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

/**
 * Guard de ruta central - hallazgo de revision: `/activar-cuenta` y
 * `/tablero` no deben ser accesibles directamente sin sesion (por ejemplo
 * escribiendo la URL a mano), sin depender solo de que la navegacion previa
 * (login) haya ocurrido en esta misma pestana.
 *
 * Usa `onAuthStateChanged` (no `auth.currentUser` de forma sincronica)
 * porque Firebase todavia puede estar resolviendo la sesion persistida
 * (localStorage) en el primer render - leer `currentUser` de inmediato
 * expulsaria de forma incorrecta a un usuario ya autenticado que solo
 * recargo la pagina.
 */
/** SEC-F3: vigila inactividad/duracion de la sesion mientras hay un usuario autenticado. */
function SessionTimeoutWatcher() {
  useSessionTimeout();
  return null;
}

export function RequireAuthenticatedUser() {
  const [state, setState] = useState<AuthGuardState>('CHECKING');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setState(user ? 'AUTHENTICATED' : 'UNAUTHENTICATED');
    });
    return unsubscribe;
  }, []);

  if (state === 'CHECKING') {
    return <GuardLoadingScreen />;
  }

  if (state === 'UNAUTHENTICATED') {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <SessionTimeoutWatcher />
      <Outlet />
    </>
  );
}
