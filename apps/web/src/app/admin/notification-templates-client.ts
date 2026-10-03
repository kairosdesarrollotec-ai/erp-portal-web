import { adminApiClient } from '../../api/admin-api-client';

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
  const { data, error, response } = await adminApiClient.GET('/admin/notification-templates', {
    params: { query: { companyId, branchId } },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new Error(`No se pudo obtener las plantillas de notificacion (${response.status})`);
  }
  return data as unknown as NotificationTemplates;
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
  const { data, error, response } = await adminApiClient.POST('/admin/notification-templates', {
    headers: { Authorization: `Bearer ${idToken}` },
    body: { companyId, branchId, eventType, channels, body },
  });
  if (error || !data) {
    const problem = (error as unknown as { code?: string; detail?: string } | null) ?? null;
    throw new NotificationTemplateCommandError(response.status, problem);
  }
  return data as unknown as NotificationTemplateItem;
}
