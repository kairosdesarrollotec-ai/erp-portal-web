import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  interceptFleet,
  waitForPermissionsReady,
  VEHICLE_FIXTURE,
} from './helpers/routes';

test.describe('Módulo de Flota (FLO-01 / FLO-02)', () => {
  test('FLO-01: catálogo de flota muestra unidades activas', async ({ page }) => {
    await interceptFleet(page);
    // FRONT_OFFICE incluye FLEET.READ (fase 4) — acceso correcto
    await loginViaUI(page);
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/flota');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Flota/i })).toBeVisible();
    await expect(page.getByText('Toyota Hilux')).toBeVisible();
    await expect(page.getByText('ABC-123')).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^Disponible$/ })).toBeVisible();
  });

  test('FLO-01: estado vacío cuando no hay vehículos', async ({ page }) => {
    await interceptFleet(page, { list: [] });
    await loginViaUI(page);
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/flota');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/no hay vehículos registrados en la flota de esta empresa/i)).toBeVisible();
  });

  test('FLO-02: detalle técnico del vehículo', async ({ page }) => {
    await interceptFleet(page);
    await loginViaUI(page);
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto(`/flota/${VEHICLE_FIXTURE.id}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('strong', { hasText: 'ABC-123' }).first()).toBeVisible();
    await expect(page.getByText('Toyota Hilux')).toBeVisible();
    await expect(page.getByText(/Disponible/i).first()).toBeVisible();
  });

  // --- Control de acceso (ROLES-DIN-03 fase 4) ---

  test('FLO-01: usuario con FLEET.READ (FRONT_OFFICE) ve el catálogo', async ({ page }) => {
    await interceptFleet(page);
    // FRONT_OFFICE tiene FLEET.READ según la matriz v0 (fleet-role.policy.ts)
    await loginViaUI(page, { role: 'FRONT_OFFICE' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/flota');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Flota/i })).toBeVisible();
    await expect(page.getByText('Toyota Hilux')).toBeVisible();
    // El botón "Nuevo Vehículo" NO debe aparecer (FRONT_OFFICE no tiene FLEET.WRITE)
    await expect(page.getByRole('button', { name: /Nuevo Vehículo/i })).not.toBeVisible();
  });

  test('FLO-01: usuario sin FLEET.READ (RRHH) ve estado FORBIDDEN', async ({ page }) => {
    // El rol RRHH no tiene FLEET.READ: el backend devuelve 403 → la UI muestra FORBIDDEN.
    await page.route(/\/fleet\/vehicles/, (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'FLEET_READ_NOT_ALLOWED', detail: 'Acceso denegado.' }),
      }),
    );
    await loginViaUI(page, { role: 'RRHH' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/flota');
    await waitForPermissionsReady(page);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(/no tienes permisos para ver la flota/i),
    ).toBeVisible();
  });

  test('FLO-01: usuario con FLEET.WRITE (GERENCIA) ve el botón "Nuevo Vehículo"', async ({ page }) => {
    await interceptFleet(page);
    // GERENCIA tiene FLEET.READ y FLEET.WRITE según la matriz v0
    await loginViaUI(page, { role: 'GERENCIA' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/flota');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Flota/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuevo Vehículo/i })).toBeVisible();
  });
});
