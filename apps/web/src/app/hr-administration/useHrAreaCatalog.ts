import { useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listHrAreas, type HrArea } from './hr-client';

export type HrAreaCatalogState = 'LOADING' | 'READY' | 'ERROR';

/**
 * H-02: catalogo de areas de RR.HH. de la empresa. Si no se puede cargar (`ERROR`) las pantallas siguen siendo usables:
 * el area queda como texto libre (compatibilidad) o sin editar. Lista vacia = la empresa aun no tiene catalogo.
 */
export function useHrAreaCatalog(companyId: string | undefined, branchId: string | undefined): { state: HrAreaCatalogState; areas: HrArea[] } {
  const [result, setResult] = useState<{ key: string; state: HrAreaCatalogState; areas: HrArea[] } | null>(null);
  const key = companyId && branchId ? `${companyId}:${branchId}` : '';

  useEffect(() => {
    if (!companyId || !branchId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('Sesión no disponible');
        const idToken = await user.getIdToken();
        const areas = await listHrAreas(idToken, { companyId, branchId }, controller.signal);
        if (!controller.signal.aborted) setResult({ key, state: 'READY', areas });
      } catch {
        if (!controller.signal.aborted) setResult({ key, state: 'ERROR', areas: [] });
      }
    })();
    return () => controller.abort();
  }, [companyId, branchId, key]);

  if (!key || result?.key !== key) return { state: 'LOADING', areas: [] };
  return { state: result.state, areas: result.areas };
}
