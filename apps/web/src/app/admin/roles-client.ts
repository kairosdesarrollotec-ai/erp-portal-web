import { adminApiClient } from '../../api/admin-api-client';

/** ADM-02 - rol dinamico de la organizacion (GET /admin/roles). */
export interface AdminRole {
  id: string;
  name: string;
  /** Codigo estable de los roles de sistema; null en roles creados a mano. */
  key: string | null;
  isSystem: boolean;
  active: boolean;
  /** Concurrencia optimista (If-Match). */
  version: number;
  /** Asignaciones activas con este rol. */
  assignmentCount: number;
}

/**
 * Error de comandos de roles. `code` sale del cuerpo problem+json del back
 * (ROLE_NAME_TAKEN, ROLE_NAME_INVALID, ROLE_NOT_EDITABLE, VERSION_CONFLICT,
 * ROLE_HAS_ACTIVE_ASSIGNMENTS, LAST_ADMINISTRATOR_ROLE). Un 412 se trata
 * siempre como VERSION_CONFLICT aunque el cuerpo no traiga el codigo.
 */
export class RoleCommandError extends Error {
  public readonly code: string | null;

  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    const code = problem?.code ?? (status === 412 ? 'VERSION_CONFLICT' : null);
    super(RoleCommandError.friendlyMessage(code) ?? problem?.detail ?? `La operación no se pudo completar (${status})`);
    this.code = code;
  }

  static friendlyMessage(code: string | null): string | null {
    switch (code) {
      case 'ROLE_NAME_TAKEN':
        return 'Ya existe un rol con ese nombre. Elige otro.';
      case 'ROLE_NAME_INVALID':
        return 'El nombre del rol no es válido: debe tener entre 1 y 60 caracteres.';
      case 'ROLE_NOT_EDITABLE':
        return 'Este rol es fijo y no se puede renombrar ni desactivar.';
      case 'VERSION_CONFLICT':
        return 'Otra persona modificó este rol mientras lo editabas. Recargamos la lista; revisa y vuelve a intentar.';
      case 'ROLE_HAS_ACTIVE_ASSIGNMENTS':
        return 'No se puede desactivar: todavía hay usuarios con este rol. Reasígnalos a otro rol o dalos de baja primero.';
      case 'LAST_ADMINISTRATOR_ROLE':
        return 'No se puede desactivar: es el último rol con permisos para administrar usuarios y permisos. La organización quedaría sin administración.';
      default:
        return null;
    }
  }
}

const authHeaders = (idToken: string) => ({ Authorization: `Bearer ${idToken}` });
/** Mismo formato que el resto de modulos: version entrecomillada (`"3"`). */
const ifMatch = (version: number) => `"${version}"`;

function toError(error: unknown, status: number): RoleCommandError {
  const problem = (error as { code?: string; detail?: string } | null | undefined) ?? null;
  return new RoleCommandError(status, problem && typeof problem === 'object' ? problem : null);
}

/** GET /admin/roles. Por defecto solo activos; `includeInactive` trae tambien los desactivados. */
export async function listRoles(
  idToken: string,
  companyId: string,
  branchId: string,
  includeInactive = false,
): Promise<AdminRole[]> {
  const { data, error, response } = await adminApiClient.GET('/admin/roles', {
    params: { query: { companyId, branchId, includeInactive } },
    headers: authHeaders(idToken),
  });
  if (error || !data) {
    throw new Error(`No se pudo obtener la lista de roles (${response.status})`);
  }
  return data.roles as AdminRole[];
}

/** POST /admin/roles - el rol nace con cero permisos. */
export async function createRole(
  idToken: string,
  companyId: string,
  branchId: string,
  name: string,
): Promise<AdminRole> {
  const { data, error, response } = await adminApiClient.POST('/admin/roles', {
    headers: authHeaders(idToken),
    body: { companyId, branchId, name },
  });
  if (error || !data) throw toError(error, response.status);
  return data as AdminRole;
}

/** PATCH /admin/roles/:id (If-Match con la version del rol). */
export async function renameRole(
  idToken: string,
  companyId: string,
  branchId: string,
  role: Pick<AdminRole, 'id' | 'version'>,
  name: string,
): Promise<AdminRole> {
  const { data, error, response } = await adminApiClient.PATCH('/admin/roles/{id}', {
    params: { path: { id: role.id }, header: { 'If-Match': ifMatch(role.version) } },
    headers: authHeaders(idToken),
    body: { companyId, branchId, name },
  });
  if (error || !data) throw toError(error, response.status);
  return data as AdminRole;
}

/** POST /admin/roles/:id/deactivate (If-Match con la version del rol). */
export async function deactivateRole(
  idToken: string,
  companyId: string,
  branchId: string,
  role: Pick<AdminRole, 'id' | 'version'>,
): Promise<AdminRole> {
  const { data, error, response } = await adminApiClient.POST('/admin/roles/{id}/deactivate', {
    params: { path: { id: role.id }, header: { 'If-Match': ifMatch(role.version) } },
    headers: authHeaders(idToken),
    body: { companyId, branchId },
  });
  if (error || !data) throw toError(error, response.status);
  return data as AdminRole;
}
