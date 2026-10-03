import { notificationsApiClient } from '../../api/notifications-api-client';

export interface NotificationItem {
  id: string;
  notificationType: string;
  isEscalated: boolean;
  title: string;
  deepLink: string;
  readAt: string | null;
  createdAt: string;
}

/** TR-07 - lista de notificaciones del propio usuario autenticado. */
export async function getMyNotifications(
  idToken: string,
  companyId: string,
  branchId: string,
  unreadOnly?: boolean,
): Promise<NotificationItem[]> {
  const { data, error, response } = await notificationsApiClient.GET('/notifications', {
    params: {
      query: {
        companyId,
        branchId,
        ...(unreadOnly ? { unreadOnly: 'true' as const } : {}),
      },
    },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new Error(`No se pudo obtener las notificaciones (${response.status})`);
  }
  return data.notifications as unknown as NotificationItem[];
}

/** TR-07 - "Marcar todas como leídas" (contrato punto 7, acción secundaria). */
export async function markAllNotificationsRead(idToken: string, companyId: string, branchId: string): Promise<void> {
  const { error, response } = await notificationsApiClient.POST('/notifications/read-all', {
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId },
  });
  if (error) {
    throw new Error(`No se pudo marcar las notificaciones como leídas (${response.status})`);
  }
}
