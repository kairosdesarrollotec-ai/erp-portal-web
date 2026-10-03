import createClient from 'openapi-fetch';
import type { paths } from './inquiries.generated';

export const inquiriesApiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});
