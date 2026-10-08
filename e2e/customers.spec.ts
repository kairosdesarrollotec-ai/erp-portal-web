import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  interceptCustomers,
  waitForPermissionsReady,
  CUSTOMER_FIXTURE,
} from './helpers/routes';

test.describe('Módulo de Clientes (CLI-01 / CLI-02)', () => {
  test('CLI-01: bandeja lista clientes registrados', async ({ page }) => {
    await interceptCustomers(page);
    // FRONT_OFFICE incluye CUSTOMER.READ (fase 4) — acceso correcto
    await loginViaUI(page);
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/clientes');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByText('María García')).toBeVisible();
    await expect(page.getByText('12345678')).toBeVisible();
  });

  test('CLI-01: estado vacío cuando no hay clientes', async ({ page }) => {
    await interceptCustomers(page, { list: [] });
    await loginViaUI(page);
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/clientes');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/no hay clientes registrados en esta empresa/i)).toBeVisible();
  });

  test('CLI-02: detalle y ficha 360 del cliente', async ({ page }) => {
    await interceptCustomers(page);
    await loginViaUI(page);
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto(`/clientes/${CUSTOMER_FIXTURE.id}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'María García' })).toBeVisible();
    await expect(page.locator('strong', { hasText: '12345678' }).first()).toBeVisible();
    await expect(page.getByText('maria.garcia@example.com')).toBeVisible();
  });

  // --- Control de acceso (ROLES-DIN-03 fase 4) ---

  test('CLI-01: usuario con CUSTOMER.READ (FRONT_OFFICE) ve la bandeja', async ({ page }) => {
    await interceptCustomers(page);
    // FRONT_OFFICE tiene CUSTOMER.READ según la matriz v0 (customer-role.policy.ts)
    await loginViaUI(page, { role: 'FRONT_OFFICE' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/clientes');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByText('María García')).toBeVisible();
    // Botón "Nuevo Cliente" sí debe aparecer (FRONT_OFFICE tiene CUSTOMER.WRITE)
    await expect(page.getByRole('button', { name: /Nuevo Cliente/i })).toBeVisible();
  });

  test('CLI-01: usuario sin CUSTOMER.READ (RRHH) ve estado FORBIDDEN', async ({ page }) => {
    // El rol RRHH no tiene CUSTOMER.READ: el backend devuelve 403 → la UI muestra FORBIDDEN.
    await page.route(/\/customers(\?.*)?$/, (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'CUSTOMER_READ_NOT_ALLOWED', detail: 'Acceso denegado.' }),
      });
    });
    await loginViaUI(page, { role: 'RRHH' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/clientes');
    await waitForPermissionsReady(page);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(/no tienes permisos para ver el directorio de clientes/i),
    ).toBeVisible();
  });

  test('CLI-01: usuario con CUSTOMER.WRITE (FRONT_OFFICE) ve botón Nuevo Cliente', async ({ page }) => {
    await interceptCustomers(page);
    await loginViaUI(page, { role: 'FRONT_OFFICE' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/clientes');
    await page.waitForLoadState('networkidle');

    // FRONT_OFFICE tiene CUSTOMER.WRITE: el botón "Nuevo Cliente" es visible
    await expect(page.getByRole('button', { name: /Nuevo Cliente/i })).toBeVisible();
  });

  test('CLI-01: usuario sin CUSTOMER.WRITE (AUDITORIA) NO ve botón Nuevo Cliente', async ({ page }) => {
    await interceptCustomers(page);
    // AUDITORIA solo tiene CUSTOMER.READ, no CUSTOMER.WRITE
    await loginViaUI(page, { role: 'AUDITORIA' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/clientes');
    await waitForPermissionsReady(page);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuevo Cliente/i })).not.toBeVisible();
  });
});
