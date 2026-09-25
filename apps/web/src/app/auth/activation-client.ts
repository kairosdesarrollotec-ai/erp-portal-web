const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface ActivationStatus {
  requiresPasswordChange: boolean;
  requiresMfaEnrollment: boolean;
}

/**
 * TR-02 - cliente HTTP del modulo `users` del backend (HU-21). Ambos
 * endpoints requieren el ID token de Firebase del usuario ya autenticado
 * (FirebaseAuthGuard) - ver PROP-001 en docs/decision-log.md del repo
 * backend: UserProfile todavia es un modelo PROPUESTO, pendiente de
 * validacion formal del equipo.
 */
export async function getActivationStatus(idToken: string): Promise<ActivationStatus> {
  const response = await fetch(`${API_BASE_URL}/users/me/activation-status`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener el estado de activacion (${response.status})`);
  }
  return response.json();
}

export async function completeActivation(idToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/me/complete-activation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok) {
    throw new Error(`No se pudo completar la activacion (${response.status})`);
  }
}
