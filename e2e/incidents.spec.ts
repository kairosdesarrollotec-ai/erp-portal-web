import { test, expect } from '@playwright/test';
import { loginViaUI, SINGLE_ASSIGNMENT } from './helpers/routes';
import {
  ACTIVE_RENTAL_FOR_INCIDENTS,
  interceptIncidents,
  makeIncidentFixture,
  type InterceptIncidentsOptions,
} from './helpers/incidents';

async function setup(
  page: Parameters<typeof loginViaUI>[0],
  options: InterceptIncidentsOptions & { role?: string } = {},
) {
  const { role, ...incidentOptions } = options;
  const intercepted = await interceptIncidents(page, incidentOptions);
  await loginViaUI(page, { assignments: [SINGLE_ASSIGNMENT], role });
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  return intercepted;
}

test.describe('INC-01 Bandeja de incidencias', () => {
  test('muestra tipo, severidad, expediente, estado y responsable, con aislamiento por empresa/sede', async ({ page }) => {
    const intercepted = await setup(page);
    await page.goto('/incidencias');

    const table = page.getByRole('table');
    await expect(table.getByText('ALQ-1187')).toBeVisible();
    await expect(table.getByText('Pérdida de llave').first()).toBeVisible();
    await expect(table.getByText('Leve').first()).toBeVisible();
    await expect(table.getByText('Grave')).toBeVisible();
    await expect(table.getByText('Abierta')).toHaveCount(2);
    await expect(table.getByText('Cerrada')).toBeVisible();
    await expect(table.getByText('user-e2e').first()).toBeVisible();

    const listUrl = intercepted.listRequests.at(-1) ?? '';
    expect(listUrl).toContain(`companyId=${SINGLE_ASSIGNMENT.companyId}`);
    expect(listUrl).toContain(`branchId=${SINGLE_ASSIGNMENT.branchId}`);
  });

  test('filtra por tipo, severidad y estado enviando los filtros al backend', async ({ page }) => {
    const intercepted = await setup(page);
    await page.goto('/incidencias');
    await expect(page.getByRole('table').getByText('ALQ-1187')).toBeVisible();

    await page.getByLabel('Severidad').selectOption('GRAVE');
    await expect(page.getByRole('table').getByText('ALQ-1188')).toBeVisible();
    await expect(page.getByRole('table').getByText('ALQ-1187')).toHaveCount(0);
    expect(intercepted.listRequests.at(-1)).toContain('severity=GRAVE');

    await page.getByLabel('Severidad').selectOption('');
    await page.getByLabel('Estado').selectOption('CERRADA');
    await expect(page.getByRole('table').getByText('ALQ-1189')).toBeVisible();
    await expect(page.getByRole('table').getByText('ALQ-1188')).toHaveCount(0);
    expect(intercepted.listRequests.at(-1)).toContain('status=CERRADA');

    await page.getByLabel('Estado').selectOption('');
    await page.getByLabel('Tipo').selectOption('TOWING');
    await expect(page.getByRole('table').getByText('ALQ-1189')).toBeVisible();
    expect(intercepted.listRequests.at(-1)).toContain('type=TOWING');
  });

  test('"Resolver" directo solo en Leve + Abierta; pide resumen y resuelve con If-Match', async ({ page }) => {
    const intercepted = await setup(page);
    await page.goto('/incidencias');
    await expect(page.getByRole('table').getByText('ALQ-1187')).toBeVisible();

    // Solo la Leve abierta ofrece Resolver (no la Grave ni la ya cerrada).
    await expect(page.getByRole('button', { name: /^Resolver incidencia/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Resolver incidencia de ALQ-1187' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir incidencia de ALQ-1188' })).toBeVisible();

    await page.getByRole('button', { name: 'Resolver incidencia de ALQ-1187' }).click();
    const dialog = page.getByRole('dialog', { name: /Resolver incidencia/ });
    await expect(dialog.getByRole('button', { name: 'Confirmar resolución' })).toBeDisabled();
    await dialog.getByLabel('Resumen de la resolución').fill('Llave recuperada por el cliente');
    await dialog.getByRole('button', { name: 'Confirmar resolución' }).click();

    await expect(page.getByRole('status')).toContainText('Incidencia de ALQ-1187 resuelta.');
    await expect(page.getByRole('button', { name: /^Resolver incidencia/ })).toHaveCount(0);
    const command = intercepted.commands.find((c) => c.path === 'resolve');
    expect(command?.id).toBe('inc-leve');
    expect(command?.ifMatch).toBe('"3"');
    expect(command?.idempotencyKey).toBeTruthy();
    expect(command?.body).toMatchObject({
      companyId: 'company-001',
      branchId: 'branch-001',
      resolutionSummary: 'Llave recuperada por el cliente',
    });
  });

  test('registra una incidencia con el formulario (alquiler, tipo, severidad, descripcion, sugerencia)', async ({ page }) => {
    const intercepted = await setup(page);
    await page.goto('/incidencias');
    await page.getByRole('button', { name: 'Registrar incidencia' }).click();

    const dialog = page.getByRole('dialog', { name: 'Registrar incidencia' });
    await dialog.getByRole('button', { name: 'Registrar incidencia' }).click();
    await expect(dialog.getByText('Selecciona el alquiler relacionado.')).toBeVisible();
    await expect(dialog.getByText('Describe lo ocurrido.')).toBeVisible();

    await expect(dialog.getByRole('option', { name: 'ABC-123 — Carlos López' })).toBeAttached();
    await dialog.getByLabel('Alquiler').selectOption('rent-e2e-001');
    await dialog.getByLabel('Tipo').selectOption('TRAFFIC_FINE_OR_INTERVENTION');
    await dialog.getByLabel('Severidad').selectOption('MODERADA');
    await dialog.getByLabel('Descripción de la observación').fill('Papeleta por exceso de velocidad');
    await dialog.getByLabel(/Sugerencia/).fill('Descontar de la garantía');
    await dialog.getByRole('button', { name: 'Registrar incidencia' }).click();

    await expect(page.getByRole('status')).toContainText('Incidencia registrada para ALQ-2000.');
    await expect(page.getByRole('table').getByText('ALQ-2000')).toBeVisible();
    const create = intercepted.commands.find((c) => c.path === 'create');
    expect(create?.idempotencyKey).toBeTruthy();
    expect(create?.body).toMatchObject({
      companyId: 'company-001',
      branchId: 'branch-001',
      rentalId: 'rent-e2e-001',
      type: 'TRAFFIC_FINE_OR_INTERVENTION',
      severity: 'MODERADA',
      description: 'Papeleta por exceso de velocidad',
      suggestion: 'Descontar de la garantía',
    });
  });

  test('estado EMPTY cuando no hay incidencias', async ({ page }) => {
    await setup(page, { incidents: [] });
    await page.goto('/incidencias');
    await expect(page.getByText('Todavía no hay incidencias registradas.')).toBeVisible();
  });

  test('el menú de módulos habilita Incidencias y "Abrir" lleva al detalle', async ({ page }) => {
    await setup(page);
    await page.goto('/modulos');
    await page.getByRole('navigation', { name: 'Módulos del sistema' }).getByRole('link', { name: 'Incidencias' }).click();
    await expect(page).toHaveURL(/\/incidencias$/);

    await page.getByRole('button', { name: 'Abrir incidencia de ALQ-1188' }).click();
    await expect(page).toHaveURL(/\/incidencias\/inc-grave$/);
    await expect(page.getByRole('heading', { level: 1, name: /Choque o daño/ })).toBeVisible();
  });

  test('un rol sin permiso (RR. HH.) no ve Incidencias en el menú de módulos', async ({ page }) => {
    await setup(page, { role: 'RRHH' });
    await page.goto('/modulos');
    await expect(page.getByRole('heading', { name: 'Módulos del Sistema' })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Módulos del sistema' }).getByRole('link', { name: 'Incidencias' }),
    ).toHaveCount(0);
  });

  test('Auditoría ve la bandeja pero sin Registrar ni Resolver', async ({ page }) => {
    await setup(page, { role: 'AUDITORIA' });
    await page.goto('/modulos');
    await page.getByRole('navigation', { name: 'Módulos del sistema' }).getByRole('link', { name: 'Incidencias' }).click();
    await expect(page.getByRole('table').getByText('ALQ-1187')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar incidencia' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Resolver incidencia/ })).toHaveCount(0);
  });

  test('desde el alquiler activo, "Ver/Registrar incidencias" lleva a la bandeja filtrada por ese expediente', async ({ page }) => {
    const intercepted = await setup(page, { rentals: [ACTIVE_RENTAL_FOR_INCIDENTS] });
    await page.goto('/alquileres');

    await page.getByRole('link', { name: /Ver o registrar incidencias de ABC-123/ }).click();
    await expect(page).toHaveURL(/\/incidencias\?rentalId=rent-e2e-001$/);
    await expect(page.getByRole('table').getByText('ALQ-1187')).toBeVisible();
    expect(intercepted.listRequests.at(-1)).toContain('rentalId=rent-e2e-001');
  });

  test('en móvil la tabla pasa a tarjetas y "Resolver" sigue visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    await page.goto('/incidencias');

    await expect(page.getByRole('table').getByText('ALQ-1187')).toBeVisible();
    await expect(page.locator('thead')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Resolver incidencia de ALQ-1187' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});

test.describe('INC-02 Detalle / RIO', () => {
  test('muestra el timeline sin botones de editar ni eliminar y con foco en "Agregar nueva acción"', async ({ page }) => {
    await setup(page);
    await page.goto('/incidencias/inc-leve');

    await expect(page.getByRole('heading', { level: 1, name: /Pérdida de llave/ })).toBeVisible();
    const timeline = page.getByRole('list', { name: 'Historial de acciones' });
    await expect(timeline.getByRole('listitem')).toHaveCount(2);
    await expect(timeline.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /editar|eliminar|borrar/i })).toHaveCount(0);
    await expect(page.getByLabel('Agregar nueva acción')).toBeFocused();
  });

  test('agrega una acción: se anexa al historial (append-only) con If-Match', async ({ page }) => {
    const intercepted = await setup(page);
    await page.goto('/incidencias/inc-leve');

    const field = page.getByLabel('Agregar nueva acción');
    await expect(page.getByRole('button', { name: 'Agregar', exact: true })).toBeDisabled();
    await field.fill('Cliente confirmó que devolverá la llave');
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();

    const timeline = page.getByRole('list', { name: 'Historial de acciones' });
    await expect(timeline.getByRole('listitem')).toHaveCount(3);
    await expect(timeline).toContainText('Cliente confirmó que devolverá la llave');
    await expect(timeline.getByRole('button')).toHaveCount(0);
    const command = intercepted.commands.find((c) => c.path === 'add-action');
    expect(command?.ifMatch).toBe('"3"');
    expect(command?.body).toMatchObject({
      companyId: 'company-001',
      branchId: 'branch-001',
      description: 'Cliente confirmó que devolverá la llave',
    });
  });

  test('"Cerrar incidencia" se habilita solo con resumen y deja el historial en solo lectura', async ({ page }) => {
    const intercepted = await setup(page);
    await page.goto('/incidencias/inc-grave');

    const closeButton = page.getByRole('button', { name: 'Cerrar incidencia' });
    await expect(closeButton).toBeDisabled();
    await page.getByLabel('Resumen de resolución').fill('Seguro cubrió el siniestro');
    await expect(closeButton).toBeEnabled();
    await closeButton.click();

    await expect(page.getByText(/el historial es de solo lectura/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar incidencia' })).toHaveCount(0);
    await expect(page.getByLabel('Agregar nueva acción')).toHaveCount(0);
    const command = intercepted.commands.find((c) => c.path === 'close');
    expect(command?.ifMatch).toBe('"3"');
    expect(command?.body).toMatchObject({ resolutionSummary: 'Seguro cubrió el siniestro' });
    expect(intercepted.get('inc-grave')?.status).toBe('CERRADA');
  });

  test('deriva a vía legal pidiendo motivo', async ({ page }) => {
    const intercepted = await setup(page);
    await page.goto('/incidencias/inc-grave');

    await page.getByRole('button', { name: 'Derivar a vía legal' }).click();
    const dialog = page.getByRole('dialog', { name: 'Derivar a vía legal' });
    await expect(dialog.getByRole('button', { name: 'Confirmar derivación' })).toBeDisabled();
    await dialog.getByLabel('Motivo de la derivación').fill('Vehículo no devuelto');
    await dialog.getByRole('button', { name: 'Confirmar derivación' }).click();

    await expect(page.getByText(/derivada a vía legal: el historial es de solo lectura/)).toBeVisible();
    expect(intercepted.commands.find((c) => c.path === 'refer-legal')?.body).toMatchObject({ reason: 'Vehículo no devuelto' });
  });

  test('un 409 (versión desactualizada) recarga la incidencia y avisa sin perder lo escrito', async ({ page }) => {
    const intercepted = await setup(page);
    await page.goto('/incidencias/inc-leve');
    await expect(page.getByLabel('Agregar nueva acción')).toBeFocused();

    intercepted.conflictNext();
    await page.getByLabel('Agregar nueva acción').fill('Mi acción');
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();

    await expect(page.getByRole('alert')).toContainText('Otra persona modificó esta incidencia');
    await expect(page.getByRole('list', { name: 'Historial de acciones' })).toContainText('Acción registrada por otro usuario');
    await expect(page.getByLabel('Agregar nueva acción')).toHaveValue('Mi acción');

    // Reintentar con la versión recargada funciona.
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Historial de acciones' })).toContainText('Mi acción');
    const attempts = intercepted.commands.filter((c) => c.path === 'add-action');
    expect(attempts.map((c) => c.ifMatch)).toEqual(['"3"', '"4"']);
  });

  test('un 422 al cerrar muestra el mensaje de regla de negocio', async ({ page }) => {
    await setup(page, { closeUnprocessable: true });
    await page.goto('/incidencias/inc-leve');
    await page.getByLabel('Resumen de resolución').fill('Resumen');
    await page.getByRole('button', { name: 'Cerrar incidencia' }).click();
    await expect(page.getByRole('alert')).toContainText('La operación no cumple las reglas de negocio vigentes.');
  });

  test('en móvil el timeline es colapsable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    await page.goto('/incidencias/inc-leve');

    const toggle = page.getByRole('button', { name: /Ver historial \(2\)/ });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('list', { name: 'Historial de acciones' })).toBeHidden();
    await toggle.click();
    await expect(page.getByRole('list', { name: 'Historial de acciones' })).toBeVisible();
  });

  test('una incidencia inexistente muestra el estado de no encontrada', async ({ page }) => {
    await setup(page, { incidents: [makeIncidentFixture()] });
    await page.goto('/incidencias/no-existe');
    await expect(page.getByText('No encontramos esta incidencia en tu empresa y sede.')).toBeVisible();
  });
});
