import { useCallback, useEffect, useState } from 'react';
import { getCosmeticTariff, type CosmeticTariffItem } from './returns-client';
import type { ReturnsWorkContext } from './useWorkContextForReturns';

/**
 * Tarifario oficial de danos esteticos (GET /returns/cosmetic-tariff): el
 * backend es la unica fuente (ya no existe copia local). Cache simple en
 * memoria por empresa/sede para no repetir la consulta entre DEV-07 y DEV-09.
 */
const cache = new Map<string, CosmeticTariffItem[]>();

export function clearCosmeticTariffCache(): void {
  cache.clear();
}

/** `enabled=false` evita la consulta cuando la pantalla no necesita nombres de paños. */
export function useCosmeticTariff(
  context: ReturnsWorkContext | null,
  getIdToken: () => Promise<string>,
  enabled = true,
) {
  const key = context && enabled ? `${context.companyId}:${context.branchId}` : null;
  const cached = key ? cache.get(key) : undefined;
  const [fetched, setFetched] = useState<{ key: string; items: CosmeticTariffItem[] } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!context || !key || (cache.has(key) && attempt === 0)) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await getIdToken();
        const items = await getCosmeticTariff(idToken, context.companyId, context.branchId);
        cache.set(key, items);
        if (!cancelled) {
          setFetched({ key, items });
          setFailedKey(null);
        }
      } catch {
        if (!cancelled) setFailedKey(key);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context, key, getIdToken, attempt]);

  const items = cached ?? (fetched && fetched.key === key ? fetched.items : []);
  const loading = key !== null && cached === undefined && !(fetched && fetched.key === key) && failedKey !== key;
  const error = key !== null && failedKey === key && cached === undefined;
  const retry = useCallback(() => {
    setFailedKey(null);
    setAttempt((n) => n + 1);
  }, []);

  return { items, loading, error, retry };
}
