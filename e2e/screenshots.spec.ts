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

test('13 — Activación de cuenta: cambio de contraseña', async ({ page }) => {
  await interceptFirebaseAuth(page);
  await interceptBackendAuth(page);
  await page.route('**/users/me/activation-status', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ requiresPasswordChange: true, requiresMfaEnrollment: true }),
    }),
  );
  await page.goto('/');
  await page.getByLabel('Correo o usuario').fill('agente@veloxrent.pe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Velox2026!');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL('**/activar-cuenta', { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('13-activacion-cuenta'), fullPage: false });
});

test('14 — Clientes: directorio y listado', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptCustomers(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/clientes');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('14-clientes-bandeja'), fullPage: false });
});

test('15 — Clientes: ficha 360 y detalle', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptCustomers(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto(`/clientes/${R.CUSTOMER_FIXTURE.id}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('15-cliente-detalle'), fullPage: true });
});

test('16 — Flota: catálogo de vehículos', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptFleet(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/flota');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('16-flota-bandeja'), fullPage: false });
});

test('17 — Flota: detalle de vehículo', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptFleet(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto(`/flota/${R.VEHICLE_FIXTURE.id}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('17-vehiculo-detalle'), fullPage: true });
});

test('18 — Alquileres: bandeja de expedientes', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptRentals(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/alquileres');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('18-alquileres-bandeja'), fullPage: false });
});

test('19 — Alquileres: Entrega Etapa 1 Documentos', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptRentals(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto(`/alquileres/${R.RENTAL_FIXTURE.id}/entrega-01`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('19-alquiler-etapa-01-documentos'), fullPage: true });
});

test('20 — Alquileres: Entrega Etapa 2 Validaciones y alcoholímetro', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptRentals(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto(`/alquileres/${R.RENTAL_FIXTURE.id}/entrega-02`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('20-alquiler-etapa-02-validaciones'), fullPage: true });
});

test('21 — Alquileres: Entrega Etapa 3 Contrato y garantía', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptRentals(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto(`/alquileres/${R.RENTAL_FIXTURE.id}/entrega-03`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('21-alquiler-etapa-03-contrato'), fullPage: true });
});

test('22 — Alquileres: Entrega Etapa 4 Checklist y fotos', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptRentals(page, { evidence: R.makeEvidenceFixture(R.RENTAL_FIXTURE.id, 5, 1) });
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto(`/alquileres/${R.RENTAL_FIXTURE.id}/entrega-04`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('22-alquiler-etapa-04-checklist'), fullPage: true });
});

test('23 — Alquileres: Entrega Etapa 5 Confirmación de entrega', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptRentals(page);
  await loginViaUI(page);
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto(`/alquileres/${R.RENTAL_FIXTURE.id}/entrega-05`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('23-alquiler-etapa-05-confirmacion'), fullPage: true });
});

test('24 — Administración: Gestión de usuarios y sedes', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptAdmin(page);
  await loginViaUI(page, { role: 'ADMINISTRACION' });
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/admin/usuarios');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('24-admin-usuarios'), fullPage: true });
});

test('25 — Administración: Registro de auditoría', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptAdmin(page);
  await loginViaUI(page, { role: 'ADMINISTRACION' });
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/admin/auditoria');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('25-admin-auditoria'), fullPage: true });
});

test('26 — Administración: Parámetros y contratos', async ({ page }) => {
  const R = await import('./helpers/routes');
  await R.interceptAdmin(page);
  await loginViaUI(page, { role: 'ADMINISTRACION' });
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/admin/parametros');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('26-admin-parametros'), fullPage: true });
});

test('27 — Centro de Módulos (Hub)', async ({ page }) => {
  await loginViaUI(page, { role: 'ADMINISTRACION' });
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/modulos');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: ss('27-hub-modulos'), fullPage: true });
});

