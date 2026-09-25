import type { WorkerRole } from './worker-role';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface DashboardTaskItem {
  id: string;
  itemType: string;
  priority: number;
  title: string;
  detail: string | null;
  deepLink: string;
}

export type DashboardResult =
  | { role: WorkerRole; state: 'EMPTY' }
  | { role: WorkerRole; state: 'READY'; tasks: DashboardTaskItem[] };

/**
 * TR-06 - cliente HTTP del endpoint de tablero (HU-24). Igual que
 * work-context-client.ts (TR-05), el companyId/branchId se validan
 * siempre server-side contra la asignacion real del usuario
 * (BR-ORG-002) - un 403 aqui significa que el cliente envio algo que no
 * le pertenece.
 *
 * `state: 'READY'` + `tasks` es una extension aditiva del contrato
 * (23 sep 2026, ver DashboardResponse.ts en el backend) - hoy solo
 * llega poblado para el rol Front-office (ciclo de vida de Reserva);
 * el resto de los 7 roles sigue recibiendo siempre `EMPTY` porque sus
 * modulos de dominio (Alquiler, Devolucion, Reclutamiento, RR.HH.)
 * todavia no proyectan eventos.
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
