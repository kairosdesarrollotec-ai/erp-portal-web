import type { WorkerRole } from '../dashboard/worker-role';
import { canIncidentAction } from '../incidents/incident-permissions';
import type { ModuleItem } from './module-definitions';

/**
 * Visibilidad de un modulo en el hub (/modulos) y en el menu lateral.
 *  - adminOnly: solo ADMINISTRACION (provisional, hasta ADM-02). `unknownRoleVisible`
 *    controla si un rol aun no resuelto (entrada directa por URL) lo ve: el menu
 *    lateral si, el hub no (siempre tiene el rol resuelto).
 *  - incidentPermission: Incidencias se oculta a los roles sin permiso de lectura
 *    (INC-01: Front-office, Campo, Gerencia, Finanzas, Auditoria).
 */
export function isModuleVisible(item: ModuleItem, role: WorkerRole | null, unknownRoleVisible = false): boolean {
  if (item.adminOnly) return role === 'ADMINISTRACION' || (role === null && unknownRoleVisible);
  if (item.incidentPermission) return canIncidentAction(role, item.incidentPermission);
  return true;
}
