import { getFirebaseAuth } from '../providers/firebase';

/**
 * H-10 (pruebas manuales 28-oct): el back solo guarda el UID de Firebase de quien registra; el nombre vive en Firebase.
 * Nunca se muestra el UID crudo: si coincide con la sesión actual se muestra el nombre (o correo) de la persona;
 * si no, una etiqueta genérica.
 */
export function userLabel(uid: string | null | undefined): string {
  if (!uid) return '';
  try {
    const current = getFirebaseAuth().currentUser;
    if (current && current.uid === uid) return current.displayName || current.email || 'tu usuario';
  } catch {
    // sin sesión de Firebase disponible (tests): se usa la etiqueta genérica
  }
  return 'otro usuario del equipo';
}
