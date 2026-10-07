/**
 * Referencia al rol del usuario en el contexto de trabajo vigente
 * (RoleRef de admin.yaml / transversal.yaml, roles dinámicos de ADM-02).
 *
 * El rol ya no es un enum cerrado: `name` es el nombre visible y lo edita el
 * administrador; `key` es el código estable de los roles de sistema
 * (ADMINISTRACION, GERENCIA, ...) y es null en los roles creados a mano.
 *
 * El acceso NO se decide por rol sino por permisos (ver usePermissions.ts).
 */
export interface RoleRef {
  id: string;
  name: string;
  key: string | null;
}

/**
 * PLATFORM_ADMIN es el unico rol de sistema fijo y no delegable. El acceso
 * NO se decide por rol sino por permisos (ver usePermissions.ts).
 * Es la unica comparacion por `key` permitida directamente por el codigo de la app.
 */
export function isPlatformAdminRole(role: Pick<RoleRef, 'key'> | null): boolean {
  return role?.key === 'PLATFORM_ADMIN';
}
