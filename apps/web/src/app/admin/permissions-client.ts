const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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

function authHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
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
  const params = new URLSearchParams({ companyId, branchId });
  const response = await fetch(`${API_BASE_URL}/admin/permissions?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener la matriz de permisos (${response.status})`);
  }
  return (await response.json()) as RolePermissionMatrix;
}

/** ADM-02 - "Guardar cambios" (POST /admin/permissions). Inserta una version nueva completa. */
export async function saveRolePermissionMatrix(
  idToken: string,
  companyId: string,
  branchId: string,
  entries: RolePermissionEntry[],
): Promise<RolePermissionMatrix> {
  const response = await fetch(`${API_BASE_URL}/admin/permissions`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify({ companyId, branchId, entries }),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new PermissionCommandError(response.status, problem);
  }
  return (await response.json()) as RolePermissionMatrix;
}
