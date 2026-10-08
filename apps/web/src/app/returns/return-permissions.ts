import { can, usePermissions } from '../shared/usePermissions';

/**
 * Permisos de Devoluciones via matriz ADM-02 (GET /me/permissions).
 * Migrado de legacy-role-policy.ts en fase 4.
 */

export type ReturnAction =
  | 'CREATE'
  | 'READ'
  | 'RECEIVE_PROVISIONAL'
  | 'REGISTER_ALCOHOL_TEST'
  | 'RESOLVE_ALCOHOL_ESCALATION'
  | 'COMPLETE_INSPECTION'
  | 'ASSESS_DAMAGE'
  | 'CHARGE_IMMOBILIZATION'
  | 'CLOSE_FINANCIAL'
  | 'CLOSE'
  | 'UPLOAD_EVIDENCE';

export function canReturnAction(granted: ReadonlySet<string>, action: ReturnAction): boolean {
  return can(granted, 'RETURN', action);
}

export function useReturnPermissions() {
  const { can: canPermission } = usePermissions();
  return { can: (action: ReturnAction) => canPermission('RETURN', action) };
}
