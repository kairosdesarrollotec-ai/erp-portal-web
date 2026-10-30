import { transversalApiClient } from '../../api/transversal-api-client';

/** Error con la respuesta HTTP del servidor (distingue un 401/403 de un fallo de red, V-27). */
export class ActivationApiError extends Error {
  readonly name = 'ActivationApiError';
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

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
  const { data, error, response } = await transversalApiClient.GET('/users/me/activation-status', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new ActivationApiError(`No se pudo obtener el estado de activacion (${response.status})`, response.status);
  }
  return data as unknown as ActivationStatus;
}

export async function completeActivation(idToken: string): Promise<void> {
  const { error, response } = await transversalApiClient.POST('/users/me/complete-activation', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error) {
    throw new ActivationApiError(`No se pudo completar la activacion (${response.status})`, response.status);
  }
}
