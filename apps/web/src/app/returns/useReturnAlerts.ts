import { useQuery } from '@tanstack/react-query';
import { listReturnAlerts, type ReturnAlertItem } from './returns-client';
import type { ReminderScope } from './useReturnReminders';
import { getIdToken } from './useReturnReminders';

/** DEV-01 - alertas de garantia por liberar e inmovilizacion > 24 h. Un fallo no bloquea la bandeja. */
export function useReturnAlerts(scope: ReminderScope | null, enabled = true) {
  const companyId = scope?.companyId;
  const branchId = scope?.branchId;
  const queryEnabled = enabled && Boolean(companyId && branchId);

  const { data, isError: loadError, refetch } = useQuery<ReturnAlertItem[]>({
    queryKey: ['returnAlerts', companyId, branchId],
    queryFn: async () => listReturnAlerts(await getIdToken(), companyId!, branchId!),
    enabled: queryEnabled,
  });

  return { alerts: data ?? [], loadError, reload: () => void refetch() };
}
