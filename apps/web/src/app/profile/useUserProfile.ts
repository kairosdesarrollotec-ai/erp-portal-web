import { useQuery } from '@tanstack/react-query';
import { getFirebaseAuth } from '../providers/firebase';
import { getMyProfile, type UserProfileResponse } from './profile-client';

export type UserProfileScreenState = 'LOADING' | 'READY' | 'ERROR';

export interface UserProfileData extends UserProfileResponse {
  /** Metadatos de Firebase Auth (reales; null si no existen). */
  creationTime: string | null;
  lastSignInTime: string | null;
}

async function fetchUserProfile(): Promise<UserProfileData> {
  const auth = getFirebaseAuth();
  // Espera a que Firebase restaure la sesión (necesario en hard-refresh antes de onAuthStateChanged).
  const user = await new Promise<(typeof auth)['currentUser']>((resolve) => {
    const unsub = auth.onAuthStateChanged((u) => { unsub(); resolve(u); });
  });
  if (!user) throw new Error('No hay sesión de usuario activa.');
  const idToken = await user.getIdToken();
  const data = await getMyProfile(idToken);
  return {
    ...data,
    creationTime: user.metadata?.creationTime ?? null,
    lastSignInTime: user.metadata?.lastSignInTime ?? null,
  };
}

/** TR-09: carga el perfil desde GET /users/me/profile. Sin datos de relleno: ante error, estado ERROR. */
export function useUserProfile() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
    retry: 1,
  });

  const state: UserProfileScreenState = isPending ? 'LOADING' : isError ? 'ERROR' : 'READY';
  const errorMessage = isError
    ? (error instanceof Error ? error.message : 'No se pudo cargar el perfil.')
    : null;

  return { state, profile: data ?? null, error: errorMessage, reload: refetch };
}
