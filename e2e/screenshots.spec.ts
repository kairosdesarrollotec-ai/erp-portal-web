import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  interceptFirebaseAuth,
  interceptBackendAuth,
  interceptReservations,
  interceptInquiries,
  loginViaUI,
  MULTI_ASSIGNMENTS,
  RESERVATION_FIXTURE,
  INQUIRY_FIXTURE,
} from './helpers/routes';

const OUT = path.resolve(__dirname, '../screenshots');
fs.mkdirSync(OUT, { recursive: true });

const ss = (name: string) => path.join(OUT, `${name}.png`);

test.use({ viewport: { width: 1280, height: 800 } });

test('01 — Login: pantalla inicial', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('01-login'), fullPage: false });
});

test('02 — Login: formulario completado', async ({ page }) => {
  await interceptFirebaseAuth(page);
  await interceptBackendAuth(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Correo o usuario').fill('agente@veloxrent.pe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Velox2026!');
  await page.screenshot({ path: ss('02-login-lleno'), fullPage: false });
});

test('03 — Login: credenciales invalidas', async ({ page }) => {
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
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Correo o usuario').fill('usuario@veloxrent.pe');
  await page.getByLabel('Contraseña', { exact: true }).fill('contraseña-incorrecta');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('alert').waitFor({ timeout: 8_000 });
  await page.screenshot({ path: ss('03-login-error'), fullPage: false });
});

test('04 — Selección de empresa/sede', async ({ page }) => {
  await interceptFirebaseAuth(page);
  await interceptBackendAuth(page, { assignments: MULTI_ASSIGNMENTS });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Correo o usuario').fill('agente@veloxrent.pe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Velox2026!');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL('**/seleccion-empresa-sede', { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('04-seleccion-empresa-sede'), fullPage: false });
});

test('05 — Tablero / Dashboard', async ({ page }) => {
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('05-tablero'), fullPage: false });
});

test('06 — Reservas: bandeja con datos', async ({ page }) => {
  await interceptReservations(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/reservas');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('06-reservas-bandeja'), fullPage: false });
});

test('07 — Reservas: estado vacío', async ({ page }) => {
  await interceptReservations(page, { list: [] });
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/reservas');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('07-reservas-vacia'), fullPage: false });
});

test('08 — Reserva: detalle', async ({ page }) => {
  await interceptReservations(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto(`/reservas/${RESERVATION_FIXTURE.id}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('08-reserva-detalle'), fullPage: true });
});

test('09 — Consultas: bandeja con datos', async ({ page }) => {
  await interceptInquiries(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/consultas');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('09-consultas-bandeja'), fullPage: false });
});

test('10 — Consultas: estado vacío', async ({ page }) => {
  await interceptInquiries(page, { list: [] });
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/consultas');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('10-consultas-vacia'), fullPage: false });
});

test('11 — Nueva Consulta: formulario', async ({ page }) => {
  await interceptInquiries(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/consultas/nueva');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('11-consulta-nueva'), fullPage: true });
});

test('12 — Consulta: detalle', async ({ page }) => {
  await interceptInquiries(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto(`/consultas/${INQUIRY_FIXTURE.id}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('12-consulta-detalle'), fullPage: true });
});
