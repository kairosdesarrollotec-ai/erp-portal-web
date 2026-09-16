const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface WorkContextAssignment {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

/**
 * TR-05 - cliente HTTP del modulo `users` del backend (HU-23). Ambos
 * endpoints requieren el ID token de Firebase del usuario ya autenticado
 * (FirebaseAuthGuard), igual que activation-client.ts (TR-02).
 */
export async function getWorkContextAssignments(
  idToken: string,
): Promise<WorkContextAssignment[]> {
  const response = await fetch(`${API_BASE_URL}/users/me/assignments`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener las asignaciones de empresa/sede (${response.status})`);
  }
  const body = (await response.json()) as { assignments: WorkContextAssignment[] };
  return body.assignments;
}

/**
 * Fija el contexto elegido en TR-05. El backend valida server-side que la
 * combinacion sea una asignacion vigente del usuario (BR-ORG-002) - un 403
 * aqui significa que el cliente envio algo que no le pertenece, nunca se
 * debe reintentar automaticamente.
 */
export async function selectWorkContext(
  idToken: string,
  companyId: string,
  branchId: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/me/work-context`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, branchId }),
  });
  if (!response.ok) {
    throw new Error(`No se pudo fijar el contexto de trabajo (${response.status})`);
  }
}
