import type { WorkerRole } from '../dashboard/worker-role';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface OrganizationUserAssignment {
  id: string;
  firebaseUid: string;
  email: string | null;
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
  role: WorkerRole;
  active: boolean;
  mfaEnrolled: boolean;
}

function authHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
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
    if (problem.code === 'USER_NOT_FOUND_IN_IDENTITY_PROVIDER') {
      return 'No existe una cuenta con ese correo. ADM-01 asigna empresa/sede/rol a una cuenta que ya se registro, no crea cuentas nuevas.';
    }
    if (problem.code === 'COMPANY_BRANCH_NOT_IN_ORGANIZATION') {
      return 'La empresa/sede indicada no pertenece a tu organizacion.';
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
  const params = new URLSearchParams({ companyId, branchId });
  const response = await fetch(`${API_BASE_URL}/admin/users?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener la bandeja de usuarios (${response.status})`);
  }
  const body = (await response.json()) as { users: OrganizationUserAssignment[] };
  return body.users;
}

export interface AssignUserInput {
  companyId: string;
  branchId: string;
  targetEmail: string;
  targetCompanyId: string;
  targetBranchId: string;
  targetRole: WorkerRole;
}

/** ADM-01 - accion primaria "Agregar usuario" (POST /admin/assignments). */
export async function assignUserToCompany(idToken: string, input: AssignUserInput): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE_URL}/admin/assignments`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new AdminCommandError(response.status, problem);
  }
  return (await response.json()) as { id: string };
}

/** ADM-01 - "Dar de baja" (POST /admin/assignments/:id/deactivate). */
export async function deactivateAssignment(
  idToken: string,
  assignmentId: string,
  companyId: string,
  branchId: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/assignments/${assignmentId}/deactivate`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify({ companyId, branchId }),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new AdminCommandError(response.status, problem);
  }
}
