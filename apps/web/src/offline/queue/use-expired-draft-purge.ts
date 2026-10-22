import { useCallback, useEffect, useState } from 'react';
import { describePurge, hasPurged, purgeExpiredDrafts, PURGE_INTERVAL_MS } from './expired-drafts';
import { refreshLocalDraftCount } from '../../app/shared/local-drafts';

/**
 * Purga los borradores offline vencidos (72 h) al iniciar y cada 30 min, y expone UN aviso por cada purga que borró algo
 * (el usuario lo cierra con `dismiss`). Un error de IndexedDB no rompe la app: se reintenta en la siguiente vuelta.
 */
export function useExpiredDraftPurge(): { notice: string | null; dismiss: () => void } {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const result = await purgeExpiredDrafts(new Date());
        if (cancelled || !hasPurged(result)) return;
        await refreshLocalDraftCount().catch(() => undefined);
        setNotice(describePurge(result));
      } catch {
        // IndexedDB no disponible (navegación privada, etc.): no hay borradores que purgar.
      }
    }
    void run();
    const timer = setInterval(() => void run(), PURGE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const dismiss = useCallback(() => setNotice(null), []);
  return { notice, dismiss };
}
