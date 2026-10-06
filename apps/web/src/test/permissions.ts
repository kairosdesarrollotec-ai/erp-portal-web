import { usePermissionsStore, permissionKey } from '../app/shared/usePermissions';
import { useWorkSession } from '../app/shared/useWorkSession';
import type { RoleRef } from '../app/shared/role-ref';

/** Permisos efectivos de pruebas, en formato `MODULO.ACCION`. */
export const INCIDENT_VIEW_ONLY = ['INCIDENT.VIEW'] as const;
export const INCIDENT_FIELD = ['INCIDENT.VIEW', 'INCIDENT.CREATE'] as const;
export const INCIDENT_ALL = [
  'INCIDENT.VIEW',
  'INCIDENT.CREATE',
  'INCIDENT.ADD_ACTION',
  'INCIDENT.RESOLVE',
  'INCIDENT.CLOSE',
  'INCIDENT.REFER_LEGAL',
] as const;

export function roleRef(key: string | null, name?: string): RoleRef {
  return { id: `role-${key ?? 'custom'}`, name: name ?? key ?? 'Rol personalizado', key };
}

/** Deja los permisos en estado `ready` con exactamente estos permisos concedidos. */
export function setPermissions(permissions: readonly string[]): void {
  usePermissionsStore.setState({
    status: 'ready',
    contextKey: 'test:test',
    granted: new Set(permissions),
    matrixVersion: 1,
  });
}

/** Vuelve a `idle` (sin permisos): estado previo a cargar. */
export function clearPermissions(): void {
  usePermissionsStore.getState().reset();
  useWorkSession.setState({ role: null });
}

export { permissionKey };
