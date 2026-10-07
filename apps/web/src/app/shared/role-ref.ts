/**
 * Referencia al rol del usuario en el contexto de trabajo vigente
 * (RoleRef de admin.yaml / transversal.yaml, roles dinámicos de ADM-02).
 *
 * El rol ya no es un enum cerrado: `name` es el nombre visible y lo edita el
 * administrador; `key` es el código estable de los roles de sistema
 * (ADMINISTRACION, GERENCIA, ...) y es null en los roles creados a mano.
 *
 * El acceso NO se decide por rol sino por permisos (ver usePermissions.ts).
 * Lo único que todavía usa `key` es shared/legacy-role-policy.ts (módulos que
 * el back aún autoriza por sets de roles: Devoluciones, Clientes y Flota).
 */
export interface RoleRef {
  id: string;
  name: string;
  key: string | null;
}

/**
 * PLATFORM_ADMIN es el unico rol de sistema fijo y no delegable (SDD 15.5): no
 * se renombra ni se edita desde ADM-02 (el back responde ROLE_NOT_EDITABLE) y
 * su tablero tiene una composicion propia. El contrato no expone un flag
 * "editable"/"fijo", por eso se identifica por su `key` estable. Es la unica
 * comparacion por `key` permitida fuera de legacy-role-policy.ts.
 */
export function isPlatformAdminRole(role: Pick<RoleRef, 'key'> | null): boolean {
  return role?.key === 'PLATFORM_ADMIN';
}
