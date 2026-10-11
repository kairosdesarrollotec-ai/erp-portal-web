import { test, expect } from '@playwright/test';
import { loginViaUI, waitForPermissionsReady } from './helpers/routes';
import {
  interceptHrAdministration,
  EMPLOYEE_FIXTURE,
  FIELD_TRIP_FIXTURE,
  LEAVE_FIXTURE,
  VACATION_FIXTURE,
} from './helpers/hr-administration-routes';

const HR_ALL_PERMISSIONS = [
  'HR_ADMINISTRATION.VIEW_EMPLOYEES',
  'HR_ADMINISTRATION.MANAGE_EMPLOYEES',
  'HR_ADMINISTRATION.LOG_ATTENDANCE',
  'HR_ADMINISTRATION.AUTHORIZE_LEAVE',
  'HR_ADMINISTRATION.SCHEDULE_VACATION',
  'HR_ADMINISTRATION.REQUEST_FIELD_TRIP',
  'HR_ADMINISTRATION.AUTHORIZE_FIELD_TRIP',
  'HR_ADMINISTRATION.EVALUATE_FIELD_TRIP_RETURN',
  'HR_ADMINISTRATION.TERMINATE_EMPLOYMENT',
];

const HR_RRHH_ROLE = {
  name: 'RR. HH.',
  key: 'RRHH',
  permissions: HR_ALL_PERMISSIONS,
};

test.describe('ADP-01 — Bandeja de personal', () => {
  test('muestra la lista de empleados con datos', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/personal');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Personal/i }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Carlos Pérez', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Operaciones', exact: true })).toBeVisible();
  });

  test('muestra estado vacío cuando no hay empleados', async ({ page }) => {
    await interceptHrAdministration(page, { employees: [] });
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/personal');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Todavía no hay personal registrado/i)).toBeVisible();
  });

  test('usuario sin VIEW_EMPLOYEES no accede al listado de personal', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: { name: 'Sin acceso HR', permissions: [] } });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/personal');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/No tienes acceso/i)).toBeVisible();
  });

  test('navega a la ficha del empleado al hacer "Abrir ficha"', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/personal');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: `Abrir ficha de ${EMPLOYEE_FIXTURE.fullName}` }).click();
    await page.waitForURL(`**/personal/${EMPLOYEE_FIXTURE.id}`, { timeout: 8_000 });

    await expect(page.getByText(EMPLOYEE_FIXTURE.fullName)).toBeVisible();
  });
});

test.describe('ADP-01 — Ficha del empleado', () => {
  test('muestra datos del empleado y resumen de asistencia', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto(`/personal/${EMPLOYEE_FIXTURE.id}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Carlos Pérez')).toBeVisible();
    await expect(page.getByText('DNI')).toBeVisible();
  });
});

test.describe('ADP-02/03 — Asistencia', () => {
  test('muestra el resumen mensual del equipo', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/personal/asistencia');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Carlos Pérez')).toBeVisible();
  });

  test('muestra el registro de asistencia del empleado', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto(`/personal/${EMPLOYEE_FIXTURE.id}/asistencia`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Carlos Pérez')).toBeVisible();
  });
});

test.describe('ADP-04 — Permisos', () => {
  test('muestra el listado de permisos del empleado', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto(`/personal/${EMPLOYEE_FIXTURE.id}/permisos`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Trámite personal')).toBeVisible();
  });

  test('muestra estado vacío cuando no hay permisos', async ({ page }) => {
    await interceptHrAdministration(page, { leaves: [] });
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto(`/personal/${EMPLOYEE_FIXTURE.id}/permisos`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Todavía no hay solicitudes de permiso/i)).toBeVisible();
  });
});

test.describe('ADP-05 — Vacaciones', () => {
  test('muestra las vacaciones programadas del empleado', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto(`/personal/${EMPLOYEE_FIXTURE.id}/vacaciones`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/programada/i)).toBeVisible();
  });
});

test.describe('ADP-06/07/08 — Salidas a campo', () => {
  test('muestra el listado de salidas a campo', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/personal/campo');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Carlos Pérez')).toBeVisible();
    await expect(page.getByText('Taller Central')).toBeVisible();
  });

  test('muestra estado vacío cuando no hay salidas', async ({ page }) => {
    await interceptHrAdministration(page, { fieldTrips: [] });
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/personal/campo');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Todavía no hay solicitudes de salida a campo/i)).toBeVisible();
  });

  test('muestra la pantalla de solicitud de salida a campo', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto(`/personal/${EMPLOYEE_FIXTURE.id}/salida-a-campo`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Solicitar salida a campo' })).toBeVisible();
  });

  test('muestra la pantalla de autorización de salida', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto(`/personal/campo/${FIELD_TRIP_FIXTURE.id}/autorizacion`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Taller Central')).toBeVisible();
  });
});

test.describe('ADP-09 — Término de relación laboral', () => {
  test('muestra la pantalla de término de contrato', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: HR_RRHH_ROLE });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto(`/personal/${EMPLOYEE_FIXTURE.id}/termino`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Carlos Pérez')).toBeVisible();
  });
});

test.describe('ADP — Visibilidad del módulo Personal según permisos', () => {
  test('un usuario con HR_ADMINISTRATION.VIEW_EMPLOYEES ve el módulo Personal en el hub', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: { name: 'Solo HR view', permissions: ['HR_ADMINISTRATION.VIEW_EMPLOYEES'] } });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/modulos');
    await page.waitForLoadState('networkidle');
    await waitForPermissionsReady(page);

    await expect(page.getByRole('link', { name: /Personal/i }).first()).toBeVisible();
  });

  test('un usuario sin permisos HR_ADMINISTRATION no ve el módulo Personal en el hub', async ({ page }) => {
    await interceptHrAdministration(page);
    await loginViaUI(page, { role: 'AUDITORIA' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/modulos');
    await page.waitForLoadState('networkidle');
    await waitForPermissionsReady(page);

    await expect(page.getByRole('link', { name: /^Personal$/, exact: true })).toHaveCount(0);
  });
});
