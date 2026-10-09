import { can, usePermissions } from '../shared/usePermissions';

/**
 * Permisos de Administracion de Personal por PERMISO (modulo HR_ADMINISTRATION del
 * catalogo de ADM-02), no por rol. Fuente: hr-administration.yaml v0.1.0 y
 * PANTALLAS-V2-B-ADMINISTRACION-PERSONAL (ADP-01..10):
 *  - ADP-01: VIEW_EMPLOYEES (ver) y MANAGE_EMPLOYEES (aplicar descuentos de fin de mes).
 *  - ADP-02/03: LOG_ATTENDANCE (registrar marcacion y justificar).
 *  - ADP-04: AUTHORIZE_LEAVE (solo quien lo tenga ve Aprobar/Denegar).
 *  - ADP-05: SCHEDULE_VACATION. ADP-06: REQUEST_FIELD_TRIP.
 *  - ADP-07: AUTHORIZE_FIELD_TRIP. ADP-08: EVALUATE_FIELD_TRIP_RETURN.
 *  - ADP-09: TERMINATE_EMPLOYMENT.
 * Mientras los permisos cargan (o si fallan) no se muestra ninguna accion.
 */
export type HrAction =
  | 'VIEW_EMPLOYEES'
  | 'MANAGE_EMPLOYEES'
  | 'LOG_ATTENDANCE'
  | 'AUTHORIZE_LEAVE'
  | 'SCHEDULE_VACATION'
  | 'REQUEST_FIELD_TRIP'
  | 'AUTHORIZE_FIELD_TRIP'
  | 'EVALUATE_FIELD_TRIP_RETURN'
  | 'TERMINATE_EMPLOYMENT';

export const HR_MODULE = 'HR_ADMINISTRATION';

/** Funcion pura sobre un conjunto de permisos concedidos. */
export function canHrAction(granted: ReadonlySet<string>, action: HrAction): boolean {
  return can(granted, HR_MODULE, action);
}

export function useHrPermissions() {
  const { can: canPermission, ready } = usePermissions();
  return { ready, can: (action: HrAction) => canPermission(HR_MODULE, action) };
}
