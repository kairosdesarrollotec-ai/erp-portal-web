import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { useWorkSession } from './useWorkSession';

export function useSignOut() {
  const navigate = useNavigate();
  const clearSession = useWorkSession((s) => s.clearSession);

  return async function handleSignOut() {
    clearSession();
    try {
      await signOut(getFirebaseAuth());
    } finally {
      navigate('/');
    }
  };
}
