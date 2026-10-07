import { isPlatformAdminRole, type RoleRef } from './role-ref';
import { useWorkSession } from './useWorkSession';

/**
 * ============================================================================
 * TODO fase 4: migrar a permisos.
 *
 * UNICO modulo del front que todavia decide acceso por el `key` del rol de
 * sesion. Cubre los modulos que el back aun autoriza por sets de roles
 * (*-role-policy.ts) y que NO estan en la matriz de ADM-02 / catalogo de
 * permisos: Devoluciones (return-role-policy), Clientes (customer-role.policy)
 * y Flota (fleet-role.policy). Cuando la fase 4 los migre a la matriz (un PR
 * por modulo) se borra su tabla de aqui y se pasa a usePermissions().
 *
 * No se inventan permisos que el back no tenga. Un rol creado a mano
 * (`key === null`) no esta en ningun set: queda denegado en estos modulos hasta
 * la fase 4. Si el rol de sesion aun no se conoce (entrada directa por URL) el
 * comportamiento es el previo de cada modulo (ver cada funcion).
 *
 * Nadie fuera de este archivo debe comparar `role.key` ni nombres de rol.
 * ============================================================================
 */

type LegacyRoleKey =
  | 'ADMINISTRACION'
  | 'AUDITORIA'
  | 'CAMPO'
  | 'FINANZAS'
  | 'FRONT_OFFICE'
  | 'GERENCIA'
  | 'PLATFORM_ADMIN'
  | 'RRHH';

type RoleSet = ReadonlySet<string>;
const set = (...keys: LegacyRoleKey[]): RoleSet => new Set<string>(keys);

function keyIn(role: RoleRef | null, allowed: RoleSet): boolean {
  return role !== null && role.key !== null && allowed.has(role.key);
}

// ---------------------------------------------------------------------------
// Flota y Clientes (fleet-role.policy.ts, customer-role.policy.ts)
// ---------------------------------------------------------------------------
export type LegacyModule = 'FLEET' | 'CUSTOMER';
export type LegacyReadWriteAction = 'READ' | 'WRITE';

const FLEET_WRITE = set('GERENCIA', 'ADMINISTRACION', 'CAMPO', 'PLATFORM_ADMIN');
const FLEET_READ = set('GERENCIA', 'ADMINISTRACION', 'CAMPO', 'FRONT_OFFICE', 'FINANZAS', 'AUDITORIA', 'PLATFORM_ADMIN');
const CUSTOMER_WRITE = set('GERENCIA', 'ADMINISTRACION', 'FRONT_OFFICE', 'PLATFORM_ADMIN');
const CUSTOMER_READ = set('GERENCIA', 'ADMINISTRACION', 'CAMPO', 'FRONT_OFFICE', 'FINANZAS', 'AUDITORIA', 'PLATFORM_ADMIN');

/** Rol de sesion desconocido => denegado (comportamiento previo de Flota/Clientes). */
export function canLegacyModule(role: RoleRef | null, module: LegacyModule, action: LegacyReadWriteAction): boolean {
  if (module === 'FLEET') return keyIn(role, action === 'WRITE' ? FLEET_WRITE : FLEET_READ);
  return keyIn(role, action === 'WRITE' ? CUSTOMER_WRITE : CUSTOMER_READ);
}

// ---------------------------------------------------------------------------
// Devoluciones (return-role-policy.ts)
// ---------------------------------------------------------------------------
export type ReturnAction =
  | 'CREATE'
  | 'RECEIVE_PROVISIONAL'
  | 'REGISTER_ALCOHOL_TEST'
  | 'RESOLVE_ALCOHOL_ESCALATION'
  | 'COMPLETE_INSPECTION'
  | 'ASSESS_DAMAGE'
  | 'CHARGE_IMMOBILIZATION'
  | 'CLOSE_FINANCIAL'
  | 'CLOSE'
  | 'UPLOAD_EVIDENCE';

const FIELD_OPERATIONAL = set('FRONT_OFFICE', 'ADMINISTRACION', 'GERENCIA', 'CAMPO');

const RETURN_POLICY: Record<ReturnAction, RoleSet> = {
  CREATE: set('FRONT_OFFICE', 'ADMINISTRACION', 'GERENCIA'),
  RECEIVE_PROVISIONAL: FIELD_OPERATIONAL,
  REGISTER_ALCOHOL_TEST: FIELD_OPERATIONAL,
  // Gerencia decide ante alcolimetro desfavorable (el backend acepta Gerencia/Subgerencia).
  RESOLVE_ALCOHOL_ESCALATION: set('GERENCIA'),
  COMPLETE_INSPECTION: FIELD_OPERATIONAL,
  ASSESS_DAMAGE: set('ADMINISTRACION', 'GERENCIA'),
  CHARGE_IMMOBILIZATION: set('ADMINISTRACION', 'GERENCIA', 'FINANZAS'),
  CLOSE_FINANCIAL: set('FINANZAS', 'ADMINISTRACION', 'GERENCIA'),
  CLOSE: set('ADMINISTRACION', 'GERENCIA'),
  UPLOAD_EVIDENCE: FIELD_OPERATIONAL,
};

/**
 * Rol de sesion desconocido (entrada directa por URL) => no se oculta nada y
 * el backend decide (comportamiento previo de Devoluciones).
 */
export function canReturnAction(role: RoleRef | null, action: ReturnAction): boolean {
  if (role === null) return true;
  if (isPlatformAdminRole(role)) return true;
  return keyIn(role, RETURN_POLICY[action]);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
export function useLegacyModulePermissions() {
  const role = useWorkSession((s) => s.role);
  return { can: (module: LegacyModule, action: LegacyReadWriteAction) => canLegacyModule(role, module, action) };
}

export function useReturnPermissions() {
  const role = useWorkSession((s) => s.role);
  return { role, can: (action: ReturnAction) => canReturnAction(role, action) };
}
