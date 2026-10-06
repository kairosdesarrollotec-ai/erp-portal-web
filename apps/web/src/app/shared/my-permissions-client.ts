import { adminApiClient } from '../../api/admin-api-client';
import type { components } from '../../api/admin.generated';
import type { RoleRef } from './role-ref';

export type PermissionModule = components['schemas']['PermissionModule'];

export interface EffectivePermission {
  module: PermissionModule;
  action: string;
}

export interface EffectivePermissions {
  role: RoleRef;
  matrixVersion: number;
  permissions: EffectivePermission[];
}

/**
 * GET /me/permissions (admin.yaml 0.2.0): permisos efectivos del usuario en
 * el contexto empresa/sede vigente. Es la unica fuente que usa el front para
 * mostrar u ocultar modulos y acciones; el back sigue autorizando cada comando.
 */
export async function getMyPermissions(
  idToken: string,
  companyId: string,
  branchId: string,
): Promise<EffectivePermissions> {
  const { data, error, response } = await adminApiClient.GET('/me/permissions', {
    params: { query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new Error(`No se pudieron obtener los permisos (${response.status})`);
  }
  return data as unknown as EffectivePermissions;
}
