import type { RoleRef } from '../shared/role-ref';

/** Asignación vigente de empresa/sede (WorkContextAssignment de transversal.yaml). */
export interface UserProfileAssignment {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
  role: RoleRef;
}

/** UserProfileResponse de transversal.yaml (GET /users/me/profile, TR-09). */
export interface UserProfileResponse {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  organizationId: string;
  requiresPasswordChange: boolean;
  mfaEnrolled: boolean;
  mfaEnrolledAt: string | null;
  assignments: UserProfileAssignment[];
}

/**
 * TR-09: consulta el perfil consolidado del usuario autenticado.
 * Lanza un Error si la respuesta no es 2xx (el llamador muestra estado ERROR con reintento).
 * Nota: el endpoint aún no figura en transversal.generated.ts, por eso se usa fetch tipado.
 */
export async function getMyProfile(idToken: string): Promise<UserProfileResponse> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
  const res = await globalThis.fetch(`${baseUrl}/users/me/profile`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`No se pudo obtener el perfil (${res.status})`);
  }
  return (await res.json()) as UserProfileResponse;
}
