import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  interceptFleet,
  VEHICLE_FIXTURE,
} from './helpers/routes';

test.describe('Módulo de Flota (FLO-01 / FLO-02)', () => {
  test('FLO-01: catálogo de flota muestra unidades activas', async ({ page }) => {
    await interceptFleet(page);
    await loginViaUI(page);
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/flota');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Flota' })).toBeVisible();
    await expect(page.getByText('Toyota Hilux')).toBeVisible();
    await expect(page.getByText('ABC-123')).toBeVisible();
    await expect(page.getByText('Disponible')).toBeVisible();
  });

  test('FLO-01: estado vacío cuando no hay vehículos', async ({ page }) => {
    await interceptFleet(page, { list: [] });
    await loginViaUI(page);
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/flota');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/no hay vehículos registrados/i)).toBeVisible();
  });

  test('FLO-02: detalle técnico del vehículo', async ({ page }) => {
    await interceptFleet(page);
    await loginViaUI(page);
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto(`/flota/${VEHICLE_FIXTURE.id}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('ABC-123')).toBeVisible();
    await expect(page.getByText('Toyota Hilux')).toBeVisible();
    await expect(page.getByText(/Disponible/i)).toBeVisible();
  });
});
