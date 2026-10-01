import { useWorkSession } from './useWorkSession';
import type { WorkerRole } from '../dashboard/worker-role';

/**
 * Espejo de solo lectura de los *-role-policy.ts del backend.
 * La seguridad real vive en el backend; esto es mejora de UX (ocultar acciones
 * no autorizadas antes de recibir un 403).
 *
 * Fuentes: fleet-role.policy.ts, customer-role.policy.ts,
 *          inquiry-role-policy.ts, reservation-role-policy.ts.
 */

type FleetAction = 'READ' | 'WRITE';
type CustomerAction = 'READ' | 'WRITE';
type InquiryAction = 'READ' | 'REGISTER' | 'QUOTE' | 'CLOSE' | 'CONVERT';
type ReservationAction =
  | 'READ_LIST'
  | 'READ_DETAIL'
  | 'CREATE'
  | 'REGISTER_PAYMENT'
  | 'CONFIRM'
  | 'CANCEL_CUSTOMER_REQUESTED_CHANGE'
  | 'CANCEL_NO_SHOW';

const FLEET_WRITE: ReadonlySet<WorkerRole> = new Set([
  'GERENCIA', 'ADMINISTRACION', 'CAMPO', 'PLATFORM_ADMIN',
]);
const FLEET_READ: ReadonlySet<WorkerRole> = new Set([
  'GERENCIA', 'ADMINISTRACION', 'CAMPO', 'FRONT_OFFICE', 'FINANZAS', 'AUDITORIA', 'PLATFORM_ADMIN',
]);

const CUSTOMER_WRITE: ReadonlySet<WorkerRole> = new Set([
  'GERENCIA', 'ADMINISTRACION', 'FRONT_OFFICE', 'PLATFORM_ADMIN',
]);
const CUSTOMER_READ: ReadonlySet<WorkerRole> = new Set([
  'GERENCIA', 'ADMINISTRACION', 'CAMPO', 'FRONT_OFFICE', 'FINANZAS', 'AUDITORIA', 'PLATFORM_ADMIN',
]);

const INQUIRY_READ: ReadonlySet<WorkerRole> = new Set([
  'FRONT_OFFICE', 'GERENCIA', 'AUDITORIA', 'ADMINISTRACION', 'PLATFORM_ADMIN',
]);
const INQUIRY_WRITE: ReadonlySet<WorkerRole> = new Set([
  'FRONT_OFFICE', 'PLATFORM_ADMIN',
]);

const RESERVATION_READ: ReadonlySet<WorkerRole> = new Set([
  'FRONT_OFFICE', 'GERENCIA', 'AUDITORIA', 'ADMINISTRACION', 'PLATFORM_ADMIN',
]);
const RESERVATION_OPERATIONAL: ReadonlySet<WorkerRole> = new Set([
  'FRONT_OFFICE', 'GERENCIA', 'ADMINISTRACION', 'PLATFORM_ADMIN',
]);
const RESERVATION_CANCEL_NO_SHOW: ReadonlySet<WorkerRole> = new Set([
  'GERENCIA', 'PLATFORM_ADMIN',
]);

function roleIn(role: WorkerRole | null, set: ReadonlySet<WorkerRole>): boolean {
  return role !== null && set.has(role);
}

export type PermissionModule = 'FLEET' | 'CUSTOMER' | 'INQUIRY' | 'RESERVATION';
type ActionFor<M extends PermissionModule> =
  M extends 'FLEET' ? FleetAction
  : M extends 'CUSTOMER' ? CustomerAction
  : M extends 'INQUIRY' ? InquiryAction
  : M extends 'RESERVATION' ? ReservationAction
  : never;

export function useRolePermissions() {
  const role = useWorkSession((s) => s.role);

  function can<M extends PermissionModule>(module: M, action: ActionFor<M>): boolean {
    if (role === null) return false;

    switch (module) {
      case 'FLEET':
        return action === 'WRITE' ? roleIn(role, FLEET_WRITE) : roleIn(role, FLEET_READ);

      case 'CUSTOMER':
        return action === 'WRITE' ? roleIn(role, CUSTOMER_WRITE) : roleIn(role, CUSTOMER_READ);

      case 'INQUIRY':
        if (action === 'READ') return roleIn(role, INQUIRY_READ);
        return roleIn(role, INQUIRY_WRITE);

      case 'RESERVATION':
        if (action === 'READ_LIST' || action === 'READ_DETAIL') return roleIn(role, RESERVATION_READ);
        if (action === 'CANCEL_NO_SHOW') return roleIn(role, RESERVATION_CANCEL_NO_SHOW);
        return roleIn(role, RESERVATION_OPERATIONAL);

      default:
        return false;
    }
  }

  return { can };
}
