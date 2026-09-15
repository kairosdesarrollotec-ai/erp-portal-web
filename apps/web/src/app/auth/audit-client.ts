const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    await fetch(`${API_BASE_URL}/audit/login-attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, outcome, reason: reason ?? undefined }),
      signal: controller.signal,
    });
  } catch {
    // El registro de auditoria nunca debe bloquear el flujo de login del
    // usuario si el backend no esta disponible o responde lento.
  } finally {
    clearTimeout(timeoutId);
  }
}
