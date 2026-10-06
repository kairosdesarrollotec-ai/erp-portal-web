import { usePermissions } from './usePermissions';
import { useLegacyModulePermissions, type LegacyReadWriteAction } from './legacy-role-policy';

/**
 * Fachada de permisos de los modulos de negocio de consulta/alta (UX: ocultar
 * acciones antes de recibir un 403; la seguridad real vive en el backend).
 *
 *  - INQUIRY y RESERVATION estan en la matriz de ADM-02: se evaluan por
 *    PERMISO con GET /me/permissions (usePermissions), con los nombres de
 *    accion del catalogo del back (PERMISSION_ACTION_CATALOG).
 *  - FLEET y CUSTOMER todavia se autorizan en el back por sets de roles y no
 *    estan en la matriz: su logica vive aislada en shared/legacy-role-policy.ts
 *    (TODO fase 4: migrar a permisos).
 */
type InquiryAction = 'READ' | 'REGISTER' | 'QUOTE' | 'CLOSE' | 'CONVERT_TO_RESERVATION';
type ReservationAction =
  | 'READ_LIST'
  | 'READ_DETAIL'
  | 'CREATE'
  | 'REGISTER_PAYMENT'
  | 'REGISTER_DOCUMENTS'
  | 'CONFIRM'
  | 'CANCEL_CUSTOMER_REQUESTED_CHANGE'
  | 'CANCEL_NO_SHOW';

export type PermissionModule = 'FLEET' | 'CUSTOMER' | 'INQUIRY' | 'RESERVATION';
type ActionFor<M extends PermissionModule> =
  M extends 'FLEET' | 'CUSTOMER' ? LegacyReadWriteAction
  : M extends 'INQUIRY' ? InquiryAction
  : M extends 'RESERVATION' ? ReservationAction
  : never;

export function useRolePermissions() {
  const { can: canPermission } = usePermissions();
  const { can: canLegacy } = useLegacyModulePermissions();

  function can<M extends PermissionModule>(module: M, action: ActionFor<M>): boolean {
    if (module === 'FLEET' || module === 'CUSTOMER') {
      return canLegacy(module, action as LegacyReadWriteAction);
    }
    return canPermission(module, action);
  }

  return { can };
}
