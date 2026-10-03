import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  interceptCustomers,
  CUSTOMER_FIXTURE,
} from './helpers/routes';

test.describe('Módulo de Clientes (CLI-01 / CLI-02)', () => {
  test('CLI-01: bandeja lista clientes registrados', async ({ page }) => {
    await interceptCustomers(page);
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
});
