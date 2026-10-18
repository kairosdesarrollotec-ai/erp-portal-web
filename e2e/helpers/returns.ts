import type { Page } from '@playwright/test';

/**
 * Mocks del modulo Devolucion (GET/POST /returns/**, evidencia por URL
 * firmada). El expediente es con estado: cada comando aplica la transicion de
 * dominio del backend (returns/domain/return-status.ts) y devuelve la nueva
 * version, de modo que el flujo completo DEV-02 -> DEV-10 se puede recorrer.
 */
type NullableFields =
  | 'finalSettlementAmount'
  | 'closedAt'
  | 'alcoholTestResult'
  | 'inspectedAt'
  | 'alcoholEscalation'
  | 'responsibilityDocument'
  | 'damages'
  | 'immobilizationCharges';
export type ReturnFixture = Omit<typeof RETURN_FIXTURE_BASE, NullableFields> & {
  finalSettlementAmount: number | null;
  closedAt: string | null;
  alcoholTestResult: string | null;
  inspectedAt: string | null;
  alcoholEscalation: Record<string, unknown> | null;
  responsibilityDocument: Record<string, unknown> | null;
  damages: Record<string, unknown>[];
  immobilizationCharges: Record<string, unknown>[];
};

/** Tarifario oficial que sirve GET /returns/cosmetic-tariff (el portal ya no lo duplica). */
export const COSMETIC_TARIFF_FIXTURE = [
  { code: 'PULIDO_Y_ENCERADO', name: 'Pulido y encerado', pricePen: 30 },
  { code: 'CAPOT', name: 'Paño en el capot', pricePen: 200 },
  { code: 'TECHO', name: 'Paño parte del techo', pricePen: 180 },
];

/** Tarifa diaria del vehiculo (la aplica el servidor en charge-immobilization). */
export const VEHICLE_DAILY_RATE = 120;

const RETURN_FIXTURE_BASE = {
  id: 'ret-e2e-001',
  organizationId: 'org-001',
  operatingCompanyId: 'company-001',
  branchId: 'branch-001',
  rentalId: 'rent-e2e-001',
  vehicleId: 'veh-001',
  customerId: 'cust-001',
  vehiclePlate: 'ABC-123',
  customerName: 'Carlos López',
  status: 'RECEPCION_PROVISIONAL',
  custodyHolder: 'VELOXRENT',
  customerPresent: true,
  mileageAtReturn: 15000,
  fuelLevelAtReturn: 'HALF',
  alcoholTestResult: null,
  alcoholEscalation: null,
  responsibilityDocument: null,
  damages: [],
  immobilizationCharges: [],
  scheduledAt: '2026-10-05T09:00:00Z',
  receivedAt: new Date().toISOString(),
  inspectedAt: null,
  closedAt: null,
  finalSettlementAmount: null,
  createdAt: '2026-10-05T08:00:00Z',
  createdBy: 'fake-uid-e2e',
  updatedAt: '2026-10-05T09:00:00Z',
  updatedBy: 'fake-uid-e2e',
  version: 1,
  etag: '"1"',
};

export const RETURN_FIXTURE: ReturnFixture = RETURN_FIXTURE_BASE;

export const ACTIVE_RENTAL_FIXTURE = {
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
  deposit: { originalAmount: '1000.00', currency: 'PEN' },
  version: 4,
};

export function makeReturnEvidence(returnId = RETURN_FIXTURE.id, photos = 35, videos = 3): object[] {
  const items: object[] = [];
  for (let i = 0; i < photos; i++) {
    items.push({
      id: `r-photo-${i}`,
      returnId,
      type: 'PHOTO',
      zone: ['FRONTAL', 'LATERAL_IZQUIERDO', 'LATERAL_DERECHO', 'POSTERIOR', 'INTERIOR'][i % 5],
      objectUrl: `https://storage.test/r-photo-${i}.jpg`,
      createdAt: '2026-10-05T09:00:00Z',
    });
  }
  for (let i = 0; i < videos; i++) {
    items.push({
      id: `r-video-${i}`,
      returnId,
      type: 'VIDEO',
      zone: 'FRONTAL',
      objectUrl: `https://storage.test/r-video-${i}.mp4`,
      createdAt: '2026-10-05T09:00:00Z',
    });
  }
  return items;
}

export interface InterceptReturnsOptions {
  initial?: Partial<ReturnFixture>;
  list?: object[];
  evidence?: object[];
  /** Alquileres activos que lista DEV-01 (por defecto, un ACTIVE). */
  rentals?: object[];
}

export interface InterceptedReturns {
  /** URLs de GET /returns solicitadas (para verificar aislamiento por sede). */
  listRequests: string[];
  /** URLs de GET /returns/cosmetic-tariff solicitadas. */
  tariffRequests: string[];
  /** Cuerpos y headers de los comandos POST recibidos, en orden. */
  commands: { path: string; ifMatch: string | undefined; body: Record<string, unknown> }[];
  current: () => ReturnFixture;
}

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

export async function interceptReturns(page: Page, options: InterceptReturnsOptions = {}): Promise<InterceptedReturns> {
  let ret: ReturnFixture = { ...RETURN_FIXTURE, ...options.initial };
  const evidence = options.evidence ?? [];
  const intercepted: InterceptedReturns = { listRequests: [], tariffRequests: [], commands: [], current: () => ret };

  const bump = (patch: Partial<ReturnFixture>) => {
    ret = { ...ret, ...patch, version: ret.version + 1, etag: `"${ret.version + 1}"` };
    return ret;
  };

  // Alquileres activos y detalle del alquiler de origen (DEV-01 / DEV-02 / DEV-09).
  await page.route(/\/rentals(\?.*)?$/, (route) =>
    route.fulfill(json(options.rentals ?? [ACTIVE_RENTAL_FIXTURE])),
  );
  await page.route(/\/rentals\/[^?/]+(\?.*)?$/, (route) => route.fulfill(json(ACTIVE_RENTAL_FIXTURE)));
  await page.route(/\/rentals\/[^/]+\/evidence(\?.*)?$/, (route) => route.fulfill(json([])));

  // Lista (baja prioridad: se registra primero).
  await page.route(/\/returns(\?.*)?$/, (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      intercepted.listRequests.push(request.url());
      return route.fulfill(json(options.list ?? [ret]));
    }
    intercepted.commands.push({ path: '/returns', ifMatch: undefined, body: request.postDataJSON() });
    return route.fulfill(json({ ...ret, status: 'PROGRAMADA' }, 201));
  });

  // Detalle.
  await page.route(/\/returns\/[^?/]+(\?.*)?$/, (route) => route.fulfill(json(ret)));

  // Paneles complementarios de DEV-01. Deben registrarse despues del detalle
  // generico: Playwright prioriza la ultima ruta registrada y estos recursos
  // no son expedientes individuales.
  await page.route(/\/returns\/reminders(\?.*)?$/, (route) => route.fulfill(json([])));
  await page.route(/\/returns\/alerts(\?.*)?$/, (route) => route.fulfill(json([])));

  // Tarifario oficial de daños estéticos (mas especifico que el detalle: se registra despues).
  await page.route(/\/returns\/cosmetic-tariff(\?.*)?$/, (route) => {
    intercepted.tariffRequests.push(route.request().url());
    return route.fulfill(json({ items: COSMETIC_TARIFF_FIXTURE }));
  });

  // Evidencia (URL firmada -> PUT a GCS -> registro -> listado).
  await page.route(/\/returns\/[^/]+\/evidence(\?.*)?$/, (route) => {
    if (route.request().method() === 'GET') return route.fulfill(json(evidence));
    return route.fulfill(
      json(
        { id: 'new-evidence', returnId: ret.id, type: 'PHOTO', zone: 'FRONTAL', objectUrl: 'https://storage.test/new.jpg', createdAt: '2026-10-05T09:30:00Z' },
        201,
      ),
    );
  });
  await page.route(/\/returns\/[^/]+\/evidence\/upload-url/, (route) =>
    route.fulfill(
      json(
        { uploadUrl: 'https://storage.test/upload/new.jpg', objectUrl: 'https://storage.test/new.jpg', expiresAt: '2026-10-05T10:00:00Z' },
        201,
      ),
    ),
  );
  await page.route('https://storage.test/upload/**', (route) =>
    route.fulfill({
      status: route.request().method() === 'OPTIONS' ? 204 : 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'PUT, OPTIONS',
        'access-control-allow-headers': '*',
      },
      body: '',
    }),
  );

  // Recepcion provisional (alta prioridad sobre el detalle).
  await page.route(/\/returns\/receive-provisional/, (route) => {
    const request = route.request();
    intercepted.commands.push({ path: '/returns/receive-provisional', ifMatch: undefined, body: request.postDataJSON() });
    ret = { ...ret, status: 'RECEPCION_PROVISIONAL' };
    return route.fulfill(json(ret, 201));
  });

  // Comandos con transicion de dominio.
  await page.route(/\/returns\/[^/]+\/commands\/([a-z-]+)/, (route) => {
    const request = route.request();
    const command = request.url().match(/\/commands\/([a-z-]+)/)?.[1] ?? '';
    const body = request.postDataJSON() as Record<string, unknown>;
    intercepted.commands.push({ path: command, ifMatch: request.headers()['if-match'], body });

    switch (command) {
      case 'register-alcohol-test': {
        const result = body.result as string;
        return route.fulfill(
          json(bump({ alcoholTestResult: result, status: result === 'FAVORABLE' ? 'INSPECCION' : 'RECEPCION_PROVISIONAL' })),
        );
      }
      case 'complete-inspection': {
        const doc = body.responsibilityDocument as Record<string, unknown> | undefined;
        if (!doc) return route.fulfill(json({ code: 'MISSING_RESPONSIBILITY_DOCUMENT' }, 422));
        const { signatureData: _signature, ...summary } = doc; // el expediente no devuelve la firma
        void _signature;
        return route.fulfill(
          json(bump({ status: body.hasDamages ? 'CON_DANOS' : 'SIN_DANOS', responsibilityDocument: summary })),
        );
      }
      case 'resolve-alcohol-escalation': {
        const decision = body.decision as string;
        return route.fulfill(
          json(
            bump({
              status: decision === 'CONTINUE_TO_INSPECTION' ? 'INSPECCION' : 'RECEPCION_PROVISIONAL',
              alcoholEscalation: {
                decision,
                markCustomerRed: body.markCustomerRed,
                notes: body.notes,
                decidedById: 'fake-uid-e2e',
                decidedAt: '2026-10-05T09:20:00Z',
              },
            }),
          ),
        );
      }
      case 'assess-damage': {
        const origin = body.origin as string;
        const severity = body.severity as string;
        const tariff = COSMETIC_TARIFF_FIXTURE.find((t) => t.code === body.damagedZone);
        const accepted = body.customerAcceptsCost === true;
        const customerRiskStatus = severity === 'GRAVE' ? 'ROJO' : accepted ? 'AMBAR' : severity === 'MODERADO' ? 'ROJO' : 'NORMAL';
        const damage = {
          id: `dmg-e2e-${ret.damages.length + 1}`,
          returnId: ret.id,
          origin,
          severity,
          damagedZone: body.damagedZone ?? null,
          // El servidor fija el monto estetico por tarifario; el tecnico es el manual del informe.
          estimatedAmount: origin === 'AESTHETIC' ? (tariff?.pricePen ?? null) : (body.estimatedAmount ?? null),
          externalReportReference: body.externalReportReference ?? null,
          description: body.description ?? null,
          customerRiskStatus,
          createdAt: '2026-10-05T09:40:00Z',
        };
        bump({ damages: [...ret.damages, damage] });
        return route.fulfill(json({ ...damage, returnVersion: ret.version, returnEtag: ret.etag }));
      }
      case 'charge-immobilization': {
        const charge = {
          id: `chg-e2e-${ret.immobilizationCharges.length + 1}`,
          returnId: ret.id,
          damageId: body.damageId ?? null,
          daysCharged: body.daysCharged,
          dailyRate: VEHICLE_DAILY_RATE,
          totalAmount: Number(body.daysCharged) * VEHICLE_DAILY_RATE,
          createdAt: '2026-10-05T09:45:00Z',
        };
        bump({ immobilizationCharges: [...ret.immobilizationCharges, charge] });
        return route.fulfill(json({ ...charge, returnVersion: ret.version, returnEtag: ret.etag }, 201));
      }
      case 'close-financial':
        return route.fulfill(json(bump({ status: 'CIERRE_FINANCIERO', finalSettlementAmount: Number(body.refundAmount) })));
      case 'close':
        return route.fulfill(json(bump({ status: 'CERRADA', closedAt: '2026-10-05T10:00:00Z' })));
      default:
        return route.fulfill(json({ code: 'UNKNOWN_COMMAND' }, 404));
    }
  });

  return intercepted;
}
