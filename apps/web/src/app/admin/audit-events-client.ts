import { adminApiClient } from '../../api/admin-api-client';

export interface AuditEvent {
  id: string;
  actorFirebaseUid: string | null;
  actorEmail: string | null;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditEventsFilter {
  actorUid?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** ADM-04 - auditoria administrativa, solo lectura (GET /admin/audit-events). */
export async function listAuditEvents(
  idToken: string,
  companyId: string,
  branchId: string,
  filter: AuditEventsFilter = {},
): Promise<AuditEvent[]> {
  const { data, error, response } = await adminApiClient.GET('/admin/audit-events', {
    params: {
      query: {
        companyId,
        branchId,
        ...(filter.actorUid ? { actorUid: filter.actorUid } : {}),
        ...(filter.entityType ? { entityType: filter.entityType } : {}),
        ...(filter.dateFrom ? { dateFrom: filter.dateFrom } : {}),
        ...(filter.dateTo ? { dateTo: filter.dateTo } : {}),
      },
    },
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (error || !data) {
    throw new Error(`No se pudo obtener el historial de auditoria (${response.status})`);
  }
  return data.events as unknown as AuditEvent[];
}
