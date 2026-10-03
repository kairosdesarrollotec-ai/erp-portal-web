import { adminApiClient } from '../../api/admin-api-client';
import type { components } from '../../api/admin.generated';

export type PermissionModule = 'RESERVATION' | 'INQUIRY' | 'ADMIN';

export interface PermissionActionDescriptor {
  module: PermissionModule;
  action: string;
  label: string;
}

export interface RolePermissionEntry {
  role: string;
  module: PermissionModule;
  action: string;
  allowed: boolean;
}

export interface RolePermissionMatrix {
  version: number;
  entries: RolePermissionEntry[];
  actionCatalog: PermissionActionDescriptor[];
}

export class PermissionCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }
}

/** ADM-02 - matriz vigente + catalogo de acciones (GET /admin/permissions). */
export async function getRolePermissionMatrix(
  idToken: string,
  companyId: string,
  branchId: string,
): Promise<RolePermissionMatrix> {
  const { data, error, response } = await adminApiClient.GET('/admin/permissions', {
    params: { query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new Error(`No se pudo obtener la matriz de permisos (${response.status})`);
  }
  return data as unknown as RolePermissionMatrix;
}

/** ADM-02 - "Guardar cambios" (POST /admin/permissions). Inserta una version nueva completa. */
export async function saveRolePermissionMatrix(
  idToken: string,
  companyId: string,
  branchId: string,
  entries: RolePermissionEntry[],
): Promise<RolePermissionMatrix> {
  const { data, error, response } = await adminApiClient.POST('/admin/permissions', {
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId, entries } as unknown as components['schemas']['SaveRolePermissionMatrixRequest'],
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new PermissionCommandError(response.status, problem);
  }
  return data as unknown as RolePermissionMatrix;
}
