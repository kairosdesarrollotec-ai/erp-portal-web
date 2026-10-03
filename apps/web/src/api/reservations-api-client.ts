import createClient from 'openapi-fetch';
import type { paths } from './reservations.generated';

export const reservationsApiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});
