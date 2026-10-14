import { useCallback, useEffect, useState } from 'react';
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

async function getIdToken(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sesión no disponible');
  return user.getIdToken();
}

/**
 * DEV-01 - recordatorios pendientes/fallidos de la sede. Un fallo al cargarlos nunca bloquea la bandeja:
 * el panel muestra un aviso recuperable. Registrar el resultado refresca la lista (el servidor manda).
 */
export function useReturnReminders(scope: ReminderScope | null, enabled = true) {
  const [items, setItems] = useState<ReturnReminderInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ returnId: string; message: string } | null>(null);

  const companyId = scope?.companyId;
  const branchId = scope?.branchId;

  const reload = useCallback(async () => {
    if (!companyId || !branchId || !enabled) return;
    setLoading(true);
    try {
      const result = await listReturnReminders(await getIdToken(), companyId, branchId);
      setItems(result);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, branchId, enabled]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  /** Devuelve true si el resultado quedo registrado. */
  const register = useCallback(
    async (item: ReturnReminderInboxItem, input: RegisterReminderInput): Promise<boolean> => {
      if (!companyId || !branchId) return false;
      setBusyId(item.returnId);
      setActionError(null);
      try {
        await registerReturnReminder(await getIdToken(), item.returnId, companyId, branchId, item.reminder.etag, input);
        await reload();
        return true;
      } catch (error) {
        setActionError({
          returnId: item.returnId,
          message: describeReturnError(error, 'No pudimos registrar el resultado del recordatorio. Intenta de nuevo.'),
        });
        // 409/412: el recordatorio cambio en el servidor; se recarga para mostrar su estado real.
        await reload();
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [companyId, branchId, reload],
  );

  return { items, loading, loadError, busyId, actionError, reload, register };
}
