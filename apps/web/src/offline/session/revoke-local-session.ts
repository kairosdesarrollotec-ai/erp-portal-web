import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../../app/providers/firebase';
import { useWorkSession } from '../../app/shared/useWorkSession';
import { usePermissionsStore } from '../../app/shared/usePermissions';
import { discardUserCryptoKeys } from '../crypto/local-encryption';
import { purgeLocalSensitiveData } from '../crypto/sealed-store';
import { clearOfflineSession } from './offline-session';
import { useOfflineMode } from './offline-mode';

/**
 * SDD-KAIROS-TRANSVERSAL §17.3 «Sesión revocada: bloquear acceso y proteger/eliminar datos locales».
 * Se usa cuando el servidor responde 401/403 al reverificar la cuenta (por ejemplo al volver la conexión).
 */
export async function revokeLocalSession(): Promise<void> {
  const uid = (() => {
    try {
      return getFirebaseAuth().currentUser?.uid ?? null;
    } catch {
      return null;
    }
  })();
  clearOfflineSession();
  useOfflineMode.getState().setActive(false);
  useWorkSession.getState().clearSession();
  usePermissionsStore.getState().reset();
  try {
    await purgeLocalSensitiveData();
  } catch {
    // no bloqueante
  }
  if (uid) {
    try {
      await discardUserCryptoKeys(uid);
    } catch {
      // no bloqueante
    }
  }
  try {
    await signOut(getFirebaseAuth());
  } catch {
    // no bloqueante
  }
}
