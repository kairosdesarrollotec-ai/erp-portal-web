import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  interceptAdmin,
  waitForPermissionsReady,
} from './helpers/routes';
import { defaultRoles } from './helpers/admin-roles';

const NAV = { name: 'Módulos del sistema' } as const;

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
    // La tabla muestra el nombre del rol que viene de la API.
    await expect(page.getByRole('cell', { name: 'Front Office' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Administración' })).toBeVisible();
  });

  test('ADM-01: el selector de rol sale de GET /admin/roles y asigna por targetRoleId', async ({ page }) => {
    const roles = defaultRoles();
    roles.push({ id: 'role-flota', name: 'Supervisor de flota', key: null, isSystem: false, active: true, version: 1, assignmentCount: 0 });
    roles.push({ id: 'role-viejo', name: 'Rol obsoleto', key: null, isSystem: false, active: false, version: 2, assignmentCount: 0 });
    await interceptAdmin(page, { roles });
    const assignments: Record<string, unknown>[] = [];
    await page.route(/\/admin\/assignments$/, (route) => {
      assignments.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'assign-new' }) });
    });
    await loginViaUI(page, { role: 'ADMINISTRACION' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/admin/usuarios');
    await page.getByRole('button', { name: 'Agregar usuario' }).click();
    const select = page.getByRole('combobox', { name: 'Rol', exact: true });
    await expect(select.locator('option', { hasText: 'Supervisor de flota' })).toBeAttached();
    await expect(select.locator('option', { hasText: 'Rol obsoleto' })).toHaveCount(0);

    await page.getByPlaceholder('usuario@veloxrent.pe').fill('flota@veloxrent.pe');
    await select.selectOption({ label: 'Supervisor de flota' });
    await page.getByRole('button', { name: 'Agregar usuario' }).click();

    await expect.poll(() => assignments.length).toBe(1);
    expect(assignments[0]).toMatchObject({ targetEmail: 'flota@veloxrent.pe', targetRoleId: 'role-flota' });
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
    await expect(page.getByText(/Plantillas de documentos/i)).toBeVisible();
  });
});

test.describe('Administración visible solo con permisos ADMIN.*', () => {
  test('un usuario sin permisos ADMIN.* no ve Administración en el menú ni en el hub', async ({ page }) => {
    await interceptAdmin(page);
    await loginViaUI(page, { role: 'RRHH' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/modulos');
    await expect(page.getByRole('heading', { name: 'Módulos del Sistema' })).toBeVisible();
    await waitForPermissionsReady(page);
    await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
    await expect(page.getByRole('navigation', NAV).getByRole('link', { name: 'Admin' })).toHaveCount(0);
  });

  test('un rol personalizado con un solo permiso ADMIN.VIEW_AUDIT ve Administración', async ({ page }) => {
    await interceptAdmin(page);
    await loginViaUI(page, { role: { name: 'Auditor externo', permissions: ['ADMIN.VIEW_AUDIT'] } });
    await page.waitForURL('**/tablero', { timeout: 10_000 });

    await page.goto('/modulos');
    await waitForPermissionsReady(page);
    await expect(page.getByRole('navigation', NAV).getByRole('link', { name: 'Admin' })).toBeVisible();
  });

  test('los permisos se vuelven a cargar al cambiar de sede (otra sede, otros permisos)', async ({ page }) => {
    await interceptAdmin(page);
    // Misma empresa, dos sedes con rol distinto: en San Isidro el usuario es solo RR. HH. (sin Admin).
    const assignments = [
      { companyId: 'company-001', companyName: 'VeloxRent Lima', branchId: 'branch-001', branchName: 'Sede Miraflores', role: { id: 'role-administracion', name: 'Administración', key: 'ADMINISTRACION' } },
      { companyId: 'company-001', companyName: 'VeloxRent Lima', branchId: 'branch-002', branchName: 'Sede San Isidro', role: { id: 'role-rrhh', name: 'RR. HH.', key: 'RRHH' } },
    ];
    await loginViaUI(page, { assignments });
    // Permisos por sede (registrado despues de loginViaUI => tiene prioridad sobre el mock por defecto).
    await page.route('**/me/permissions**', (route) => {
      const branchId = new URL(route.request().url()).searchParams.get('branchId');
      const admin = branchId === 'branch-001';
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          role: admin ? assignments[0].role : assignments[1].role,
          matrixVersion: 1,
          permissions: admin ? [{ module: 'ADMIN', action: 'MANAGE_USERS' }] : [],
        }),
      });
    });
    await page.route('**/users/me/dashboard**', (route) => {
      const branchId = new URL(route.request().url()).searchParams.get('branchId');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ role: branchId === 'branch-001' ? assignments[0].role : assignments[1].role, state: 'EMPTY' }),
      });
    });

    await page.getByRole('button', { name: /Sede Miraflores/ }).click();
    await page.waitForURL('**/tablero');
    await waitForPermissionsReady(page);
    await expect(page.getByRole('navigation', NAV).getByRole('link', { name: 'Admin' })).toBeVisible();

    await page.getByRole('link', { name: /Cambiar sede/ }).click();
    await page.getByRole('button', { name: /Sede San Isidro/ }).click();
    await page.waitForURL('**/tablero');
    await expect(page.getByText('RR. HH.').first()).toBeVisible();
    await waitForPermissionsReady(page);
    await expect(page.getByRole('navigation', NAV).getByRole('link', { name: 'Admin' })).toHaveCount(0);
  });
});
