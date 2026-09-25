import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  interceptInquiries,
  INQUIRY_FIXTURE,
} from './helpers/routes';

/**
 * CON-01 / CON-02 — bandeja y detalle de consultas.
 *
 * Asume login completado via loginViaUI (Firebase y backend interceptados).
 */

test.describe('Bandeja de Consultas (CON-01)', () => {
  test('muestra la lista de consultas con los datos del fixture', async ({ page }) => {
    await interceptInquiries(page);
    await loginViaUI(page);

    await page.waitForURL('**/tablero', { timeout: 10_000 });
    await page.goto('/consultas');

    await expect(page.getByRole('heading', { name: 'Consultas' })).toBeVisible();
    await expect(page.getByText('María García')).toBeVisible();
  });

  test('pantalla vacia cuando no hay consultas', async ({ page }) => {
    await interceptInquiries(page, { list: [] });
    await loginViaUI(page);

    await page.waitForURL('**/tablero', { timeout: 10_000 });
    await page.goto('/consultas');

    await expect(page.getByText(/no hay consultas/i)).toBeVisible();
  });

  test('boton Nueva Consulta esta visible y navega al formulario', async ({ page }) => {
    await interceptInquiries(page);
    await loginViaUI(page);

    await page.waitForURL('**/tablero', { timeout: 10_000 });
    await page.goto('/consultas');

    await expect(page.getByRole('button', { name: 'Nueva Consulta' })).toBeVisible();
    await page.getByRole('button', { name: 'Nueva Consulta' }).click();
    await page.waitForURL('**/consultas/nueva', { timeout: 10_000 });
    expect(page.url()).toContain('/consultas/nueva');
  });

  test('click en una consulta navega al detalle (CON-02)', async ({ page }) => {
    await interceptInquiries(page);
    await loginViaUI(page);

    await page.waitForURL('**/tablero', { timeout: 10_000 });
    await page.goto('/consultas');

    await expect(page.getByText('María García')).toBeVisible();
    // El link accesible de la fila incluye el id de la consulta en el href
    const link = page.getByRole('link', { name: /María García|Ver consulta/i }).first();
    await link.click();

    await page.waitForURL(`**/consultas/${INQUIRY_FIXTURE.id}`, { timeout: 10_000 });
    expect(page.url()).toContain(`/consultas/${INQUIRY_FIXTURE.id}`);
  });
});
