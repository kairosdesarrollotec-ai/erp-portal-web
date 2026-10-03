import type { components } from '../../api/customers.generated';
import { customersApiClient } from '../../api/customers-api-client';

export type Customer = components['schemas']['CustomerResponse'];
export type CreateCustomerPayload = components['schemas']['CreateCustomerRequest'];
export type UpdateCustomerPayload = components['schemas']['UpdateCustomerRequest'];
export type ListCustomersResponse = components['schemas']['ListCustomersResponse'];
export type KairosErrorResponse = components['schemas']['KairosErrorResponse'];

export interface ListCustomersParams {
  companyId: string;
  branchId: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class CustomerApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CustomerApiError';
    this.status = status;
  }
}

export class CustomerCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: KairosErrorResponse | null,
  ) {
    super(problem?.detail ?? `La operación no se pudo completar (${status})`);
    this.name = 'CustomerCommandError';
  }
}

export async function listCustomers(
  idToken: string,
  params: ListCustomersParams,
  signal?: AbortSignal,
): Promise<ListCustomersResponse> {
  const { data, error, response } = await customersApiClient.GET('/customers', {
    params: {
      query: {
        companyId: params.companyId,
        branchId: params.branchId,
        ...(params.search !== undefined ? { search: params.search } : {}),
        ...(params.limit !== undefined ? { limit: params.limit } : {}),
        ...(params.offset !== undefined ? { offset: params.offset } : {}),
      },
    },
    headers: { Authorization: `Bearer ${idToken}` },
    signal,
  });
  if (error || !data) {
    throw new CustomerApiError(
      `No se pudo obtener el listado de clientes (${response.status})`,
      response.status,
    );
  }
  return data;
}

export async function getCustomer(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<Customer> {
  const { data, error, response } = await customersApiClient.GET('/customers/{id}', {
    params: { path: { id }, query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new CustomerApiError(
      `No se pudo obtener el detalle del cliente (${response.status})`,
      response.status,
    );
  }
  return data;
}

export async function createCustomer(
  idToken: string,
  payload: CreateCustomerPayload,
  idempotencyKey?: string,
): Promise<Customer> {
  const { data, error, response } = await customersApiClient.POST('/customers', {
    params: {
      header: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    },
    headers: { Authorization: `Bearer ${idToken}` },
    body: payload,
  });
  if (error || !data) {
    throw new CustomerCommandError(
      response.status,
      (error as unknown as KairosErrorResponse | null) ?? null,
    );
  }
  return data;
}

export async function updateCustomer(
  idToken: string,
  id: string,
  payload: UpdateCustomerPayload,
  idempotencyKey?: string,
): Promise<Customer> {
  const { data, error, response } = await customersApiClient.PATCH('/customers/{id}', {
    params: {
      path: { id },
      header: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    },
    headers: { Authorization: `Bearer ${idToken}` },
    body: payload,
  });
  if (error || !data) {
    throw new CustomerCommandError(
      response.status,
      (error as unknown as KairosErrorResponse | null) ?? null,
    );
  }
  return data;
}
