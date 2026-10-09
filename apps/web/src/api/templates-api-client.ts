import createClient from 'openapi-fetch';
import type { paths } from './templates.generated';

/**
 * Cliente OpenAPI tipado para el módulo de plantillas de documentos (ADM-03).
 * Generado a partir de templates.generated.ts (openapi-typescript@7).
 * TDD-KAIROS-MVP-002-TPL v1.0.
 */
export const templatesApiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
});
