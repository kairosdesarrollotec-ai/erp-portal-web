import { test, expect, Page } from '@playwright/test';
import {
  loginViaUI,
  interceptInquiries,
  INQUIRY_FIXTURE,
  RENTAL_FIXTURE,
  interceptRentals,
  interceptFleet,
} from './helpers/routes';

/**
 * CON-01 / CON-02 — bandeja y detalle de consultas.
 *
 * Asume login completado via loginViaUI (Firebase y backend interceptados).
 * Navega al módulo via sidebar (SPA navigation) para preservar el rol en
 * Zustand — page.goto() haría un full reload y perdería el estado.
 */

async function navigateToInquiries(page: Page): Promise<void> {
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.getByRole('link', { name: 'Consultas' }).click();
  await page.waitForURL('**/consultas', { timeout: 10_000 });
}

test.describe('Bandeja de Consultas (CON-01)', () => {
  test('muestra la lista de consultas con los datos del fixture', async ({ page }) => {
    await interceptInquiries(page);
    await loginViaUI(page);
    await navigateToInquiries(page);

    await expect(page.getByRole('heading', { name: 'Consultas' })).toBeVisible();
    await expect(page.getByText('María García')).toBeVisible();
  });

  test('pantalla vacia cuando no hay consultas', async ({ page }) => {
    await interceptInquiries(page, { list: [] });
    await loginViaUI(page);
    await navigateToInquiries(page);

    await expect(page.getByText(/no hay consultas/i)).toBeVisible();
  });

  test('boton Nueva Consulta esta visible y navega al formulario', async ({ page }) => {
    await interceptInquiries(page);
    await loginViaUI(page);
    await navigateToInquiries(page);

    await expect(page.getByRole('button', { name: 'Nueva Consulta' })).toBeVisible();
    await page.getByRole('button', { name: 'Nueva Consulta' }).click();
    await page.waitForURL('**/consultas/nueva', { timeout: 10_000 });
    expect(page.url()).toContain('/consultas/nueva');
  });

  test('click en una consulta navega al detalle (CON-02)', async ({ page }) => {
    await interceptInquiries(page);
    await loginViaUI(page);
    await navigateToInquiries(page);

    await expect(page.getByText('María García')).toBeVisible();
    const link = page.getByRole('link', { name: /María García|Ver consulta/i }).first();
    await link.click();

    await page.waitForURL(`**/consultas/${INQUIRY_FIXTURE.id}`, { timeout: 10_000 });
    expect(page.url()).toContain(`/consultas/${INQUIRY_FIXTURE.id}`);
  });
});

test.describe('Convertir consulta a alquiler (CON-04)', () => {
  test('"Convertir a Alquiler" crea el alquiler y navega a su expediente', async ({ page }) => {
    const quotedInquiry = {
      ...INQUIRY_FIXTURE,
      status: 'COTIZADA',
      interactions: [],
      quotations: [
        { id: 'quo-e2e-1', vehicleId: 'veh-e2e-1', destination: 'Ayacucho', estimatedDays: 3, createdAt: '2026-09-25T01:00:00Z' },
      ],
    };
    await interceptInquiries(page, { detail: quotedInquiry });
    await interceptRentals(page);
    await interceptFleet(page);

    let convertRequest: { method: string; ifMatch: string | null; idempotency: string | null } | null = null;
    await page.route(/\/inquiries\/[^/]+\/commands\/convert-to-rental(\?.*)?$/, (route) => {
      const headers = route.request().headers();
      convertRequest = { method: route.request().method(), ifMatch: headers['if-match'] ?? null, idempotency: headers['idempotency-key'] ?? null };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rental: { ...RENTAL_FIXTURE, id: 'rent-e2e-001' } }),
      });
    });

    await loginViaUI(page);
    await navigateToInquiries(page);
    await page.getByRole('link', { name: /María García|Ver consulta/i }).first().click();
    await page.waitForURL(`**/consultas/${INQUIRY_FIXTURE.id}`, { timeout: 10_000 });

    await expect(page.getByRole('button', { name: 'Reservar este vehículo' })).toBeVisible();
    await page.getByRole('button', { name: 'Convertir a Alquiler' }).click();

    await page.waitForURL('**/alquileres/rent-e2e-001/**', { timeout: 10_000 });
    expect(convertRequest).toMatchObject({ method: 'POST', ifMatch: '"1"' });
    expect(convertRequest!.idempotency).toBeTruthy();
  });
});
