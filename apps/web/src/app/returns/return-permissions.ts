/**
 * Permisos de Devoluciones. El back todavia autoriza este modulo por sets de
 * roles (no esta en la matriz de ADM-02), asi que la logica vive aislada en
 * shared/legacy-role-policy.ts hasta la fase 4 (migrar a permisos).
 */
export { canReturnAction, useReturnPermissions } from '../shared/legacy-role-policy';
export type { ReturnAction } from '../shared/legacy-role-policy';
