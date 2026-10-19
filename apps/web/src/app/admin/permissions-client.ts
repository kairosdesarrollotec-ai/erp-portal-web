import { adminApiClient } from '../../api/admin-api-client';
import type { components } from '../../api/admin.generated';

export type PermissionModule = components['schemas']['PermissionModule'];

export interface PermissionActionDescriptor {
  module: PermissionModule;
  action: string;
  label: string;
}

/** Entrada de la matriz por rol dinamico (roleId, no el enum). */
export interface RolePermissionEntry {
  roleId: string;
  module: PermissionModule;
  action: string;
  allowed: boolean;
}

/** Ambito de una version de la matriz; null/null = toda la organizacion. */
export interface MatrixScope {
  companyId: string | null;
  branchId: string | null;
}

export interface RolePermissionMatrix {
  version: number;
  scope?: Partial<MatrixScope>;
  entries: RolePermissionEntry[];
  actionCatalog: PermissionActionDescriptor[];
}

export class PermissionCommandError extends Error {
  public readonly code: string | null;

  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    const code = problem?.code ?? null;
    super(PermissionCommandError.friendlyMessage(code) ?? problem?.detail ?? `La operacion no se pudo completar (${status})`);
    this.code = code;
  }

  private static friendlyMessage(code: string | null): string | null {
    switch (code) {
      // El back responde INCOMPATIBLE_PERMISSIONS (admin.yaml); se acepta tambien el nombre antiguo.
      case 'INCOMPATIBLE_PERMISSIONS':
      case 'INCOMPATIBLE_PERMISSION_COMBINATION':
        return 'Un rol no puede tener a la vez dos permisos incompatibles (segregación de funciones). Revisa las celdas marcadas en rojo.';
      case 'INCOMPLETE_MATRIX':
        return 'La matriz está incompleta. Recarga la pantalla e intenta de nuevo.';
      case 'MFA_RECENT_REQUIRED':
        return 'No se pudo confirmar tu identidad con un segundo factor reciente (últimos 5 minutos). Intenta de nuevo.';
      case 'ROLE_NOT_EDITABLE':
        return 'Los permisos del Administrador de Plataforma son fijos y no se pueden editar.';
      case 'LAST_ADMINISTRATOR_ROLE':
        return 'No se puede guardar: la organización quedaría sin ningún rol con permisos para administrar usuarios y permisos.';
      default:
        return null;
    }
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

/**
 * ADM-02 - "Guardar cambios" (POST /admin/permissions). Inserta una version
 * nueva completa en el ambito indicado (omitido = toda la organizacion).
 */
export async function saveRolePermissionMatrix(
  idToken: string,
  companyId: string,
  branchId: string,
  entries: RolePermissionEntry[],
  scope?: MatrixScope,
): Promise<RolePermissionMatrix> {
  const { data, error, response } = await adminApiClient.POST('/admin/permissions', {
    headers: { Authorization: `Bearer ${idToken}` },
    body: {
      companyId,
      branchId,
      ...(scope?.companyId ? { scopeCompanyId: scope.companyId } : {}),
      ...(scope?.branchId ? { scopeBranchId: scope.branchId } : {}),
      entries,
    },
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new PermissionCommandError(response.status, problem);
  }
  return data as unknown as RolePermissionMatrix;
}
