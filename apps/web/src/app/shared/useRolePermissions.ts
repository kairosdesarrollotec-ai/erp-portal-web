import { usePermissions } from './usePermissions';

/**
 * Fachada de permisos de los modulos de negocio de consulta/alta (UX: ocultar
 * acciones antes de recibir un 403; la seguridad real vive en el backend).
 *
 * Todos los modulos se evaluan por PERMISO (GET /me/permissions) via la
 * matriz de ADM-02. FLEET, CUSTOMER y RETURN fueron migrados en fase 4.
 */
type InquiryAction = 'READ' | 'REGISTER' | 'QUOTE' | 'CLOSE' | 'CONVERT_TO_RESERVATION' | 'CONVERT_TO_RENTAL';
type ReservationAction =
  | 'READ_LIST'
  | 'READ_DETAIL'
  | 'CREATE'
  | 'REGISTER_PAYMENT'
  | 'REGISTER_DOCUMENTS'
  | 'CONFIRM'
  | 'CANCEL_CUSTOMER_REQUESTED_CHANGE'
  | 'CANCEL_NO_SHOW';
type FleetAction = 'READ' | 'WRITE' | 'CROSS_BRANCH';
type CustomerAction = 'READ' | 'WRITE';

export type PermissionModule = 'FLEET' | 'CUSTOMER' | 'INQUIRY' | 'RESERVATION';
type ActionFor<M extends PermissionModule> =
  M extends 'FLEET' ? FleetAction
  : M extends 'CUSTOMER' ? CustomerAction
  : M extends 'INQUIRY' ? InquiryAction
  : M extends 'RESERVATION' ? ReservationAction
  : never;

export function useRolePermissions() {
  const { can: canPermission } = usePermissions();

  function can<M extends PermissionModule>(module: M, action: ActionFor<M>): boolean {
    return canPermission(module, action);
  }

  return { can };
}
