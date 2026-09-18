import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface WorkContextAssignment {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

const workContextAssignmentSchema = z.object({
  companyId: z.string().min(1),
  companyName: z.string().min(1),
  branchId: z.string().min(1),
  branchName: z.string().min(1),
});

const workContextAssignmentsResponseSchema = z.object({
  assignments: z.array(workContextAssignmentSchema),
});

/**
 * Error de API tipado (hallazgo de revision del PR #8): antes de esto, tanto
 * un 401/403/5xx como un fallo de red terminaban como un `Error` generico
 * indistinguible de "la lista realmente vino vacia" - el catch de
 * useWorkContext no podia distinguir "no tiene asignaciones" de "no
 * pudimos preguntarle al backend". `status` queda en `0` para errores que
 * nunca llegaron a tener una respuesta HTTP (red caida, CORS, etc.).
 */
export class WorkContextApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'WorkContextApiError';
    this.status = status;
  }
}

/**
 * TR-05 - cliente HTTP del modulo `users` del backend (HU-23). Ambos
 * endpoints requieren el ID token de Firebase del usuario ya autenticado
 * (FirebaseAuthGuard), igual que activation-client.ts (TR-02).
 *
 * La respuesta se valida con zod (hallazgo de revision): un cast directo a
 * `{ assignments: WorkContextAssignment[] }` confiaba ciegamente en la
 * forma del JSON del backend - una respuesta invalida/incompleta pasaba
 * silenciosamente y podia romper la pantalla mas adelante (o peor, dejar
 * pasar un objeto a medio llenar). Una respuesta que no matchea el
 * contrato se trata igual que un fallo de red (WorkContextApiError),
 * nunca como "0 asignaciones reales".
 */
export async function getWorkContextAssignments(
  idToken: string,
): Promise<WorkContextAssignment[]> {
  const response = await fetch(`${API_BASE_URL}/users/me/assignments`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok) {
    throw new WorkContextApiError(
      `No se pudo obtener las asignaciones de empresa/sede (${response.status})`,
      response.status,
    );
  }
  const rawBody: unknown = await response.json();
  const parsed = workContextAssignmentsResponseSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new WorkContextApiError(
      'La respuesta del backend para las asignaciones de empresa/sede no tiene el formato esperado',
      response.status,
    );
  }
  return parsed.data.assignments;
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
    throw new WorkContextApiError(
      `No se pudo fijar el contexto de trabajo (${response.status})`,
      response.status,
    );
  }
}
