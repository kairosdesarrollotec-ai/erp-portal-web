const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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

function authHeaders(idToken: string): HeadersInit {
  return { Authorization: `Bearer ${idToken}` };
}

/** ADM-04 - auditoria administrativa, solo lectura (GET /admin/audit-events). */
export async function listAuditEvents(
  idToken: string,
  companyId: string,
  branchId: string,
  filter: AuditEventsFilter = {},
): Promise<AuditEvent[]> {
  const params = new URLSearchParams({ companyId, branchId });
  if (filter.actorUid) params.set('actorUid', filter.actorUid);
  if (filter.entityType) params.set('entityType', filter.entityType);
  if (filter.dateFrom) params.set('dateFrom', filter.dateFrom);
  if (filter.dateTo) params.set('dateTo', filter.dateTo);

  const response = await fetch(`${API_BASE_URL}/admin/audit-events?${params.toString()}`, {
    headers: authHeaders(idToken),
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener el historial de auditoria (${response.status})`);
  }
  const body = (await response.json()) as { events: AuditEvent[] };
  return body.events;
}
