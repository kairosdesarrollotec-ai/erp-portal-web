import { expect, type Page } from '@playwright/test';
import { makeFakeJwt, resolveRoleOption, type E2eRoleOption } from './role-presets';
import * as EF from './e2e-fixtures';

// Re-exports so existing specs can keep importing from './helpers/routes'
export * from './role-presets';
export * from './e2e-fixtures';
export { interceptAdmin } from './admin-routes';

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

export async function interceptBackendAuth(
  page: Page,
  options: { assignments?: typeof EF.MULTI_ASSIGNMENTS; role?: E2eRoleOption } = {},
): Promise<void> {
  const resolvedAssignments = options.assignments ?? [EF.SINGLE_ASSIGNMENT];
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
      body: JSON.stringify({ assignments: resolvedAssignments }),
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

export async function interceptRentals(
  page: Page,
  options: { list?: object[]; detail?: object; evidence?: object[] } = {},
): Promise<void> {
  const list = options.list ?? [EF.RENTAL_FIXTURE];
  const detail = options.detail ?? EF.RENTAL_FIXTURE;
  const evidence = options.evidence ?? [];

  // GET /rentals/:id/evidence - ALQ-09, lista de evidencia real (foto/video).
  await page.route(/\/rentals\/[^/]+\/evidence(\?.*)?$/, (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(evidence) });
  });

  const notaryDetail = {
    ...EF.RENTAL_FIXTURE,
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
    contract: { documentRef: `CONTRATO-${EF.RENTAL_FIXTURE.id.slice(0, 8)}` },
    deposit: { originalAmount: '500.00', currency: 'PEN' },
  };

  // Command: validate-documents
  await page.route(/\/rentals\/[^/]+\/commands\/validate-documents/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ...EF.RENTAL_FIXTURE, status: 'VALIDATION', version: 2 }),
    }),
  );

  // Command: register-alcohol-test
  await page.route(/\/rentals\/[^/]+\/commands\/register-alcohol-test/, (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        ...EF.RENTAL_FIXTURE,
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
  const list = options.list ?? [EF.RESERVATION_FIXTURE];
  const detail = options.detail ?? EF.RESERVATION_FIXTURE;

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
  const list = options.list ?? [EF.INQUIRY_FIXTURE];
  const detail = options.detail ?? { ...EF.INQUIRY_FIXTURE, interactions: [], quotations: [] };
  const customer = options.customer ?? EF.CUSTOMER_FIXTURE;

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
  const list = options.list ?? [EF.CUSTOMER_FIXTURE];
  const detail = options.detail ?? EF.CUSTOMER_FIXTURE;

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

/** Intercepta GET /fleet/vehicles y GET /fleet/vehicles/:id */
export async function interceptFleet(
  page: Page,
  options: { list?: object[]; detail?: object } = {},
): Promise<void> {
  const list = options.list ?? [EF.VEHICLE_FIXTURE];
  const detail = options.detail ?? EF.VEHICLE_FIXTURE;

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
  options: { email?: string; password?: string; assignments?: typeof EF.MULTI_ASSIGNMENTS; role?: E2eRoleOption } = {},
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
