import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  interceptAdmin,
} from './helpers/routes';

test.describe('Módulo de Administración (ADM-01 / ADM-03 / ADM-04)', () => {
  test('ADM-01: lista de usuarios y asignaciones', async ({ page }) => {
    await interceptAdmin(page);
    await loginViaUI(page, { role: 'ADMINISTRACION' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/admin/usuarios');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Usuarios y asignaciones/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'agente@veloxrent.pe' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'admin@veloxrent.pe' })).toBeVisible();
  });

  test('ADM-04: historial de auditoría del sistema', async ({ page }) => {
    await interceptAdmin(page);
    await loginViaUI(page, { role: 'ADMINISTRACION' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/admin/auditoria');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Auditoría/i })).toBeVisible();
    await expect(page.getByText('FORMALIZE_CONTRACT')).toBeVisible();
    await expect(page.getByText('UPDATE_STATUS')).toBeVisible();
  });

  test('ADM-03: parámetros y política de reserva vigente', async ({ page }) => {
    await interceptAdmin(page);
    await loginViaUI(page, { role: 'ADMINISTRACION' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/admin/parametros');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/350.00/i)).toBeVisible();
    await expect(page.getByText(/RENTAL_CONTRACT/i)).toBeVisible();
  });
});
