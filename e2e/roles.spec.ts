import { test, expect } from '@playwright/test';
import { loginViaUI, interceptAdmin, waitForPermissionsReady } from './helpers/routes';

/**
 * ADM-02 - roles dinamicos: crear, renombrar, desactivar y verlos en la matriz.
 * El servidor simulado (helpers/admin-roles.ts) aplica las reglas del contrato.
 */
async function openPermissions(page: Parameters<typeof loginViaUI>[0]) {
  const api = await interceptAdmin(page);
  await loginViaUI(page, { role: 'ADMINISTRACION' });
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  await page.goto('/admin/permisos');
  await expect(page.getByRole('heading', { name: 'Matriz de permisos' })).toBeVisible();
  return api;
}

const matrix = (page: Parameters<typeof loginViaUI>[0]) => page.getByRole('table');
const roleList = (page: Parameters<typeof loginViaUI>[0]) => page.getByRole('list', { name: 'Roles de la organización' });

test.describe('ADM-02 Roles dinámicos', () => {
  test('crear un rol: aparece en la lista y como fila de la matriz sin permisos', async ({ page }) => {
    const api = await openPermissions(page);

    await page.getByLabel('Nombre del nuevo rol').fill('Recepción');
    await page.getByRole('button', { name: 'Crear rol' }).click();

    await expect(page.getByRole('status')).toContainText('Recepción');
    await expect(roleList(page).getByText('Recepción')).toBeVisible();
    await expect(matrix(page).getByText('Recepción')).toBeVisible();
    // Nace sin permisos (deny-by-default).
    for (const label of ['Reserva: crear', 'Reserva: confirmar', 'Incidencia: ver bandeja y detalle']) {
      await expect(page.getByRole('checkbox', { name: `Recepción: ${label}` })).not.toBeChecked();
    }
    expect(api.commands.map((c) => c.kind)).toEqual(['create']);
    expect(api.commands[0].body).toMatchObject({ name: 'Recepción', companyId: 'company-001', branchId: 'branch-001' });
  });

  test('un nombre repetido o inválido se explica junto al campo', async ({ page }) => {
    await openPermissions(page);
    const input = page.getByLabel('Nombre del nuevo rol');

    await input.fill('front office');
    await page.getByRole('button', { name: 'Crear rol' }).click();
    await expect(page.getByRole('alert')).toContainText('Ya existe un rol con ese nombre');
    await expect(input).toHaveAttribute('aria-invalid', 'true');

    await input.fill('   ');
    await expect(page.getByRole('button', { name: 'Crear rol' })).toBeDisabled();
  });

  test('renombrar en línea envía If-Match con la versión y la matriz muestra el nombre nuevo', async ({ page }) => {
    const api = await openPermissions(page);

    await page.getByRole('button', { name: 'Renombrar rol Front Office' }).click();
    await page.getByLabel('Nuevo nombre del rol Front Office').fill('Atención al cliente');
    await page.getByRole('button', { name: 'Guardar nombre' }).click();

    await expect(page.getByRole('status')).toContainText('Rol renombrado a «Atención al cliente»');
    await expect(matrix(page).getByText('Atención al cliente')).toBeVisible();
    await expect(matrix(page).getByText('Front Office')).toHaveCount(0);
    expect(api.commands).toHaveLength(1);
    expect(api.commands[0]).toMatchObject({ kind: 'rename', id: 'role-front-office', ifMatch: '"1"' });
  });

  test('ante 412 VERSION_CONFLICT recarga la lista y avisa', async ({ page }) => {
    const api = await openPermissions(page);
    api.conflictNext();

    await page.getByRole('button', { name: 'Renombrar rol Front Office' }).click();
    await page.getByLabel('Nuevo nombre del rol Front Office').fill('Otro nombre');
    await page.getByRole('button', { name: 'Guardar nombre' }).click();

    await expect(page.getByRole('alert')).toContainText('Otra persona modificó este rol');
    // La edición se descartó y el nombre vigente sigue siendo el original.
    await expect(roleList(page).getByText('Front Office')).toBeVisible();
  });

  test('desactivar pide confirmación; un rol con usuarios no se puede desactivar (mensaje claro)', async ({ page }) => {
    const api = await openPermissions(page);

    await page.getByRole('button', { name: 'Desactivar rol Front Office' }).click();
    expect(api.commands).toHaveLength(0);
    await page.getByRole('button', { name: 'Confirmar desactivación del rol Front Office' }).click();

    await expect(page.getByRole('alert')).toContainText('todavía hay usuarios con este rol');
    await expect(matrix(page).getByText('Front Office')).toBeVisible();
  });

  test('desactivar un rol sin usuarios lo quita de la lista y de la matriz', async ({ page }) => {
    const api = await openPermissions(page);

    await page.getByLabel('Nombre del nuevo rol').fill('Temporal');
    await page.getByRole('button', { name: 'Crear rol' }).click();
    await expect(matrix(page).getByText('Temporal')).toBeVisible();

    await page.getByRole('button', { name: 'Desactivar rol Temporal' }).click();
    await page.getByRole('button', { name: 'Confirmar desactivación del rol Temporal' }).click();

    await expect(page.getByRole('status')).toContainText('Rol «Temporal» desactivado.');
    await expect(matrix(page).getByText('Temporal')).toHaveCount(0);
    await expect(roleList(page).getByText('Temporal')).toHaveCount(0);
    expect(api.commands.at(-1)).toMatchObject({ kind: 'deactivate', ifMatch: '"1"' });
  });

  test('PLATFORM_ADMIN es fijo: fila de solo lectura y sin renombrar ni desactivar', async ({ page }) => {
    await openPermissions(page);

    await expect(page.getByRole('checkbox', { name: 'Administrador de Plataforma: Reserva: crear' })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Renombrar rol Administrador de Plataforma/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Desactivar rol Administrador de Plataforma/ })).toHaveCount(0);
  });

  test('guardar la matriz envía entradas por roleId (incluido el rol nuevo) en el ámbito elegido', async ({ page }) => {
    const api = await openPermissions(page);

    await page.getByLabel('Nombre del nuevo rol').fill('Recepción');
    await page.getByRole('button', { name: 'Crear rol' }).click();
    await page.getByRole('checkbox', { name: 'Recepción: Reserva: crear' }).check();

    await expect(page.getByLabel('Ámbito de la nueva versión')).toHaveValue('org');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect.poll(() => api.savedMatrices.length).toBe(1);
    const saved = api.savedMatrices[0];
    expect(saved.scopeCompanyId ?? null).toBeNull();
    expect(saved.entries).toContainEqual({ roleId: 'role-new-4', module: 'RESERVATION', action: 'CREATE', allowed: true });
    expect(saved.entries.filter((e) => e.roleId === 'role-new-4')).toHaveLength(4);
    // 4 roles activos x 4 acciones del catalogo = matriz completa.
    expect(saved.entries).toHaveLength(16);
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  test('un usuario sin ADMIN.* no ve la entrada de Administración (control previo a abrir ADM-02)', async ({ page }) => {
    await interceptAdmin(page);
    await loginViaUI(page, { role: 'RRHH' });
    await page.waitForURL('**/tablero', { timeout: 10_000 });
    await waitForPermissionsReady(page);
    await expect(page.getByRole('navigation', { name: 'Módulos del sistema' }).getByRole('link', { name: 'Admin' })).toHaveCount(0);
  });
});
