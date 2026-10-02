const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface ContractTemplate {
  id: string;
  companyId: string;
  type: string;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  createdAt: string;
}

function authHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
}

export class ContractTemplateCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }
}

/** Plantillas de contrato (activas e historicas) de la empresa (GET /rentals/contract-templates). */
export async function listContractTemplates(
  idToken: string,
  companyId: string,
  branchId: string,
): Promise<ContractTemplate[]> {
  const params = new URLSearchParams({ companyId, branchId });
  const response = await fetch(`${API_BASE_URL}/rentals/contract-templates?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener las plantillas de contrato (${response.status})`);
  }
  return (await response.json()) as ContractTemplate[];
}

/**
 * Crea una nueva version de plantilla para un tipo (POST /rentals/contract-templates).
 * El backend retira automaticamente la version ACTIVE previa del mismo tipo.
 */
export async function createContractTemplate(
  idToken: string,
  companyId: string,
  branchId: string,
  type: string,
): Promise<ContractTemplate> {
  const response = await fetch(`${API_BASE_URL}/rentals/contract-templates`, {
    method: 'POST',
    headers: { ...(authHeaders(idToken) as Record<string, string>), 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ companyId, branchId, type }),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ContractTemplateCommandError(response.status, problem);
  }
  return (await response.json()) as ContractTemplate;
}
