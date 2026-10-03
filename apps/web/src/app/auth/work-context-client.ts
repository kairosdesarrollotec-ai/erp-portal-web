import type { WorkerRole } from '../dashboard/worker-role';
import { transversalApiClient } from '../../api/transversal-api-client';

export interface WorkContextAssignment {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
  role: WorkerRole;
}

/**
 * TR-05 - cliente HTTP del modulo `users` del backend (HU-23). Ambos
 * endpoints requieren el ID token de Firebase del usuario ya autenticado
 * (FirebaseAuthGuard), igual que activation-client.ts (TR-02).
 */
export async function getWorkContextAssignments(
  idToken: string,
): Promise<WorkContextAssignment[]> {
  const { data, error, response } = await transversalApiClient.GET('/users/me/assignments', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new Error(`No se pudo obtener las asignaciones de empresa/sede (${response.status})`);
  }
  return data.assignments as unknown as WorkContextAssignment[];
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
  const { error, response } = await transversalApiClient.POST('/users/me/work-context', {
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId },
  });
  if (error) {
    throw new Error(`No se pudo fijar el contexto de trabajo (${response.status})`);
  }
}
