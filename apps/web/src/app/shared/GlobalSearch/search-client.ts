/**
 * BUS-01 — cliente de dominio para búsqueda global.
 * Llama a GET /search con el token de Firebase; el backend resuelve
 * companyId/branchId desde el token autenticado (BR-BUS-002).
 */
import { searchApiClient } from '../../../api/search-api-client';
import type { components } from '../../../api/search.generated';

export type SearchResponse = components['schemas']['SearchResponse'];
export type SearchResultGroup = components['schemas']['SearchResultGroup'];
export type SearchResultItem = components['schemas']['SearchResultItem'];
export type SearchEntityType = components['schemas']['SearchEntityType'];

export async function globalSearch(
  idToken: string,
  q: string,
): Promise<SearchResponse> {
  const { data, error, response } = await searchApiClient.GET('/search', {
    params: {
      query: { q, limit: 5 },
    },
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (error || !data) {
    throw new Error(`Error en búsqueda global (${response.status})`);
  }
  return data;
}
