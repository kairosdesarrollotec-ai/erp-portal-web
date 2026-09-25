import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';

/**
 * Hallazgo de revision PR#10 (finding #8, parte "guard de
 * autenticacion/contexto"): las rutas `/reservas` y `/reservas/:id` no
 * tenian ningun guard - se podia navegar directo a la URL sin sesion, y la
 * pantalla solo mostraba un error generico de carga (RECOVERABLE_ERROR) en
 * vez de mandar al usuario a iniciar sesion. La revalidacion de
 * empresa+sede (no confiar en `location.state`) ya se resuelve en
 * useWorkContextForReservations.ts, que siempre reconsulta
 * getWorkContextAssignments contra el backend; este guard cubre la otra
 * mitad: que exista una sesion de Firebase valida antes de renderizar
 * cualquier pantalla de reservas.
 *
 * Se usa `onAuthStateChanged` (no solo `auth.currentUser`) porque, justo
 * despues de recargar la pagina, Firebase todavia no termino de
 * rehidratar la sesion desde el storage local - leer `currentUser` de
 * forma sincrona en ese momento puede dar `null` aunque el usuario si
 * tenga sesion, mandandolo al login por error.
 */
export function RequireAuth() {
  const [status, setStatus] = useState<'CHECKING' | 'AUTHENTICATED' | 'ANONYMOUS'>('CHECKING');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setStatus(user ? 'AUTHENTICATED' : 'ANONYMOUS');
    });
    return unsubscribe;
  }, []);

  if (status === 'CHECKING') {
    return null;
  }

  if (status === 'ANONYMOUS') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
