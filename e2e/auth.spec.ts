import { test, expect } from '@playwright/test';
import {
  interceptFirebaseAuth,
  interceptBackendAuth,
  MULTI_ASSIGNMENTS,
} from './helpers/routes';

/**
 * TR-01 / TR-02 / TR-05 — flujos de autenticacion y seleccion de contexto.
 *
 * Firebase Auth y backend interceptados via page.route().
 * No se realizan llamadas reales a Firebase ni al backend.
 */

test.describe('Login', () => {
  test('credenciales validas con una asignacion → navega directo al tablero', async ({ page }) => {
    await interceptFirebaseAuth(page);
    await interceptBackendAuth(page);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Ingresa a tu cuenta' })).toBeVisible();

    await page.getByLabel('Correo o usuario').fill('agente@veloxrent.pe');
    await page.getByLabel('Contraseña', { exact: true }).fill('Velox2026!');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // Con una sola asignacion, useLogin auto-selecciona el contexto y navega al tablero.
    await page.waitForURL('**/tablero', { timeout: 10_000 });
    expect(page.url()).toContain('/tablero');
  });

  test('credenciales validas con multiples asignaciones → muestra pantalla de seleccion', async ({ page }) => {
    await interceptFirebaseAuth(page);
    await interceptBackendAuth(page, { assignments: MULTI_ASSIGNMENTS });

    await page.goto('/');
    await page.getByLabel('Correo o usuario').fill('agente@veloxrent.pe');
    await page.getByLabel('Contraseña', { exact: true }).fill('Velox2026!');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await page.waitForURL('**/seleccion-empresa-sede', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: '¿Dónde vas a trabajar hoy?' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sede Miraflores/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sede San Isidro/ })).toBeVisible();
  });

  test('credenciales invalidas → muestra mensaje de error (TR-01 punto 14)', async ({ page }) => {
    // Firebase retorna 400 para credenciales incorrectas
    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword**', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 400, message: 'INVALID_PASSWORD', status: 'INVALID_ARGUMENT' } }),
      }),
    );
    await page.route('**/audit/login-attempts', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/');
    await page.getByLabel('Correo o usuario').fill('malo@veloxrent.pe');
    await page.getByLabel('Contraseña', { exact: true }).fill('wrong');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos');
    expect(page.url()).not.toContain('/tablero');
  });

  test('seleccion de empresa/sede → navega al tablero', async ({ page }) => {
    await interceptFirebaseAuth(page);
    await interceptBackendAuth(page, { assignments: MULTI_ASSIGNMENTS });

    await page.goto('/');
    await page.getByLabel('Correo o usuario').fill('agente@veloxrent.pe');
    await page.getByLabel('Contraseña', { exact: true }).fill('Velox2026!');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await page.waitForURL('**/seleccion-empresa-sede', { timeout: 10_000 });
    await page.getByRole('button', { name: /Sede Miraflores/ }).click();

    await page.waitForURL('**/tablero', { timeout: 10_000 });
    expect(page.url()).toContain('/tablero');
  });
});
