const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

/**
 * TR-01, punto 11 (eventos auditables): registra el intento de login
 * (exito/fallo) - nunca envia la contrasena. Ver POST /audit/login-attempts
 * en packages/contracts/openapi/transversal.yaml (repo backend).
 */
export async function recordLoginAttempt(
  email: string,
  outcome: 'SUCCESS' | 'FAILURE',
  reason: string | null,
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/audit/login-attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, outcome, reason: reason ?? undefined }),
    });
  } catch {
    // El registro de auditoria nunca debe bloquear el flujo de login del
    // usuario si el backend no esta disponible.
  }
}
