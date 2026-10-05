import { useWorkSession } from '../shared/useWorkSession';
import type { WorkerRole } from '../dashboard/worker-role';

/**
 * Espejo de solo lectura de return-role-policy.ts del backend (UX: ocultar o
 * deshabilitar acciones antes de recibir un 403). La seguridad real vive en el
 * backend. Si el rol aun no se conoce en la sesion (entrada directa por URL),
 * no se oculta nada y el backend decide.
 */
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

const FIELD_OPERATIONAL: ReadonlySet<WorkerRole> = new Set(['FRONT_OFFICE', 'ADMINISTRACION', 'GERENCIA', 'CAMPO']);

const POLICY: Record<ReturnAction, ReadonlySet<WorkerRole>> = {
  CREATE: new Set(['FRONT_OFFICE', 'ADMINISTRACION', 'GERENCIA']),
  RECEIVE_PROVISIONAL: FIELD_OPERATIONAL,
  REGISTER_ALCOHOL_TEST: FIELD_OPERATIONAL,
  // Gerencia decide ante alcolimetro desfavorable (el backend acepta Gerencia/Subgerencia;
  // Subgerencia aun no existe como WorkerRole en el portal).
  RESOLVE_ALCOHOL_ESCALATION: new Set(['GERENCIA']),
  COMPLETE_INSPECTION: FIELD_OPERATIONAL,
  ASSESS_DAMAGE: new Set(['ADMINISTRACION', 'GERENCIA']),
  CHARGE_IMMOBILIZATION: new Set(['ADMINISTRACION', 'GERENCIA', 'FINANZAS']),
  CLOSE_FINANCIAL: new Set(['FINANZAS', 'ADMINISTRACION', 'GERENCIA']),
  CLOSE: new Set(['ADMINISTRACION', 'GERENCIA']),
  UPLOAD_EVIDENCE: FIELD_OPERATIONAL,
};

export function canReturnAction(role: WorkerRole | null, action: ReturnAction): boolean {
  if (role === null) return true;
  if (role === 'PLATFORM_ADMIN') return true;
  return POLICY[action].has(role);
}

export function useReturnPermissions() {
  const role = useWorkSession((s) => s.role);
  return { role, can: (action: ReturnAction) => canReturnAction(role, action) };
}
