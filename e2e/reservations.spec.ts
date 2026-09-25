import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  interceptReservations,
  RESERVATION_FIXTURE,
} from './helpers/routes';

/**
 * RES-01 / RES-04 — bandeja y detalle de reservas.
 *
 * Asume login completado via loginViaUI (Firebase y backend interceptados).
 */

test.describe('Bandeja de Reservas (RES-01)', () => {
  test('muestra la lista de reservas con los datos del fixture', async ({ page }) => {
    await interceptReservations(page);
    await loginViaUI(page);

    await page.waitForURL('**/tablero', { timeout: 10_000 });
    await page.goto('/reservas');

    await expect(page.getByRole('heading', { name: 'Reservas' })).toBeVisible();
    await expect(page.getByText('Carlos López')).toBeVisible();
    await expect(page.getByText('Toyota Corolla 2022')).toBeVisible();
  });

  test('pantalla vacia cuando no hay reservas', async ({ page }) => {
    await interceptReservations(page, { list: [] });
    await loginViaUI(page);

    await page.waitForURL('**/tablero', { timeout: 10_000 });
    await page.goto('/reservas');

    await expect(page.getByText('Todavía no hay reservas registradas.')).toBeVisible();
  });

  test('click en una fila navega al detalle de la reserva (RES-04)', async ({ page }) => {
    await interceptReservations(page);
    await loginViaUI(page);

    await page.waitForURL('**/tablero', { timeout: 10_000 });
    await page.goto('/reservas');

    await expect(page.getByText('Carlos López')).toBeVisible();
    await page.getByText('Carlos López').click();

    await page.waitForURL(`**/reservas/${RESERVATION_FIXTURE.id}`, { timeout: 10_000 });
    expect(page.url()).toContain(`/reservas/${RESERVATION_FIXTURE.id}`);
  });

  test('detalle muestra el nombre del cliente y la placa del vehiculo', async ({ page }) => {
    await interceptReservations(page);
    await loginViaUI(page);

    await page.waitForURL('**/tablero', { timeout: 10_000 });
    await page.goto(`/reservas/${RESERVATION_FIXTURE.id}`);

    await expect(page.getByText('Carlos López')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Toyota Corolla 2022')).toBeVisible();
  });
});
