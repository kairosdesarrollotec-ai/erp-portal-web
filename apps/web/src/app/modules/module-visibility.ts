import type { ModuleItem } from './module-definitions';

/**
 * Visibilidad de un modulo en el hub (/modulos) y en el menu lateral, por
 * PERMISOS (no por rol): un modulo con `requiredPermissions` solo se muestra si
 * el usuario tiene AL MENOS uno de ellos (Admin: cualquier accion ADMIN.*;
 * Incidencias: INCIDENT.VIEW). Mientras los permisos cargan, o si fallan, los
 * modulos restringidos se ocultan (deny-by-default).
 */
export function isModuleVisible(
  item: ModuleItem,
  can: (module: string, action: string) => boolean,
): boolean {
  if (!item.requiredPermissions) return true;
  return item.requiredPermissions.some((p) => can(p.module, p.action));
}
