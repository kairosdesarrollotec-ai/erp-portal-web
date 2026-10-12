/**
 * BUS-01 — hook de búsqueda global.
 * - Debounce 300 ms (BR-BUS-004).
 * - Solo consulta cuando query.length >= 2 (BR-BUS-001).
 * - Usa TanStack Query para estado remoto (staleTime 0: resultados siempre frescos).
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFirebaseAuth } from '../../providers/firebase';
import { globalSearch, type SearchResponse } from './search-client';

const DEBOUNCE_MS = 300; // BR-BUS-004

export function useGlobalSearch(inputValue: string) {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const query = useQuery<SearchResponse>({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      return globalSearch(idToken, debouncedQuery);
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 0,
    retry: false,
  });

  return {
    groups: query.data?.groups ?? [],
    isLoading: query.isFetching,
    hasResults: (query.data?.groups ?? []).length > 0,
    isIdle: debouncedQuery.length < 2,
    showDropdown:
      debouncedQuery.length >= 2 && !query.isFetching
        ? true
        : false,
  };
}
