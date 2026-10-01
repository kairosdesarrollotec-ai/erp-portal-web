import type { Page } from '@playwright/test';

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

export const SINGLE_ASSIGNMENT = {
  companyId: 'company-001',
  companyName: 'VeloxRent Lima',
  branchId: 'branch-001',
  branchName: 'Sede Miraflores',
  role: 'RESERVATION_AGENT',
};

export const MULTI_ASSIGNMENTS = [
  SINGLE_ASSIGNMENT,
  { companyId: 'company-001', companyName: 'VeloxRent Lima', branchId: 'branch-002', branchName: 'Sede San Isidro', role: 'RESERVATION_AGENT' },
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
  options: { assignments?: typeof MULTI_ASSIGNMENTS } = {},
): Promise<void> {
  const assignments = options.assignments ?? [SINGLE_ASSIGNMENT];

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
      body: JSON.stringify({ role: 'RESERVATION_AGENT', state: 'EMPTY' }),
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
export async function interceptRentals(
  page: Page,
  options: { list?: object[]; detail?: object } = {},
): Promise<void> {
  const list = options.list ?? [RENTAL_FIXTURE];
  const detail = options.detail ?? RENTAL_FIXTURE;

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
      body: JSON.stringify({ rentals: list, total: list.length }),
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

/** Realiza el flujo de login completo via UI (Firebase y backend interceptados). */
export async function loginViaUI(
  page: Page,
  options: { email?: string; password?: string; assignments?: typeof MULTI_ASSIGNMENTS } = {},
): Promise<void> {
  const email = options.email ?? 'agente@veloxrent.pe';
  const password = options.password ?? 'Velox2026!';

  await interceptFirebaseAuth(page, email);
  await interceptBackendAuth(page, { assignments: options.assignments });

  await page.goto('/');
  await page.getByLabel('Correo o usuario').fill(email);
  // exact:true evita la ambiguedad con el boton aria-label="Mostrar contraseña"
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}
