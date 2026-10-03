import createClient from 'openapi-fetch';
import type { paths } from './notifications.generated';

export const notificationsApiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});
