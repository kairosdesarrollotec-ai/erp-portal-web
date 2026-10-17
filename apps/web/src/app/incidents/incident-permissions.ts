import { can, usePermissions } from '../shared/usePermissions';
import { useWorkSession } from '../shared/useWorkSession';
import { isManagementRole } from '../shared/role-ref';
import { requiresManagementDecision, type IncidentType } from './incident-domain';

/**
 * Permisos de Incidencias por PERMISO (modulo INCIDENT del catalogo de
 * ADM-02), no por rol. Fuente: UX/UI v3.1 §5.8 + incidents.yaml v0.1.0:
 *  - INC-01 (bandeja): INCIDENT.VIEW (y CREATE para registrar).
 *  - INC-02 (detalle/cierre): ADD_ACTION, RESOLVE, CLOSE, REFER_LEGAL.
 * Mientras los permisos cargan (o si fallan) no se muestra ninguna accion.
 *
 * Excepcion (DEC-ALQ-UNAUTH-DRIVER-003): en incidencias UNAUTHORIZED_DRIVER, RESOLVE / CLOSE /
 * REFER_LEGAL ademas exigen rol Gerencia (403 MANAGEMENT_DECISION_REQUIRED en el backend).
 */
export type IncidentAction = 'VIEW' | 'CREATE' | 'ADD_ACTION' | 'RESOLVE' | 'CLOSE' | 'REFER_LEGAL';

const DECISION_ACTIONS: readonly IncidentAction[] = ['RESOLVE', 'CLOSE', 'REFER_LEGAL'];

/** Funcion pura sobre un conjunto de permisos concedidos. */
export function canIncidentAction(granted: ReadonlySet<string>, action: IncidentAction): boolean {
  return can(granted, 'INCIDENT', action);
}

export function useIncidentPermissions() {
  const { can: canPermission } = usePermissions();
  const role = useWorkSession((s) => s.role);
  const isManagement = isManagementRole(role);
  return {
    isManagement,
    can: (action: IncidentAction, incident?: { type: IncidentType } | null) => {
      if (!canPermission('INCIDENT', action)) return false;
      if (incident && DECISION_ACTIONS.includes(action) && requiresManagementDecision(incident.type)) return isManagement;
      return true;
    },
  };
}
