import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFirebaseAuth } from '../providers/firebase';
import {
  listReturnReminders,
  registerReturnReminder,
  type RegisterReminderInput,
  type ReturnReminderInboxItem,
} from './returns-client';
import { describeReturnError } from './return-errors';

export interface ReminderScope {
  companyId: string;
  branchId: string;
}

export async function getIdToken(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sesión no disponible');
  return user.getIdToken();
}

/**
 * DEV-01 - recordatorios pendientes/fallidos de la sede. Un fallo al cargarlos nunca bloquea la bandeja:
 * el panel muestra un aviso recuperable. Registrar el resultado refresca la lista (el servidor manda).
 */
export function useReturnReminders(scope: ReminderScope | null, enabled = true) {
  const companyId = scope?.companyId;
  const branchId = scope?.branchId;
  const queryEnabled = enabled && Boolean(companyId && branchId);
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ returnId: string; message: string } | null>(null);

  const queryKey = ['returnReminders', companyId, branchId] as const;

  const { data, isFetching: loading, isError: loadError, refetch } = useQuery<ReturnReminderInboxItem[]>({
    queryKey,
    queryFn: async () => listReturnReminders(await getIdToken(), companyId!, branchId!),
    enabled: queryEnabled,
  });

  /** Devuelve true si el resultado quedo registrado. */
  const register = useCallback(
    async (item: ReturnReminderInboxItem, input: RegisterReminderInput): Promise<boolean> => {
      if (!companyId || !branchId) return false;
      setBusyId(item.returnId);
      setActionError(null);
      try {
        await registerReturnReminder(await getIdToken(), item.returnId, companyId, branchId, item.reminder.etag, input);
        await queryClient.invalidateQueries({ queryKey: ['returnReminders', companyId, branchId] });
        return true;
      } catch (error) {
        setActionError({
          returnId: item.returnId,
          message: describeReturnError(error, 'No pudimos registrar el resultado del recordatorio. Intenta de nuevo.'),
        });
        // 409/412: el recordatorio cambio en el servidor; se recarga para mostrar su estado real.
        await queryClient.invalidateQueries({ queryKey: ['returnReminders', companyId, branchId] });
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [companyId, branchId, queryClient],
  );

  return { items: data ?? [], loading, loadError, busyId, actionError, reload: () => void refetch(), register };
}
