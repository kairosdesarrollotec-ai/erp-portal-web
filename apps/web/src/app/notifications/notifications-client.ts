const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface NotificationItem {
  id: string;
  notificationType: string;
  isEscalated: boolean;
  title: string;
  deepLink: string;
  readAt: string | null;
  createdAt: string;
}

function authHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
}

/** TR-07 - lista de notificaciones del propio usuario autenticado. */
export async function getMyNotifications(
  idToken: string,
  companyId: string,
  branchId: string,
  unreadOnly?: boolean,
): Promise<NotificationItem[]> {
  const params = new URLSearchParams({ companyId, branchId });
  if (unreadOnly) params.set('unreadOnly', 'true');

  const response = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener las notificaciones (${response.status})`);
  }
  const body = (await response.json()) as { notifications: NotificationItem[] };
  return body.notifications;
}

/** TR-07 - "Marcar todas como leídas" (contrato punto 7, acción secundaria). */
export async function markAllNotificationsRead(idToken: string, companyId: string, branchId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify({ companyId, branchId }),
  });
  if (!response.ok) {
    throw new Error(`No se pudo marcar las notificaciones como leídas (${response.status})`);
  }
}
