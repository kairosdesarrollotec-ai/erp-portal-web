import { useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listHrAreas, type HrArea } from './hr-client';

export type HrAreaCatalogState = 'LOADING' | 'READY' | 'ERROR';

/**
 * H-02 / 0.8.0: catalogo de areas de RR.HH. de la empresa. Si no se puede cargar (`ERROR`) las pantallas siguen siendo usables:
 * el area queda como texto libre (compatibilidad) o sin editar. Lista vacia = la empresa aun no tiene catalogo.
 * Solo devuelve areas ACTIVAS (selectores); la gestion con desactivadas vive en AreasScreen (`includeInactive`).
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
        const all = await listHrAreas(idToken, { companyId, branchId }, controller.signal);
        // Los selectores ofrecen solo áreas activas (`isActive`); el listado normal ya las trae así, el filtro es defensivo.
        const areas = all.filter((a) => a.isActive !== false);
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
