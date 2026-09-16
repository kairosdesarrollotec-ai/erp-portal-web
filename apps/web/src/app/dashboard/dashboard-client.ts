import type { WorkerRole } from './worker-role';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface DashboardResult {
  role: WorkerRole;
  state: 'EMPTY';
}

/**
 * TR-06 - cliente HTTP del endpoint de tablero (HU-24). Igual que
 * work-context-client.ts (TR-05), el companyId/branchId se validan
 * siempre server-side contra la asignacion real del usuario
 * (BR-ORG-002) - un 403 aqui significa que el cliente envio algo que no
 * le pertenece.
 */
export async function getDashboard(
  idToken: string,
  companyId: string,
  branchId: string,
): Promise<DashboardResult> {
  const response = await fetch(
    `${API_BASE_URL}/users/me/dashboard?companyId=${encodeURIComponent(companyId)}&branchId=${encodeURIComponent(branchId)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );
  if (!response.ok) {
    throw new Error(`No se pudo obtener el tablero (${response.status})`);
  }
  return (await response.json()) as DashboardResult;
}
