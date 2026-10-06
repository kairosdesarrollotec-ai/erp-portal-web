import type { RoleRef } from '../shared/role-ref';
import { adminApiClient } from '../../api/admin-api-client';

export interface OrganizationUserAssignment {
  id: string;
  firebaseUid: string;
  email: string | null;
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
  role: RoleRef;
  active: boolean;
  mfaEnrolled: boolean;
}

/**
 * Cuerpo `problem+json` que el backend devuelve en 400/404
 * (assign-user-to-company.handler.ts / deactivate-assignment.handler.ts).
 */
export class AdminCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(AdminCommandError.friendlyMessage(problem) ?? `La operacion no se pudo completar (${status})`);
  }

  private static friendlyMessage(problem: { code?: string; detail?: string } | null): string | null {
    if (!problem) return null;
    if (problem.code === 'USER_ALREADY_EXISTS_IN_IDENTITY_PROVIDER') {
      return 'Ya existe una cuenta con ese correo en el proveedor de identidad.';
    }
    if (problem.code === 'COMPANY_BRANCH_NOT_IN_ORGANIZATION') {
      return 'La empresa/sede indicada no pertenece a tu organización.';
    }
    if (problem.code === 'INITIAL_PASSWORD_REQUIRED') {
      return 'Este correo es nuevo: ingresa una contraseña inicial de al menos 8 caracteres.';
    }
    if (problem.code === 'ROLE_NOT_FOUND' || problem.code === 'ROLE_INACTIVE') {
      return 'El rol elegido ya no está disponible. Recarga la lista de roles.';
    }
    return problem.detail ?? null;
  }
}

/** ADM-01 - bandeja de usuarios y asignaciones (GET /admin/users). */
export async function listOrganizationUsers(
  idToken: string,
  companyId: string,
  branchId: string,
): Promise<OrganizationUserAssignment[]> {
  const { data, error, response } = await adminApiClient.GET('/admin/users', {
    params: { query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new Error(`No se pudo obtener la bandeja de usuarios (${response.status})`);
  }
  return data.users as unknown as OrganizationUserAssignment[];
}

export interface AssignUserInput {
  companyId: string;
  branchId: string;
  targetEmail: string;
  targetCompanyId: string;
  targetBranchId: string;
  /** Rol activo de la organizacion (GET /admin/roles). */
  targetRoleId: string;
  /**
   * Solo obligatoria si el correo es nuevo (el backend responde 400
   * INITIAL_PASSWORD_REQUIRED en ese caso, ver AdminCommandError). Si el
   * correo ya existe, se ignora aunque se envie.
   */
  initialPassword?: string;
}

export interface OrganizationBranch {
  branchId: string;
  branchName: string;
}

export interface OrganizationCompany {
  companyId: string;
  companyName: string;
  branches: OrganizationBranch[];
}

/** ADM-01 - empresas/sedes del grupo, para el selector de "Agregar usuario" (GET /admin/companies). */
export async function getOrganizationCompanies(
  idToken: string,
  companyId: string,
  branchId: string,
): Promise<OrganizationCompany[]> {
  const { data, error, response } = await adminApiClient.GET('/admin/companies', {
    params: { query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new Error(`No se pudo obtener la lista de empresas (${response.status})`);
  }
  return data.companies as unknown as OrganizationCompany[];
}

/** ADM-01 - accion primaria "Agregar usuario" (POST /admin/assignments). */
export async function assignUserToCompany(
  idToken: string,
  input: AssignUserInput,
): Promise<{ id: string }> {
  const { data, error, response } = await adminApiClient.POST('/admin/assignments', {
    headers: { Authorization: `Bearer ${idToken}` },
    body: input,
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new AdminCommandError(response.status, problem);
  }
  return data as { id: string };
}

/** ADM-01 - "Dar de baja" (POST /admin/assignments/:id/deactivate). */
export async function deactivateAssignment(
  idToken: string,
  assignmentId: string,
  companyId: string,
  branchId: string,
): Promise<void> {
  const { error, response } = await adminApiClient.POST('/admin/assignments/{id}/deactivate', {
    params: { path: { id: assignmentId } },
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId },
  });
  if (error) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new AdminCommandError(response.status, problem);
  }
}
