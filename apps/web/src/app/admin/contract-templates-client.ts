import { rentalsApiClient } from '../../api/rentals-api-client';
import type { components } from '../../api/rentals.generated';

export type ContractTemplate = components['schemas']['ContractTemplateResponse'];

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
  const { data, error, response } = await rentalsApiClient.GET('/rentals/contract-templates', {
    params: { query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new Error(`No se pudo obtener las plantillas de contrato (${response.status})`);
  }
  return data;
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
  const { data, error, response } = await rentalsApiClient.POST('/rentals/contract-templates', {
    params: { header: { 'Idempotency-Key': crypto.randomUUID() } },
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId, type },
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new ContractTemplateCommandError(response.status, problem);
  }
  return data;
}
