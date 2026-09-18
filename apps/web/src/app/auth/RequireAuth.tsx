import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';

/**
 * Guard central de rutas (hallazgo de revision, PR #8): antes, `/tablero` y
 * `/seleccion-empresa-sede` no tenian ninguna verificacion propia - se
 * podia entrar por URL directa sin haber iniciado sesion. `/seleccion-
 * empresa-sede` en particular solo se "protegia" indirectamente porque
 * useWorkContext.load() revisa `getFirebaseAuth().currentUser` y redirige
 * si es null, pero eso corre DESPUES de que la pantalla ya se monto (un
 * flash) y ninguna otra ruta (como `/tablero`) tenia ni eso.
 *
 * Usa `onAuthStateChanged` en vez de leer `currentUser` una sola vez: al
 * recargar la pagina, Firebase todavia no restauro la sesion persistida en
 * el primer render sincronico - leer `currentUser` en ese instante da
 * `null` aunque el usuario SI tenga sesion, mandandolo a login por error.
 * Se espera al primer evento (que siempre llega, incluso sin sesion) antes
 * de decidir.
 *
 * Esto valida que existe un usuario autenticado, no un contexto de trabajo
 * ya elegido - la revalidacion server-side de las asignaciones/contexto ya
 * la hace cada pantalla dueña de sus propios datos (useWorkContext.ts para
 * TR-05). `/tablero` es todavia el placeholder de TR-06 (HealthCheckScreen,
 * pendiente de HU-24) - no hay contexto de trabajo real que revalidar ahi
 * todavia; cuando exista el tablero real, ese HU debe agregar su propia
 * revalidacion de contexto igual que TR-05 hace con las asignaciones.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'anonymous'>('checking');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setStatus(user ? 'authenticated' : 'anonymous');
    });
    return unsubscribe;
  }, []);

  if (status === 'checking') return null;
  if (status === 'anonymous') return <Navigate to="/" replace />;
  return <>{children}</>;
}
