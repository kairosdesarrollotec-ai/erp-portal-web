import type { Page } from '@playwright/test';

/**
 * Mocks del modulo Incidencias (contrato: erp-api-local/packages/contracts/openapi/incidents.yaml).
 * El servidor simulado es con estado y aplica las reglas del dominio:
 *  - If-Match con la version entrecomillada; desfase -> 409 VERSION_CONFLICT.
 *  - Solo ABIERTA admite comandos (409 INCIDENT_NOT_OPEN).
 *  - resolve solo para severidad LEVE (422 INCIDENT_DIRECT_RESOLVE_NOT_ALLOWED).
 *  - Historial append-only: cada comando agrega una entrada, nunca modifica las previas.
 */
export interface IncidentFixture {
  id: string;
  companyId: string;
  branchId: string;
  rentalId: string;
  rentalCode: string | null;
  returnId: string | null;
  type: string;
  severity: 'LEVE' | 'MODERADA' | 'GRAVE';
  status: 'ABIERTA' | 'CERRADA' | 'VIA_LEGAL';
  description: string;
  suggestion: string | null;
  reportedAt: string;
  responsibleUserId: string;
  resolutionSummary: string | null;
  resolvedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  actions: { id: string; kind: string; description: string; authorUserId: string; createdAt: string }[];
}

export function makeIncidentFixture(overrides: Partial<IncidentFixture> = {}): IncidentFixture {
  const id = overrides.id ?? 'inc-e2e-001';
  const description = overrides.description ?? 'El cliente perdió la llave de repuesto.';
  return {
    id,
    companyId: 'company-001',
    branchId: 'branch-001',
    rentalId: 'rent-e2e-001',
    rentalCode: 'ALQ-1187',
    returnId: null,
    type: 'KEY_LOSS',
    severity: 'LEVE',
    status: 'ABIERTA',
    description,
    suggestion: null,
    reportedAt: '2026-10-05T10:00:00Z',
    responsibleUserId: 'user-e2e-0001',
    resolutionSummary: null,
    resolvedAt: null,
    version: 3,
    createdAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
    actions: [
      { id: `${id}-a1`, kind: 'REPORTED', description, authorUserId: 'user-e2e-0001', createdAt: '2026-10-05T10:00:00Z' },
      { id: `${id}-a2`, kind: 'ACTION', description: 'Se llamó al cliente para que busque la llave.', authorUserId: 'user-e2e-0001', createdAt: '2026-10-05T11:00:00Z' },
    ],
    ...overrides,
  };
}

/** Bandeja por defecto: una Leve abierta, una Grave abierta y una Leve cerrada. */
export function defaultIncidents(): IncidentFixture[] {
  return [
    makeIncidentFixture({ id: 'inc-leve', rentalCode: 'ALQ-1187' }),
    makeIncidentFixture({
      id: 'inc-grave',
      rentalCode: 'ALQ-1188',
      type: 'CRASH_OR_DAMAGE',
      severity: 'GRAVE',
      description: 'Choque frontal en la Panamericana.',
      createdAt: '2026-10-05T09:00:00Z',
    }),
    makeIncidentFixture({
      id: 'inc-cerrada',
      rentalCode: 'ALQ-1189',
      type: 'TOWING',
      status: 'CERRADA',
      resolutionSummary: 'Grúa pagada por el cliente.',
      createdAt: '2026-10-04T09:00:00Z',
    }),
  ];
}

export const ACTIVE_RENTAL_FOR_INCIDENTS = {
  id: 'rent-e2e-001',
  status: 'ACTIVE',
  branchId: 'branch-001',
  customerName: 'Carlos López',
  customerDocNumber: '12345678',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehiclePlate: 'ABC-123',
  planCode: 'NORMAL',
  startAt: '2026-10-01T09:00:00Z',
  expectedEndAt: '2026-10-05T09:00:00Z',
  version: 4,
};

export interface InterceptIncidentsOptions {
  incidents?: IncidentFixture[];
  /** Alquileres que lista GET /rentals (formulario "Registrar incidencia" y bandeja de alquileres). */
  rentals?: object[];
  /** Fuerza que el proximo comando falle con 409 (otro usuario modifico la incidencia). */
  conflictOnNextCommand?: boolean;
  /** Fuerza un 422 en el comando `close` (regla de negocio). */
  closeUnprocessable?: boolean;
}

export interface InterceptedIncidents {
  /** URLs de GET /incidents (bandeja) solicitadas, en orden. */
  listRequests: string[];
  /** URLs de GET /incidents/:id solicitadas. */
  detailRequests: string[];
  /** Comandos POST recibidos, en orden (create = POST /incidents). */
  commands: { path: string; id?: string; ifMatch: string | undefined; idempotencyKey: string | undefined; body: Record<string, unknown> }[];
  get: (id: string) => IncidentFixture | undefined;
  /** El proximo comando falla con 409 tras simular un cambio ajeno (sube la version y el historial). */
  conflictNext: () => void;
}

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

export async function interceptIncidents(page: Page, options: InterceptIncidentsOptions = {}): Promise<InterceptedIncidents> {
  const store = new Map<string, IncidentFixture>();
  for (const item of options.incidents ?? defaultIncidents()) store.set(item.id, item);
  let conflict = options.conflictOnNextCommand ?? false;

  const intercepted: InterceptedIncidents = {
    listRequests: [],
    detailRequests: [],
    commands: [],
    get: (id) => store.get(id),
    conflictNext: () => {
      conflict = true;
    },
  };
  const summary = ({ actions: _actions, ...rest }: IncidentFixture) => {
    void _actions;
    return rest;
  };

  // Catalogos que usa el formulario "Registrar incidencia" y la bandeja de alquileres.
  await page.route(/\/rentals(\?.*)?$/, (route) =>
    route.fulfill(json(options.rentals ?? [ACTIVE_RENTAL_FOR_INCIDENTS])),
  );
  await page.route(/\/returns(\?.*)?$/, (route) => route.fulfill(json([])));

  // Bandeja y alta.
  await page.route(/\/incidents(\?.*)?$/, (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      intercepted.commands.push({
        path: 'create',
        ifMatch: undefined,
        idempotencyKey: request.headers()['idempotency-key'],
        body,
      });
      const created = makeIncidentFixture({
        id: `inc-new-${store.size}`,
        rentalId: body.rentalId as string,
        rentalCode: 'ALQ-2000',
        returnId: (body.returnId as string) ?? null,
        type: body.type as string,
        severity: body.severity as IncidentFixture['severity'],
        description: body.description as string,
        suggestion: (body.suggestion as string) ?? null,
        version: 1,
        createdAt: '2026-10-06T08:00:00Z',
        actions: [],
      });
      store.set(created.id, created);
      return route.fulfill(json(summary(created), 201));
    }
    intercepted.listRequests.push(request.url());
    const url = new URL(request.url());
    const filters = ['type', 'severity', 'status', 'rentalId', 'returnId'] as const;
    const items = [...store.values()]
      .filter((item) => filters.every((key) => !url.searchParams.get(key) || String(item[key]) === url.searchParams.get(key)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(summary);
    return route.fulfill(json(items));
  });

  // Detalle.
  await page.route(/\/incidents\/[^?/]+(\?.*)?$/, (route) => {
    const id = route.request().url().match(/\/incidents\/([^?/]+)/)?.[1] ?? '';
    intercepted.detailRequests.push(route.request().url());
    const item = store.get(id);
    if (!item) return route.fulfill(json({ code: 'INCIDENT_NOT_FOUND' }, 404));
    return route.fulfill({ ...json(item), headers: { ETag: `"${item.version}"` } });
  });

  // Comandos (append-only).
  await page.route(/\/incidents\/[^/]+\/commands\/([a-z-]+)/, (route) => {
    const request = route.request();
    const [, id, command] = request.url().match(/\/incidents\/([^/]+)\/commands\/([a-z-]+)/) ?? [];
    const body = request.postDataJSON() as Record<string, unknown>;
    const ifMatch = request.headers()['if-match'];
    intercepted.commands.push({ path: command, id, ifMatch, idempotencyKey: request.headers()['idempotency-key'], body });

    const item = store.get(id);
    if (!item) return route.fulfill(json({ code: 'INCIDENT_NOT_FOUND' }, 404));
    if (!ifMatch) return route.fulfill(json({ code: 'IF_MATCH_REQUIRED' }, 428));
    if (command === 'close' && options.closeUnprocessable) return route.fulfill(json({ code: 'SOME_RULE' }, 422));

    if (conflict) {
      conflict = false;
      // Otro usuario agrego una accion mientras tanto: sube la version y el historial.
      store.set(id, {
        ...item,
        version: item.version + 1,
        actions: [
          ...item.actions,
          { id: `${id}-other`, kind: 'ACTION', description: 'Acción registrada por otro usuario', authorUserId: 'user-e2e-0002', createdAt: '2026-10-05T12:00:00Z' },
        ],
      });
    }
    const current = store.get(id) as IncidentFixture;
    if (ifMatch !== `"${current.version}"`) return route.fulfill(json({ code: 'VERSION_CONFLICT' }, 409));
    if (current.status !== 'ABIERTA') return route.fulfill(json({ code: 'INCIDENT_NOT_OPEN' }, 409));

    const entry = (kind: string, description: string) => ({
      id: `${id}-${current.actions.length + 1}`,
      kind,
      description,
      authorUserId: 'user-e2e-0001',
      createdAt: '2026-10-06T09:00:00Z',
    });
    let next: IncidentFixture;
    switch (command) {
      case 'add-action':
        next = { ...current, actions: [...current.actions, entry('ACTION', body.description as string)] };
        break;
      case 'resolve':
        if (current.severity !== 'LEVE') return route.fulfill(json({ code: 'INCIDENT_DIRECT_RESOLVE_NOT_ALLOWED' }, 422));
        next = {
          ...current,
          status: 'CERRADA',
          resolutionSummary: body.resolutionSummary as string,
          resolvedAt: '2026-10-06T09:00:00Z',
          actions: [...current.actions, entry('RESOLVED', body.resolutionSummary as string)],
        };
        break;
      case 'close':
        next = {
          ...current,
          status: 'CERRADA',
          resolutionSummary: body.resolutionSummary as string,
          resolvedAt: '2026-10-06T09:00:00Z',
          actions: [...current.actions, entry('CLOSED', body.resolutionSummary as string)],
        };
        break;
      case 'refer-legal':
        next = { ...current, status: 'VIA_LEGAL', actions: [...current.actions, entry('REFERRED_LEGAL', body.reason as string)] };
        break;
      default:
        return route.fulfill(json({ code: 'UNKNOWN_COMMAND' }, 404));
    }
    next = { ...next, version: current.version + 1, updatedAt: '2026-10-06T09:00:00Z' };
    store.set(id, next);
    return route.fulfill(json(next));
  });

  return intercepted;
}
