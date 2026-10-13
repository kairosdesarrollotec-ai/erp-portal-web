import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { getMyProfile, type UserProfileResponse } from './profile-client';

export type UserProfileScreenState = 'LOADING' | 'READY' | 'ERROR';

export interface UserProfileData extends UserProfileResponse {
  /** Metadatos de Firebase Auth (reales; null si no existen). */
  creationTime: string | null;
  lastSignInTime: string | null;
}

/** TR-09: carga el perfil desde GET /users/me/profile. Sin datos de relleno: ante error, estado ERROR. */
export function useUserProfile() {
  const [state, setState] = useState<UserProfileScreenState>('LOADING');
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setState('LOADING');
    setError(null);

    const user = getFirebaseAuth().currentUser;
    if (!user) {
      setProfile(null);
      setState('ERROR');
      setError('No hay sesión de usuario activa.');
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const data = await getMyProfile(idToken);
      setProfile({
        ...data,
        creationTime: user.metadata?.creationTime ?? null,
        lastSignInTime: user.metadata?.lastSignInTime ?? null,
      });
      setState('READY');
    } catch (err) {
      setProfile(null);
      setState('ERROR');
      setError(err instanceof Error ? err.message : 'No se pudo cargar el perfil.');
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return { state, profile, error, reload: loadProfile };
}
