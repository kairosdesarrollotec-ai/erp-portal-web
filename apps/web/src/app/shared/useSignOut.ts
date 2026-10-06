import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { useWorkSession } from './useWorkSession';
import { usePermissionsStore } from './usePermissions';

export function useSignOut() {
  const navigate = useNavigate();
  const clearSession = useWorkSession((s) => s.clearSession);

  return async function handleSignOut() {
    clearSession();
    usePermissionsStore.getState().reset();
    try {
      await signOut(getFirebaseAuth());
    } finally {
      navigate('/');
    }
  };
}
