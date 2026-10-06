import { can, usePermissions } from '../shared/usePermissions';

/**
 * Permisos de Incidencias por PERMISO (modulo INCIDENT del catalogo de
 * ADM-02), no por rol. Fuente: UX/UI v3.1 §5.8 + incidents.yaml v0.1.0:
 *  - INC-01 (bandeja): INCIDENT.VIEW (y CREATE para registrar).
 *  - INC-02 (detalle/cierre): ADD_ACTION, RESOLVE, CLOSE, REFER_LEGAL.
 * Mientras los permisos cargan (o si fallan) no se muestra ninguna accion.
 */
export type IncidentAction = 'VIEW' | 'CREATE' | 'ADD_ACTION' | 'RESOLVE' | 'CLOSE' | 'REFER_LEGAL';

/** Funcion pura sobre un conjunto de permisos concedidos. */
export function canIncidentAction(granted: ReadonlySet<string>, action: IncidentAction): boolean {
  return can(granted, 'INCIDENT', action);
}

export function useIncidentPermissions() {
  const { can: canPermission } = usePermissions();
  return { can: (action: IncidentAction) => canPermission('INCIDENT', action) };
}
