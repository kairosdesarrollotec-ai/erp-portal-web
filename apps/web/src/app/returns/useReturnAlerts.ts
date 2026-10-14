import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listReturnAlerts, type ReturnAlertItem } from './returns-client';
import type { ReminderScope } from './useReturnReminders';

/** DEV-01 - alertas de garantia por liberar e inmovilizacion > 24 h. Un fallo no bloquea la bandeja. */
export function useReturnAlerts(scope: ReminderScope | null, enabled = true) {
  const [alerts, setAlerts] = useState<ReturnAlertItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const companyId = scope?.companyId;
  const branchId = scope?.branchId;

  const reload = useCallback(async () => {
    if (!companyId || !branchId || !enabled) return;
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      setAlerts(await listReturnAlerts(await user.getIdToken(), companyId, branchId));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [companyId, branchId, enabled]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return { alerts, loadError, reload };
}
