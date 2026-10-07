import { useWorkSession } from '../shared/useWorkSession';
import type { WorkerRole } from '../dashboard/worker-role';

/**
 * Espejo de solo lectura de la politica de roles de Incidencias (UX: ocultar
 * o deshabilitar acciones antes de recibir un 403; la seguridad real vive en
 * el backend). Fuente: UX/UI v3.1 §5.8 + incidents.yaml v0.1.0:
 *  - INC-01 (bandeja): Front-office, Campo, Gerencia, Finanzas, Auditoria.
 *  - INC-02 (detalle/cierre): Front-office, Gerencia.
 * ADMINISTRACION tambien ve el modulo (el hub de TR-11 muestra los 12 modulos a ese rol y
 * existe un test que lo exige); sus acciones no se amplian: DUDA DE DOCUMENTACION pendiente.
 * No existe un rol "Campo" propio de este modulo: se usa el WorkerRole `CAMPO`
 * ya definido. Si el rol aun no se conoce (entrada directa por URL) no se
 * oculta nada y el backend decide (mismo criterio que return-permissions.ts).
 */
export type IncidentAction = 'VIEW' | 'CREATE' | 'ADD_ACTION' | 'RESOLVE' | 'CLOSE' | 'REFER_LEGAL';

const VIEW: ReadonlySet<WorkerRole> = new Set(['FRONT_OFFICE', 'CAMPO', 'GERENCIA', 'FINANZAS', 'AUDITORIA', 'ADMINISTRACION']);
const DETAIL_OPERATIONAL: ReadonlySet<WorkerRole> = new Set(['FRONT_OFFICE', 'GERENCIA']);

const POLICY: Record<IncidentAction, ReadonlySet<WorkerRole>> = {
  VIEW,
  CREATE: new Set(['FRONT_OFFICE', 'CAMPO', 'GERENCIA']),
  ADD_ACTION: DETAIL_OPERATIONAL,
  RESOLVE: DETAIL_OPERATIONAL,
  CLOSE: DETAIL_OPERATIONAL,
  REFER_LEGAL: DETAIL_OPERATIONAL,
};

export function canIncidentAction(role: WorkerRole | null, action: IncidentAction): boolean {
  if (role === null) return true;
  if (role === 'PLATFORM_ADMIN') return true;
  return POLICY[action].has(role);
}

export function useIncidentPermissions() {
  const role = useWorkSession((s) => s.role);
  return { role, can: (action: IncidentAction) => canIncidentAction(role, action) };
}
