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
  customer: { id: 'cust-002', name: 'María García' },
  touristUse: false,
  createdAt: '2026-09-25T00:00:00Z',
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
  await page.route('**/identitytoolkit.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  );

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
  options: { list?: object[]; detail?: object } = {},
): Promise<void> {
  const list = options.list ?? [INQUIRY_FIXTURE];
  const detail = options.detail ?? { ...INQUIRY_FIXTURE, interactions: [], quotations: [] };

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
