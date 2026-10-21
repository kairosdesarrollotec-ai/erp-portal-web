import { transversalApiClient } from '../../api/transversal-api-client';

/**
 * TR-01, punto 11 (eventos auditables): registra el intento de login
 * (exito/fallo) - nunca envía la contraseña. Ver POST /audit/login-attempts
 * en packages/contracts/openapi/transversal.yaml (repo backend).
 *
 * Se llama en modo "fire-and-forget" desde useLogin (nunca debe bloquear
 * la navegacion del usuario) y con un timeout corto para no dejar
 * conexiones colgadas si el backend no responde.
 */
export async function recordLoginAttempt(
  email: string,
  outcome: 'SUCCESS' | 'FAILURE',
  reason: string | null,
): Promise<void> {
  // El contrato exige un correo válido: sin él (p. ej. el reto MFA perdió el dato) no se envía nada.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    await transversalApiClient.POST('/audit/login-attempts', {
      body: { email, outcome, reason: reason ? reason.slice(0, 200) : undefined },
      signal: controller.signal,
    });
  } catch {
    // El registro de auditoria nunca debe bloquear el flujo de login del
    // usuario si el backend no esta disponible o responde lento.
  } finally {
    clearTimeout(timeoutId);
  }
}
