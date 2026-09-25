const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export type NotificationChannel = 'EMAIL' | 'PUSH' | 'SMS';

export interface NotificationTemplateItem {
  eventType: string;
  version: number;
  channels: NotificationChannel[];
  body: string;
}

export interface NotificationTemplateEntry {
  eventType: string;
  label: string;
  current: NotificationTemplateItem | null;
  history: NotificationTemplateItem[];
}

export interface NotificationTemplates {
  templates: NotificationTemplateEntry[];
  allowedVariables: string[];
  channels: NotificationChannel[];
}

function authHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' };
}

export class NotificationTemplateCommandError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: { code?: string; detail?: string } | null,
  ) {
    super(problem?.detail ?? `La operacion no se pudo completar (${status})`);
  }
}

/** ADM-05 - plantillas por evento + catalogo de variables/canales permitidos. */
export async function getNotificationTemplates(
  idToken: string,
  companyId: string,
  branchId: string,
): Promise<NotificationTemplates> {
  const params = new URLSearchParams({ companyId, branchId });
  const response = await fetch(`${API_BASE_URL}/admin/notification-templates?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener las plantillas de notificacion (${response.status})`);
  }
  return (await response.json()) as NotificationTemplates;
}

/** ADM-05 - "Guardar plantilla" (POST). Inserta una version nueva para ese evento. */
export async function saveNotificationTemplate(
  idToken: string,
  companyId: string,
  branchId: string,
  eventType: string,
  channels: NotificationChannel[],
  body: string,
): Promise<NotificationTemplateItem> {
  const response = await fetch(`${API_BASE_URL}/admin/notification-templates`, {
    method: 'POST',
    headers: authHeaders(idToken),
    body: JSON.stringify({ companyId, branchId, eventType, channels, body }),
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new NotificationTemplateCommandError(response.status, problem);
  }
  return (await response.json()) as NotificationTemplateItem;
}
