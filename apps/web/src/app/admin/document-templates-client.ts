import { templatesApiClient } from '../../api/templates-api-client';
import type { components } from '../../api/templates.generated';

export type TemplateType = components['schemas']['TemplateType'];
export type TemplateStatus = components['schemas']['TemplateStatus'];
export type TemplateDocumentFormat = components['schemas']['TemplateDocumentFormat'];
export type TemplateResponse = components['schemas']['TemplateResponse'];
export type TemplateUploadUrlResponse = components['schemas']['TemplateUploadUrlResponse'];
export type CreateTemplateRequest = components['schemas']['CreateTemplateRequest'];
export type RequestTemplateUploadUrlRequest = components['schemas']['RequestTemplateUploadUrlRequest'];
export type ActivateTemplateRequest = components['schemas']['ActivateTemplateRequest'];

export class TemplateCommandError extends Error {
  constructor(
    public readonly status: number,
    message?: string,
  ) {
    super(message ?? `Error ${status} al procesar la plantilla.`);
    this.name = 'TemplateCommandError';
  }
}

export async function listTemplates(
  idToken: string,
  params: {
    companyId: string;
    branchId: string;
    type?: TemplateType;
    status?: TemplateStatus;
  },
): Promise<TemplateResponse[]> {
  const { data, error, response } = await templatesApiClient.GET('/templates', {
    headers: { Authorization: `Bearer ${idToken}` },
    params: {
      query: {
        companyId: params.companyId,
        branchId: params.branchId,
        ...(params.type !== undefined ? { type: params.type } : {}),
        ...(params.status !== undefined ? { status: params.status } : {}),
      },
    },
  });
  if (error !== undefined || data === undefined) {
    throw new TemplateCommandError(response.status);
  }
  return data;
}

export async function createTemplate(
  idToken: string,
  body: CreateTemplateRequest,
  idempotencyKey: string,
): Promise<TemplateResponse> {
  const { data, error, response } = await templatesApiClient.POST('/templates', {
    headers: { Authorization: `Bearer ${idToken}` },
    params: { header: { 'Idempotency-Key': idempotencyKey } },
    body,
  });
  if (error !== undefined || data === undefined) {
    throw new TemplateCommandError(response.status);
  }
  return data;
}

export async function requestUploadUrl(
  idToken: string,
  id: string,
  body: RequestTemplateUploadUrlRequest,
  idempotencyKey: string,
): Promise<TemplateUploadUrlResponse> {
  const { data, error, response } = await templatesApiClient.POST('/templates/{id}/upload-url', {
    headers: { Authorization: `Bearer ${idToken}` },
    params: { path: { id }, header: { 'Idempotency-Key': idempotencyKey } },
    body,
  });
  if (error !== undefined || data === undefined) {
    throw new TemplateCommandError(response.status);
  }
  return data;
}

export async function activateTemplate(
  idToken: string,
  id: string,
  body: ActivateTemplateRequest,
  idempotencyKey: string,
): Promise<TemplateResponse> {
  const { data, error, response } = await templatesApiClient.POST('/templates/{id}/commands/activate', {
    headers: { Authorization: `Bearer ${idToken}` },
    params: { path: { id }, header: { 'Idempotency-Key': idempotencyKey } },
    body,
  });
  if (error !== undefined || data === undefined) {
    throw new TemplateCommandError(response.status);
  }
  return data;
}
