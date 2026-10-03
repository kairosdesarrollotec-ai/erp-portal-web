import createClient from 'openapi-fetch';
import type { paths } from './admin.generated';

export const adminApiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});
