import { can, usePermissions } from '../shared/usePermissions';

/**
 * Permisos de Administracion de Personal por PERMISO (modulo HR_ADMINISTRATION del
 * catalogo de ADM-02), no por rol. Fuente: hr-administration.yaml v0.2.0 y
 * PANTALLAS-V2-B-ADMINISTRACION-PERSONAL (ADP-01..10):
 *  - ADP-01: VIEW_EMPLOYEES (ver) y MANAGE_EMPLOYEES (aplicar descuentos de fin de mes).
 *  - ADP-02/03: LOG_ATTENDANCE (registrar marcacion y justificar).
 *  - ADP-04: AUTHORIZE_LEAVE (solo quien lo tenga ve Aprobar/Denegar).
 *  - ADP-05: SCHEDULE_VACATION. ADP-06: REQUEST_FIELD_TRIP.
 *  - ADP-07: AUTHORIZE_FIELD_TRIP. ADP-08: EVALUATE_FIELD_TRIP_RETURN.
 *  - ADP-09: TERMINATE_EMPLOYMENT.
 *  - ADP-10: REGISTER_TRAINING (registrar talleres internos).
 *  - hr-administration 0.8.0: MANAGE_AREAS (alta y activar/desactivar áreas; solo Gerencia General) y MANAGE_SALARY
 *    (cambiar el sueldo base de una ficha; solo Gerencia).
 *  - hr-administration 0.10.0 (22-oct #9): LOG_OWN_ATTENDANCE (marcar la propia asistencia), REVIEW_ATTENDANCE (revisar marcas fuera de
 *    la geocerca), MANAGE_GEOFENCE (configurar la geocerca por sede) y VIEW_EMPLOYEE_DOCUMENT (ver el DNI).
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
  | 'TERMINATE_EMPLOYMENT'
  | 'REGISTER_TRAINING'
  | 'MANAGE_AREAS'
  | 'MANAGE_SALARY'
  | 'LOG_OWN_ATTENDANCE'
  | 'REVIEW_ATTENDANCE'
  | 'MANAGE_GEOFENCE'
  | 'VIEW_EMPLOYEE_DOCUMENT'
  | 'MANAGE_HR_DOCUMENTS'
  | 'VIEW_HR_DOCUMENTS'
  | 'CONFIRM_HR_DOCUMENT_READ'
  | 'VIEW_EMPLOYEE_SENSITIVE_DATA'
  | 'MANAGE_EXPECTATION_DOCUMENT';

export const HR_MODULE = 'HR_ADMINISTRATION';

/** Funcion pura sobre un conjunto de permisos concedidos. */
export function canHrAction(granted: ReadonlySet<string>, action: HrAction): boolean {
  return can(granted, HR_MODULE, action);
}

export function useHrPermissions() {
  const { can: canPermission, ready } = usePermissions();
  return { ready, can: (action: HrAction) => canPermission(HR_MODULE, action) };
}
