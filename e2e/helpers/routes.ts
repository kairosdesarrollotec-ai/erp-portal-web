import { expect, type Page } from '@playwright/test';
import { interceptAdminRoles, type InterceptedRoles, type RoleFixture } from './admin-roles';

/**
 * JWT con firma falsa pero estructura valida (header.payload.sig).
 * Firebase SDK decodifica el payload para leer `exp` y decidir si
 * refrescar el token; `exp: 9999999999` (año 2286) evita que intente
 * refrescar durante los tests.
 */
export function makeFakeJwt(email = 'agente@veloxrent.pe'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: 'fake-uid-e2e', email, iat: 1_000_000_000, exp: 9_999_999_999 }),
  ).toString('base64url');
  return `${header}.${payload}.fake-signature`;
}

export const FAKE_ID_TOKEN = makeFakeJwt();

/**
 * Roles dinamicos (ADM-02): el rol viaja como RoleRef `{id, name, key}` y el acceso
 * se decide por permisos (`GET /me/permissions`), no por el rol.
 */
export interface E2eRole {
  id: string;
  name: string;
  /** Codigo estable de los roles de sistema; null en roles creados a mano. */
  key: string | null;
}

const INCIDENT_ALL = ['VIEW', 'CREATE', 'ADD_ACTION', 'RESOLVE', 'CLOSE', 'REFER_LEGAL'].map((a) => `INCIDENT.${a}`);
const ADMIN_ALL = ['MANAGE_USERS', 'VIEW_AUDIT', 'MANAGE_PARAMETERS', 'MANAGE_PERMISSIONS', 'MANAGE_NOTIFICATIONS'].map(
  (a) => `ADMIN.${a}`,
);
const RESERVATION_OPERATIONAL = [
  'READ_LIST', 'READ_DETAIL', 'CREATE', 'REGISTER_PAYMENT', 'REGISTER_DOCUMENTS', 'CONFIRM', 'CANCEL_CUSTOMER_REQUESTED_CHANGE',
].map((a) => `RESERVATION.${a}`);
const INQUIRY_ALL = ['READ', 'REGISTER', 'QUOTE', 'CLOSE', 'CONVERT_TO_RESERVATION', 'CONVERT_TO_RENTAL'].map((a) => `INQUIRY.${a}`);
const RENTAL_OPERATIONAL = [
  'CREATE', 'READ', 'VALIDATE_DOCUMENTS', 'REGISTER_ALCOHOL_TEST', 'EVALUATE_NOTARY', 'FORMALIZE_CONTRACT', 'COMPLETE_DELIVERY', 'UPLOAD_EVIDENCE',
].map((a) => `RENTAL.${a}`);

/** Roles de sistema con una aproximacion de los permisos que siembra la matriz v0. */
export const ROLE_PRESETS: Record<string, { role: E2eRole; permissions: string[] }> = {
  FRONT_OFFICE: {
    role: { id: 'role-front-office', name: 'Front Office', key: 'FRONT_OFFICE' },
    permissions: [...RESERVATION_OPERATIONAL, ...INQUIRY_ALL, ...RENTAL_OPERATIONAL, ...INCIDENT_ALL],
  },
  ADMINISTRACION: {
    role: { id: 'role-administracion', name: 'Administración', key: 'ADMINISTRACION' },
    permissions: [...ADMIN_ALL, ...RESERVATION_OPERATIONAL, ...INQUIRY_ALL, 'INCIDENT.VIEW'],
  },
  GERENCIA: {
    role: { id: 'role-gerencia', name: 'Gerencia', key: 'GERENCIA' },
    permissions: [...RESERVATION_OPERATIONAL, 'RESERVATION.CANCEL_NO_SHOW', 'RENTAL.APPROVE_NOTARY_EXCEPTION', ...INCIDENT_ALL],
  },
  AUDITORIA: {
    role: { id: 'role-auditoria', name: 'Auditoría', key: 'AUDITORIA' },
    permissions: ['ADMIN.VIEW_AUDIT', 'INCIDENT.VIEW', 'RESERVATION.READ_LIST', 'RESERVATION.READ_DETAIL', 'INQUIRY.READ'],
  },
  RRHH: {
    role: { id: 'role-rrhh', name: 'RR. HH.', key: 'RRHH' },
    permissions: [],
  },
};

/** Rol de sesion de un login e2e: un preset por `key` o un rol personalizado con sus permisos. */
export type E2eRoleOption = string | { name: string; key?: string | null; permissions: string[] };

export function resolveRoleOption(option: E2eRoleOption | undefined): { role: E2eRole; permissions: string[] } {
  if (option === undefined) return ROLE_PRESETS.FRONT_OFFICE;
  if (typeof option === 'string') {
    const preset = ROLE_PRESETS[option];
    if (!preset) throw new Error(`Rol e2e desconocido: ${option}`);
    return preset;
  }
  return {
    role: { id: `role-custom-${option.name.toLowerCase().replace(/\W+/g, '-')}`, name: option.name, key: option.key ?? null },
    permissions: option.permissions,
  };
}

export const SINGLE_ASSIGNMENT = {
  companyId: 'company-001',
  companyName: 'VeloxRent Lima',
  branchId: 'branch-001',
  branchName: 'Sede Miraflores',
  role: ROLE_PRESETS.FRONT_OFFICE.role,
};

export const MULTI_ASSIGNMENTS = [
  SINGLE_ASSIGNMENT,
  { companyId: 'company-001', companyName: 'VeloxRent Lima', branchId: 'branch-002', branchName: 'Sede San Isidro', role: ROLE_PRESETS.FRONT_OFFICE.role },
];

export const RESERVATION_FIXTURE = {
  id: 'res-e2e-001',
  status: 'DRAFT',
  channelMode: 'PRESENCIAL',
  version: 1,
  customer: { id: 'cust-001', name: 'Carlos López' },
  vehicle: { id: 'veh-001', plate: 'ABC-123', label: 'Toyota Corolla 2022' },
  startAt: '2026-10-01T09:00:00Z',
  endAt: '2026-10-01T11:00:00Z',
  requiredPayment: { amount: '350.00', currency: 'PEN' },
  requirements: { paymentValidatedAt: null, documentsCompletedAt: null },
  missingRequirements: ['payment', 'documents'],
  confirmedAt: null,
  createdAt: '2026-09-25T00:00:00Z',
};

export const INQUIRY_FIXTURE = {
  id: 'inq-e2e-001',
  status: 'OPEN',
  channel: 'PRESENCIAL',
  version: 1,
  companyId: 'company-001',
  branchId: 'branch-001',
  customerId: 'cust-002',
  touristUse: false,
  createdAt: '2026-09-25T00:00:00Z',
};

export const CUSTOMER_FIXTURE = {
  id: 'cust-002',
  organizationId: 'org-001',
  operatingCompanyId: 'company-001',
  fullName: 'María García',
  documentType: 'DNI',
  documentNumber: '12345678',
  nationality: 'PERUANO',
  email: 'maria.garcia@example.com',
  phone: '999999999',
  createdAt: '2026-09-20T00:00:00Z',
  updatedAt: '2026-09-20T00:00:00Z',
};

/**
 * Intercepta todas las llamadas de Firebase Auth (signIn y token refresh).
 *
 * IMPORTANTE — orden de registro: Playwright ejecuta el handler registrado MAS
 * RECIENTEMENTE primero. La catch-all debe registrarse PRIMERO (prioridad baja)
 * y el handler especifico de signInWithPassword ULTIMO (prioridad alta), de lo
 * contrario la catch-all intercepta signInWithPassword y llama route.continue()
 * enviando la request real a Firebase con la API key falsa, lo que falla en CI.
 */
export async function interceptFirebaseAuth(page: Page, email = 'agente@veloxrent.pe'): Promise<void> {
  const idToken = makeFakeJwt(email);

  // 1. Catch-all para otras llamadas de inicializacion del SDK (baja prioridad).
  // accounts:lookup requiere users[] — el SDK falla si el array esta ausente.
  await page.route('**/identitytoolkit.googleapis.com/**', (route) => {
    if (route.request().url().includes('accounts:lookup')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kind: 'identitytoolkit#GetAccountInfoResponse',
          users: [{
            localId: 'fake-uid-e2e',
            email,
            emailVerified: true,
            lastLoginAt: '1000000000000',
            createdAt: '1000000000000',
            validSince: '1000000000',
          }],
        }),
      });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });

  // 2. Refresco de token (securetoken).
  await page.route('**/securetoken.googleapis.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id_token: idToken, refresh_token: 'fake-refresh-token', expires_in: '3600' }),
    }),
  );

  // 3. signInWithEmailAndPassword (alta prioridad — registrado ultimo, corre primero).
  await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        kind: 'identitytoolkit#VerifyPasswordResponse',
        localId: 'fake-uid-e2e',
        email,
        idToken,
        registered: true,
        refreshToken: 'fake-refresh-token',
        expiresIn: '3600',
      }),
    }),
  );
}

/**
 * Intercepta los endpoints de autenticacion/sesion del backend:
 * auditoria de login, estado de activacion, asignaciones, contexto.
 */
export async function interceptBackendAuth(
  page: Page,
  options: { assignments?: typeof MULTI_ASSIGNMENTS; role?: E2eRoleOption } = {},
): Promise<void> {
  const assignments = options.assignments ?? [SINGLE_ASSIGNMENT];
  const { role, permissions } = resolveRoleOption(options.role);

  // GET /me/permissions: unica fuente del front para mostrar u ocultar modulos y acciones.
  await page.route('**/me/permissions**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        role,
        matrixVersion: 1,
        permissions: permissions.map((p) => {
          const [module, action] = p.split('.');
          return { module, action };
        }),
      }),
    }),
  );

  await page.route('**/audit/login-attempts', (route) =>
    route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }),
  );

  await page.route('**/users/me/activation-status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ requiresPasswordChange: false, requiresMfaEnrollment: false }),
    }),
  );

  await page.route('**/users/me/assignments', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ assignments }),
    }),
  );

  await page.route('**/users/me/work-context', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );

  await page.route('**/users/me/dashboard**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ role, state: 'EMPTY' }),
    }),
  );

  await page.route('**/notifications**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ notifications: [], total: 0, unread: 0 }),
    }),
  );
}

export const RENTAL_FIXTURE = {
  id: 'rent-e2e-001',
  status: 'DRAFT',
  customerName: 'Carlos López',
  customerDocNumber: '12345678',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehiclePlate: 'ABC-123',
  planCode: 'NORMAL',
  startAt: '2026-10-01T09:00:00Z',
  expectedEndAt: '2026-10-05T09:00:00Z',
  alcoholTestResult: null,
  notaryEvaluation: null,
  contract: null,
  deposit: null,
  version: 1,
};

/**
 * Intercepta los endpoints del módulo rentals:
 * GET /rentals, GET /rentals/:id, POST /rentals, POST /rentals/from-reservation/:id,
 * y todos los comandos del asistente de entrega.
 */
export function makeEvidenceFixture(
  rentalId = RENTAL_FIXTURE.id,
  photos = 35,
  videos = 3,
): object[] {
  const items: object[] = [];
  for (let i = 0; i < photos; i++) {
    items.push({
      id: `evidence-photo-${i}`,
      rentalId,
      type: 'PHOTO',
      zone: 'FRONTAL',
      objectUrl: `https://storage.test/evidence-photo-${i}.jpg`,
      uploadedBy: 'fake-uid-e2e',
      uploadedAt: '2026-10-01T09:00:00Z',
    });
  }
  for (let i = 0; i < videos; i++) {
    items.push({
      id: `evidence-video-${i}`,
      rentalId,
      type: 'VIDEO',
      zone: 'FRONTAL',
      objectUrl: `https://storage.test/evidence-video-${i}.mp4`,
      uploadedBy: 'fake-uid-e2e',
      uploadedAt: '2026-10-01T09:00:00Z',
    });
  }
  return items;
}

export async function interceptRentals(
  page: Page,
  options: { list?: object[]; detail?: object; evidence?: object[] } = {},
): Promise<void> {
  const list = options.list ?? [RENTAL_FIXTURE];
  const detail = options.detail ?? RENTAL_FIXTURE;
  const evidence = options.evidence ?? [];

  // GET /rentals/:id/evidence - ALQ-09, lista de evidencia real (foto/video).
  await page.route(/\/rentals\/[^/]+\/evidence(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(evidence) });
  });

  const notaryDetail = {
    ...RENTAL_FIXTURE,
    version: 2,
    notaryEvaluation: {
      result: 'MANDATORY',
      reason: 'Vehículo de categoría que requiere notaría obligatoria.',
      approvedBy: null,
    },
  };

  const contractDetail = {
    ...notaryDetail,
    version: 3,
    contract: { documentRef: `CONTRATO-${RENTAL_FIXTURE.id.slice(0, 8)}` },
    deposit: { originalAmount: '500.00', currency: 'PEN' },
  };

  // Command: validate-documents
  await page.route(/\/rentals\/[^/]+\/commands\/validate-documents/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ...RENTAL_FIXTURE, status: 'VALIDATION', version: 2 }),
    }),
  );

  // Command: register-alcohol-test
  await page.route(/\/rentals\/[^/]+\/commands\/register-alcohol-test/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        ...RENTAL_FIXTURE,
        status: 'NOTARY_EVALUATION',
        alcoholTestResult: 'FAVORABLE',
        version: 2,
      }),
    }),
  );

  // Command: evaluate-notary
  await page.route(/\/rentals\/[^/]+\/commands\/evaluate-notary/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ rental: notaryDetail, evaluation: notaryDetail.notaryEvaluation }),
    }),
  );

  // Command: approve-notary-exception
  await page.route(/\/rentals\/[^/]+\/commands\/approve-notary-exception/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ...notaryDetail, notaryEvaluation: { ...notaryDetail.notaryEvaluation, approvedBy: 'fake-uid-e2e' } }),
    }),
  );

  // Command: formalize-contract
  await page.route(/\/rentals\/[^/]+\/commands\/formalize-contract/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(contractDetail),
    }),
  );

  // Command: complete-delivery
  await page.route(/\/rentals\/[^/]+\/commands\/complete-delivery/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ...contractDetail, status: 'ACTIVE', version: 4 }),
    }),
  );

  // POST /rentals/from-reservation/:id
  await page.route(/\/rentals\/from-reservation\/[^?/]+/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(detail),
    }),
  );

  // POST /rentals (create)
  await page.route(/\/rentals$/, (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(detail),
    });
  });

  // GET /rentals/:id (detail — registered after POST to have lower priority)
  await page.route(/\/rentals\/[^?/]+(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(detail),
    }),
  );

  // GET /rentals (list — registered last)
  await page.route(/\/rentals(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(list),
    }),
  );
}

/** Intercepta GET /reservations y GET /reservations/:id. */
export async function interceptReservations(
  page: Page,
  options: { list?: object[]; detail?: object } = {},
): Promise<void> {
  const list = options.list ?? [RESERVATION_FIXTURE];
  const detail = options.detail ?? RESERVATION_FIXTURE;

  await page.route(/\/reservations\/[^?]+/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) }),
  );

  await page.route(/\/reservations(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(list) }),
  );
}

/** Intercepta GET /inquiries y GET /inquiries/:id. */
export async function interceptInquiries(
  page: Page,
  options: { list?: object[]; detail?: object; customer?: object } = {},
): Promise<void> {
  const list = options.list ?? [INQUIRY_FIXTURE];
  const detail = options.detail ?? { ...INQUIRY_FIXTURE, interactions: [], quotations: [] };
  const customer = options.customer ?? CUSTOMER_FIXTURE;

  await page.route(/\/customers\/[^?/]+(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(customer) }),
  );

  await page.route(/\/inquiries\/[^?/]+(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) }),
  );

  await page.route(/\/inquiries(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(list) }),
  );
}

/** Intercepta GET /customers y GET /customers/:id */
export async function interceptCustomers(
  page: Page,
  options: { list?: object[]; detail?: object } = {},
): Promise<void> {
  const list = options.list ?? [CUSTOMER_FIXTURE];
  const detail = options.detail ?? CUSTOMER_FIXTURE;

  await page.route(/\/customers\/[^?/]+(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(detail),
    });
  });

  await page.route(/\/customers(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: list, total: list.length }),
    });
  });
}

export const VEHICLE_FIXTURE = {
  id: 'veh-e2e-001',
  organizationId: 'org-001',
  operatingCompanyId: 'company-001',
  branchId: 'branch-001',
  plate: 'ABC-123',
  brand: 'Toyota',
  model: 'Hilux',
  year: 2023,
  status: 'AVAILABLE',
  dailyRate: 150,
  category: 'CAMIONETA',
  transmission: 'AUTOMATICA',
  fuelType: 'DIESEL',
  seatCount: 5,
  hasAirConditioning: true,
  createdAt: '2026-09-20T00:00:00Z',
  updatedAt: '2026-09-20T00:00:00Z',
};

/** Intercepta GET /fleet/vehicles y GET /fleet/vehicles/:id */
export async function interceptFleet(
  page: Page,
  options: { list?: object[]; detail?: object } = {},
): Promise<void> {
  const list = options.list ?? [VEHICLE_FIXTURE];
  const detail = options.detail ?? VEHICLE_FIXTURE;

  await page.route(/\/fleet\/vehicles\/[^?/]+(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(detail),
    });
  });

  await page.route(/\/fleet\/vehicles(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: list, total: list.length }),
    });
  });
}

/** Intercepta endpoints administrativos (usuarios, auditoria, parametros, permisos, plantillas) */
export async function interceptAdmin(page: Page, options: { roles?: RoleFixture[] } = {}): Promise<InterceptedRoles> {
  await page.route(/\/admin\/users(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        users: [
          {
            id: 'assign-001',
            firebaseUid: 'user-001',
            email: 'agente@veloxrent.pe',
            companyId: 'company-001',
            companyName: 'VeloxRent Lima',
            branchId: 'branch-001',
            branchName: 'Sede Miraflores',
            role: ROLE_PRESETS.FRONT_OFFICE.role,
            active: true,
            mfaEnrolled: true,
          },
          {
            id: 'assign-002',
            firebaseUid: 'user-002',
            email: 'admin@veloxrent.pe',
            companyId: 'company-001',
            companyName: 'VeloxRent Lima',
            branchId: 'branch-001',
            branchName: 'Sede Miraflores',
            role: ROLE_PRESETS.ADMINISTRACION.role,
            active: true,
            mfaEnrolled: true,
          },
        ],
      }),
    }),
  );

  await page.route(/\/admin\/companies(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        companies: [
          {
            companyId: 'company-001',
            companyName: 'VeloxRent Lima',
            branches: [{ branchId: 'branch-001', branchName: 'Sede Miraflores' }],
          },
        ],
      }),
    }),
  );

  await page.route(/\/admin\/audit-events(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [
          {
            id: 'audit-001',
            actorFirebaseUid: 'fake-uid-e2e',
            actorEmail: 'admin@veloxrent.pe',
            entityType: 'Rental',
            entityId: 'rent-001',
            action: 'FORMALIZE_CONTRACT',
            changes: { status: 'PENDING_DELIVERY' },
            createdAt: '2026-10-02T15:30:00Z',
          },
          {
            id: 'audit-002',
            actorFirebaseUid: 'fake-uid-e2e',
            actorEmail: 'admin@veloxrent.pe',
            entityType: 'Vehicle',
            entityId: 'veh-001',
            action: 'UPDATE_STATUS',
            changes: { status: 'AVAILABLE' },
            createdAt: '2026-10-02T14:10:00Z',
          },
        ],
      }),
    }),
  );

  await page.route(/\/admin\/parameters\/reservation-deposit-policy(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current: {
          version: 2,
          amount: '350.00',
          currency: 'PEN',
          effectiveFrom: '2026-09-15T00:00:00Z',
        },
        history: [
          {
            version: 1,
            amount: '300.00',
            currency: 'PEN',
            effectiveFrom: '2026-01-01T00:00:00Z',
          },
        ],
      }),
    }),
  );

  await page.route(/\/rentals\/contract-templates(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'tpl-001',
          companyId: 'company-001',
          type: 'RENTAL_CONTRACT',
          version: 1,
          status: 'ACTIVE',
          effectiveFrom: '2026-09-01T00:00:00Z',
          effectiveTo: null,
          createdAt: '2026-09-01T00:00:00Z',
        },
      ]),
    }),
  );

  // Roles dinamicos y matriz de permisos: servidor simulado con estado (helpers/admin-roles.ts).
  const rolesApi = await interceptAdminRoles(page, options);

  await page.route(/\/admin\/notification-templates(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        templates: [
          {
            eventType: 'RESERVATION_CONFIRMED',
            label: 'Reserva confirmada',
            current: {
              eventType: 'RESERVATION_CONFIRMED',
              version: 1,
              channels: ['EMAIL', 'SMS'],
              body: 'Estimado/a {cliente}, su reserva {codigo_reserva} ha sido confirmada.',
            },
            history: [],
          },
          {
            eventType: 'RENTAL_DELIVERED',
            label: 'Vehículo entregado',
            current: {
              eventType: 'RENTAL_DELIVERED',
              version: 1,
              channels: ['EMAIL'],
              body: 'Hola {cliente}, se ha registrado la entrega del vehículo con placa {placa}.',
            },
            history: [],
          },
        ],
        allowedVariables: ['cliente', 'codigo_reserva', 'placa', 'fecha_inicio'],
        channels: ['EMAIL', 'PUSH', 'SMS'],
      }),
    }),
  );

  return rolesApi;
}

/**
 * Espera a que el front termine de cargar los permisos efectivos (GET /me/permissions)
 * del contexto actual. Imprescindible antes de afirmar que algo NO se muestra: sin
 * esta espera, un `toHaveCount(0)` pasaria solo porque los permisos aun no llegaron.
 */
export async function waitForPermissionsReady(page: Page): Promise<void> {
  await expect(page.getByRole('navigation', { name: 'Módulos del sistema' })).toHaveAttribute(
    'data-permissions-status',
    'ready',
  );
}

/** Realiza el flujo de login completo via UI (Firebase y backend interceptados). */
export async function loginViaUI(
  page: Page,
  options: { email?: string; password?: string; assignments?: typeof MULTI_ASSIGNMENTS; role?: E2eRoleOption } = {},
): Promise<void> {
  const email = options.email ?? 'agente@veloxrent.pe';
  const password = options.password ?? 'Velox2026!';

  await interceptFirebaseAuth(page, email);
  await interceptBackendAuth(page, { assignments: options.assignments, role: options.role });

  await page.goto('/');
  await page.getByLabel('Correo o usuario').fill(email);
  // exact:true evita la ambiguedad con el boton aria-label="Mostrar contraseña"
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}
