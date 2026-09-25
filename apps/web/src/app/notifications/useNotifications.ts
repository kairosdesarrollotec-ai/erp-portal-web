import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { getMyNotifications, markAllNotificationsRead, NotificationItem } from './notifications-client';

export type NotificationsState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR';

/**
 * TR-07 - hook del centro de notificaciones (panel + campana). Recibe
 * companyId/branchId ya resueltos por la pantalla que lo monta (mismo
 * contexto que useDashboard.ts) para no duplicar la resolucion de
 * contexto de trabajo.
 */
export function useNotifications(companyId: string | null, branchId: string | null) {
  const [state, setState] = useState<NotificationsState>('LOADING');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const load = useCallback(async () => {
    if (!companyId || !branchId) return;
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      setState('RECOVERABLE_ERROR');
      return;
    }
    try {
      const idToken = await user.getIdToken();
      const result = await getMyNotifications(idToken, companyId, branchId);
      setNotifications(result);
      setState(result.length === 0 ? 'EMPTY' : 'READY');
    } catch {
      setState('RECOVERABLE_ERROR');
    }
  }, [companyId, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  async function markAllRead() {
    if (!companyId || !branchId) return;
    const user = getFirebaseAuth().currentUser;
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      await markAllNotificationsRead(idToken, companyId, branchId);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {
      // Accion secundaria (contrato punto 7) - si falla, el usuario puede
      // reintentar; no se bloquea el resto del panel.
    }
  }

  return { state, notifications, unreadCount, markAllRead, refresh: load };
}
