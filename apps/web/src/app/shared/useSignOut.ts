import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { useWorkSession } from './useWorkSession';
import { usePermissionsStore } from './usePermissions';
import { countPendingUnsyncedItems, discardUserCryptoKeys } from '../../offline/crypto/local-encryption';
import { purgeLocalSensitiveData } from '../../offline/crypto/sealed-store';

/** Texto del aviso cuando se cierra sesión con datos todavía sin sincronizar (SDD-00 §17.4). */
export function describePendingOnSignOut(pending: { evidence: number; fieldEdits: number; attendance: number }): string {
  const parts: string[] = [];
  if (pending.attendance > 0) parts.push(`${pending.attendance} marca(s) de asistencia`);
  if (pending.evidence > 0) parts.push(`${pending.evidence} foto(s) o video(s) sin subir`);
  if (pending.fieldEdits > 0) parts.push(`${pending.fieldEdits} dato(s) de checklist sin enviar`);
  return (
    `Tienes datos guardados en este dispositivo que aún no se sincronizaron: ${parts.join(', ')}. ` +
    'Si cierras sesión se borrarán y no se podrán recuperar. ¿Cerrar sesión de todos modos?'
  );
}

export function useSignOut() {
  const navigate = useNavigate();
  const clearSession = useWorkSession((s) => s.clearSession);

  return async function handleSignOut() {
    const currentUser = getFirebaseAuth().currentUser;

    // Avisar ANTES de descartar la clave y los datos locales: lo pendiente no se puede recuperar.
    try {
      const pending = await countPendingUnsyncedItems();
      if (pending.total > 0 && !window.confirm(describePendingOnSignOut(pending))) {
        return;
      }
    } catch {
      // si no se puede contar, se continúa con el cierre de sesión seguro
    }

    clearSession();
    usePermissionsStore.getState().reset();
    try {
      await purgeLocalSensitiveData();
    } catch {
      // no bloqueante
    }
    if (currentUser?.uid) {
      try {
        await discardUserCryptoKeys(currentUser.uid);
      } catch {
        // no bloqueante
      }
    }
    try {
      await signOut(getFirebaseAuth());
    } finally {
      navigate('/');
    }
  };
}
