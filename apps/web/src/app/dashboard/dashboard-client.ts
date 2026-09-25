import { z } from 'zod';
import type { WorkerRole } from './worker-role';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const WORKER_ROLES = [
  'ADMINISTRACION',
  'AUDITORIA',
  'CAMPO',
  'FINANZAS',
  'FRONT_OFFICE',
  'GERENCIA',
  'RRHH',
] as const satisfies readonly WorkerRole[];

/**
 * Hallazgo de revision (PR #9, finding #1): antes `DashboardResult.state`
 * solo aceptaba el literal `'EMPTY'`, sin ninguna forma de representar los
 * demas estados del contrato TR-06 (punto 9: "READY, LOADING (skeleton),
 * EMPTY") ni de evolucionar sin romper el tipo. `LOADING` es un estado de
 * transicion del cliente mientras espera la respuesta, nunca algo que el
 * backend devuelva - el contrato de la respuesta HTTP solo necesita
 * `EMPTY` | `READY`.
 *
 * Declaracion formal de alcance (la otra opcion que ofrecia el hallazgo,
 * en vez de "modelar contra OpenAPI" - ver PROP-004 en decision-log.md del
 * backend): los modulos de dominio (Consulta, Reserva, Alquiler,
 * Devolucion, Reclutamiento, Administracion de Personal) todavia no
 * existen, asi que HOY el backend siempre devuelve `EMPTY` - `READY` esta
 * modelado aqui porque el contrato ya lo define y el tipo debe poder
 * representarlo sin otro cambio de contrato, pero esta pantalla (ver
 * DashboardScreen.tsx) sigue sin implementar la composicion de widgets de
 * `READY` (7 layouts distintos, uno por rol) - ese es trabajo pendiente
 * fuera de este slice, no algo que este PR declare terminado.
 */
const dashboardResultSchema = z.object({
  role: z.enum(WORKER_ROLES),
  state: z.enum(['EMPTY', 'READY']),
});

export type DashboardResult = z.infer<typeof dashboardResultSchema>;

/** Igual que WorkContextApiError (work-context-client.ts): permite distinguir
 * un fallo tecnico (401/403/5xx, respuesta con forma invalida) de un dato
 * de negocio real. */
export class DashboardApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DashboardApiError';
    this.status = status;
  }
}

/**
 * TR-06 - cliente HTTP del endpoint de tablero (HU-24). Igual que
 * work-context-client.ts (TR-05), el companyId/branchId se validan
 * siempre server-side contra la asignacion real del usuario
 * (BR-ORG-002) - un 403 aqui significa que el cliente envio algo que no
 * le pertenece. La respuesta se valida con zod (hallazgo de revision,
 * mismo criterio que work-context-client.ts): una respuesta con forma
 * invalida se trata como fallo tecnico, nunca como datos validos.
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
    throw new DashboardApiError(`No se pudo obtener el tablero (${response.status})`, response.status);
  }
  const rawBody: unknown = await response.json();
  const parsed = dashboardResultSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new DashboardApiError(
      'La respuesta del backend para el tablero no tiene el formato esperado',
      response.status,
    );
  }
  return parsed.data;
}
