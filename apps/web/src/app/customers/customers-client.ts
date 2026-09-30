import type { components } from '../../api/customers.generated';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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

function authHeaders(idToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };
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
  const query = new URLSearchParams({
    companyId: params.companyId,
    branchId: params.branchId,
  });
  if (params.search) query.set('search', params.search);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));

  const response = await fetch(`${API_BASE_URL}/customers?${query.toString()}`, {
    headers: authHeaders(idToken),
    signal,
  });

  if (!response.ok) {
    throw new CustomerApiError(
      `No se pudo obtener el listado de clientes (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as ListCustomersResponse;
}

export async function getCustomer(
  idToken: string,
  id: string,
  companyId: string,
  branchId: string,
): Promise<Customer> {
  const query = new URLSearchParams({ companyId, branchId });
  const response = await fetch(`${API_BASE_URL}/customers/${id}?${query.toString()}`, {
    headers: authHeaders(idToken),
  });

  if (!response.ok) {
    throw new CustomerApiError(
      `No se pudo obtener el detalle del cliente (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as Customer;
}

export async function createCustomer(
  idToken: string,
  payload: CreateCustomerPayload,
  idempotencyKey?: string,
): Promise<Customer> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let problem: KairosErrorResponse | null = null;
    try {
      problem = await response.json();
    } catch {
      // response might not be JSON
    }
    throw new CustomerCommandError(response.status, problem);
  }

  return (await response.json()) as Customer;
}

export async function updateCustomer(
  idToken: string,
  id: string,
  payload: UpdateCustomerPayload,
  idempotencyKey?: string,
): Promise<Customer> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let problem: KairosErrorResponse | null = null;
    try {
      problem = await response.json();
    } catch {
      // response might not be JSON
    }
    throw new CustomerCommandError(response.status, problem);
  }

  return (await response.json()) as Customer;
}
