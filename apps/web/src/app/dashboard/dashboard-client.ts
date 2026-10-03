import type { WorkerRole } from './worker-role';
import { transversalApiClient } from '../../api/transversal-api-client';

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
  const { data, error, response } = await transversalApiClient.GET('/users/me/dashboard', {
    params: { query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new Error(`No se pudo obtener el tablero (${response.status})`);
  }
  return data as unknown as DashboardResult;
}
