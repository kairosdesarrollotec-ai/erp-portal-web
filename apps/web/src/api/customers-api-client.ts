import createClient from 'openapi-fetch';
import type { paths } from './customers.generated';

export const customersApiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
});
