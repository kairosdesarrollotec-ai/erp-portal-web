import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';

/**
 * Hallazgo de revision PR#11 (cubierto por "Contexto incompleto" /
 * "aislamiento multiempresa" en la lista de verificación): las rutas de
 * Consulta (`/consultas*`) no tenían ningún guard - se podía navegar
 * directo a la URL sin sesión. Mismo componente que el introducido en la
 * revisión de PR#10 para las rutas de Reserva.
 *
 * Se usa `onAuthStateChanged` (no solo `auth.currentUser`) porque, justo
 * después de recargar la página, Firebase todavía no terminó de
 * rehidratar la sesión desde el storage local - leer `currentUser` de
 * forma síncrona en ese momento puede dar `null` aunque el usuario sí
 * tenga sesión, mandándolo al login por error.
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
