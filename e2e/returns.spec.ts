import { test, expect } from '@playwright/test';
import { loginViaUI, SINGLE_ASSIGNMENT } from './helpers/routes';
import { interceptReturns, makeReturnEvidence, type InterceptReturnsOptions } from './helpers/returns';

async function setup(page: Parameters<typeof loginViaUI>[0], options: InterceptReturnsOptions = {}) {
  const intercepted = await interceptReturns(page, options);
  // Gerencia: Devoluciones aun se autoriza por rol en el back (fase 4) y estos flujos cubren acciones de Gerencia.
  await loginViaUI(page, { assignments: [SINGLE_ASSIGNMENT], role: 'GERENCIA' });
  await page.waitForURL('**/tablero', { timeout: 10_000 });
  return intercepted;
}

/** Completa el documento de responsabilidad del checklist (DEV-04): nombre, titular, firma por trazo. */
async function signResponsibilityDocument(page: Parameters<typeof loginViaUI>[0], signerName = 'Carlos López') {
  await page.getByLabel('Nombre de quien firma').fill(signerName);
  await page.getByRole('radio', { name: /Sí, es el titular/ }).check();
  const canvas = page.getByRole('img', { name: /Firma del documento de responsabilidad/ });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('El pad de firma no es visible');
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 60, { steps: 5 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute('aria-label', /\(firmado\)/);
}

/** Checklist completo (evidencia + documento) y paso a Resultado por navegacion interna. */
async function completeChecklistAndGoToResult(page: Parameters<typeof loginViaUI>[0]) {
  await page.goto('/devoluciones/ret-e2e-001/checklist');
  await expect(page.getByText('Confirmado por el servidor — recepción completa')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar a Resultado' })).toBeDisabled();
  await signResponsibilityDocument(page);
  await page.getByRole('button', { name: 'Continuar a Resultado' }).click();
  await expect(page).toHaveURL(/\/resultado$/);
}

async function markZones(page: Parameters<typeof loginViaUI>[0], values: ('ok' | 'damaged')[]) {
  for (const value of values) {
    await page
      .getByRole('button', { name: value === 'ok' ? 'Sin daño' : 'Marcar con daño en esta zona', exact: true })
      .click();
  }
}

test.describe('DEV-01 Bandeja de devoluciones', () => {
  test('muestra la lista con badge de etapa y el aislamiento por empresa/sede en la consulta', async ({ page }) => {
    const intercepted = await setup(page);
    const listLoaded = page.waitForResponse((response) =>
      response.request().method() === 'GET' && /\/returns\?/.test(response.url()),
    );
    await page.goto('/devoluciones');
    await listLoaded;

    await expect(page.getByText('Carlos López').first()).toBeVisible();
    await expect(page.getByRole('table').first().getByText('Recepción')).toBeVisible();
    const listUrl = intercepted.listRequests.at(-1) ?? '';
    expect(listUrl).toContain(`companyId=${SINGLE_ASSIGNMENT.companyId}`);
    expect(listUrl).toContain(`branchId=${SINGLE_ASSIGNMENT.branchId}`);
  });

  test('el menu de modulos habilita Devoluciones', async ({ page }) => {
    await setup(page);
    await page.goto('/modulos');
    await page.getByRole('navigation', { name: 'Módulos del sistema' }).getByRole('link', { name: 'Devoluciones' }).click();
    await expect(page).toHaveURL(/\/devoluciones$/);
  });

  test('Iniciar devolución desde un alquiler activo lleva a la recepción (1 accion)', async ({ page }) => {
    await setup(page, { list: [] });
    const rentalsLoaded = page.waitForResponse((response) =>
      response.request().method() === 'GET' && /\/rentals\?/.test(response.url()),
    );
    await page.goto('/devoluciones');
    await rentalsLoaded;
    await page.getByRole('link', { name: /Iniciar devolución de ABC-123/ }).click();
    await expect(page).toHaveURL(/\/devoluciones\/recepcion\/rent-e2e-001/);
    await expect(page.getByText(/Cliente titular: Carlos López/)).toBeVisible();
  });
});

test.describe('DEV-02 / DEV-03 Recepción y alcoholímetro', () => {
  test('recibe el vehículo y avanza al alcoholímetro; favorable pasa al checklist', async ({ page }) => {
    const intercepted = await setup(page, { initial: { status: 'PROGRAMADA' } });
    await page.goto('/devoluciones/recepcion/rent-e2e-001');

    await expect(page.getByRole('button', { name: 'Recibir vehículo' })).toBeDisabled();
    await page.getByLabel('Kilometraje al recibir').fill('15000');
    await page.getByLabel('Nivel de combustible').selectOption('HALF');
    await page.getByRole('button', { name: 'Recibir vehículo' }).click();

    await expect(page).toHaveURL(/\/devoluciones\/ret-e2e-001\/alcoholimetro/);
    await page.getByRole('radio', { name: /^Favorable/i }).check();
    await page.getByRole('button', { name: 'Continuar al checklist' }).click();

    await expect(page).toHaveURL(/\/checklist/);
    const alcohol = intercepted.commands.find((c) => c.path === 'register-alcohol-test');
    expect(alcohol?.ifMatch).toBe('"1"');
    expect(alcohol?.body).toMatchObject({ companyId: 'company-001', branchId: 'branch-001', result: 'FAVORABLE' });
  });

  test('alcoholímetro desfavorable deriva a Gerencia y no continúa al checklist', async ({ page }) => {
    const intercepted = await setup(page);
    await page.goto('/devoluciones/ret-e2e-001/alcoholimetro');

    await page.getByRole('radio', { name: /^Desfavorable/i }).check();
    await expect(page.getByRole('alert').filter({ hasText: 'custodia' })).toBeVisible();
    await page.getByLabel(/Foto de la prueba del alcoholímetro/).setInputFiles({
      name: 'alcoholimetro.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('foto de prueba'),
    });
    await page.getByRole('button', { name: 'Derivar a Gerencia' }).click();

    await expect(page).toHaveURL(/\/alcoholimetro/);
    // El desfavorable es 200 (no error): la pantalla pasa a la decision de Gerencia.
    await expect(page.getByRole('region', { name: 'Decisión de Gerencia' })).toBeVisible();
    expect(intercepted.commands.some((c) => c.path === 'register-alcohol-test')).toBe(true);
  });

  test('Gerencia decide mantener en custodia: exige notas, confirma y deja la decisión visible', async ({ page }) => {
    const intercepted = await setup(page, { initial: { alcoholTestResult: 'DESFAVORABLE' } });
    await page.goto('/devoluciones/ret-e2e-001/alcoholimetro');

    await expect(page.getByLabel('Marcar cliente como rojo')).toBeChecked();
    await expect(page.getByRole('button', { name: 'Registrar decisión de Gerencia' })).toBeDisabled();
    await page.getByLabel('Mantener el vehículo en custodia de VeloxRent').check();
    await page.getByLabel(/Motivo de la decisión/).fill('Cliente se negó a repetir la prueba');
    await page.getByRole('button', { name: 'Registrar decisión de Gerencia' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar decisión' }).click();

    await expect(page.getByText(/Decisión previa: Mantener el vehículo en custodia/)).toBeVisible();
    await expect(page).toHaveURL(/\/alcoholimetro/);
    const command = intercepted.commands.find((c) => c.path === 'resolve-alcohol-escalation');
    expect(command?.ifMatch).toBe('"1"');
    expect(command?.body).toMatchObject({
      companyId: 'company-001',
      branchId: 'branch-001',
      decision: 'KEEP_IN_CUSTODY',
      markCustomerRed: true,
      notes: 'Cliente se negó a repetir la prueba',
    });
  });

  test('Gerencia decide continuar a inspección (sin marcar rojo) y llega al checklist', async ({ page }) => {
    const intercepted = await setup(page, { initial: { alcoholTestResult: 'DESFAVORABLE' } });
    await page.goto('/devoluciones/ret-e2e-001/alcoholimetro');

    await page.getByLabel('Continuar a la inspección').check();
    await page.getByLabel('Marcar cliente como rojo').uncheck();
    await page.getByLabel(/Motivo de la decisión/).fill('Segunda prueba favorable');
    await page.getByRole('button', { name: 'Registrar decisión de Gerencia' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar decisión' }).click();

    await expect(page).toHaveURL(/\/checklist$/);
    expect(intercepted.commands.find((c) => c.path === 'resolve-alcohol-escalation')?.body).toMatchObject({
      decision: 'CONTINUE_TO_INSPECTION',
      markCustomerRed: false,
    });
  });
});

test.describe('DEV-04 Checklist de recepción', () => {
  test('con evidencia incompleta Continuar a Resultado está deshabilitado', async ({ page }) => {
    await setup(page, { initial: { status: 'INSPECCION' } });
    await page.goto('/devoluciones/ret-e2e-001/checklist');
    await expect(page.getByText(/Fotos \(0\/35\)/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar a Resultado' })).toBeDisabled();
  });

  test('con 35 fotos y 3 videos confirmados por el servidor se habilita solo con el documento de responsabilidad firmado', async ({ page }) => {
    await setup(page, { initial: { status: 'INSPECCION' }, evidence: makeReturnEvidence() });
    await page.goto('/devoluciones/ret-e2e-001/checklist');
    await expect(page.getByText('Confirmado por el servidor — recepción completa')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar a Resultado' })).toBeDisabled();
    await signResponsibilityDocument(page);
    await expect(page.getByRole('button', { name: 'Continuar a Resultado' })).toBeEnabled();
  });

  test('si quien firma no es el titular se exige la relación con el titular', async ({ page }) => {
    await setup(page, { initial: { status: 'INSPECCION', customerPresent: false }, evidence: makeReturnEvidence() });
    await page.goto('/devoluciones/ret-e2e-001/checklist');
    await page.getByLabel('Nombre de quien firma').fill('Pedro Soto');
    await page.getByRole('radio', { name: /No, es otra persona/ }).check();
    const canvas = page.getByRole('img', { name: /Firma del documento de responsabilidad/ });
    const box = await canvas.boundingBox();
    if (!box) throw new Error('El pad de firma no es visible');
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, box.y + 50, { steps: 4 });
    await page.mouse.up();
    await expect(page.getByRole('button', { name: 'Continuar a Resultado' })).toBeDisabled();
    await page.getByLabel('Relación con el titular').fill('Hermano');
    await expect(page.getByRole('button', { name: 'Continuar a Resultado' })).toBeEnabled();
  });

  test('sube una foto real por URL firmada (solicita sesión, PUT a GCS, registra)', async ({ page }) => {
    const intercepted = await setup(page, { initial: { status: 'INSPECCION' } });
    await page.goto('/devoluciones/ret-e2e-001/checklist');

    const putRequest = page.waitForRequest((r) => r.url().startsWith('https://storage.test/upload/') && r.method() === 'PUT');
    await page.getByLabel('Seleccionar fotos').setInputFiles({
      name: 'foto.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image'),
    });
    await putRequest;
    await expect(page.getByRole('button', { name: 'Agregar fotos' })).toBeEnabled();
    expect(intercepted.commands).toEqual([]); // la evidencia no es un comando con If-Match
  });
});

test.describe('DEV-05 Resultado (hub) -> DEV-09 -> DEV-10', () => {
  test('sin daño: 5 zonas, Liberar garantía directo, confirmación con monto exacto y cierre', async ({ page }) => {
    const intercepted = await setup(page, { initial: { status: 'INSPECCION' }, evidence: makeReturnEvidence() });
    await completeChecklistAndGoToResult(page);

    await expect(page.getByRole('button', { name: 'Liberar garantía' })).toHaveCount(0);
    await markZones(page, ['ok', 'ok', 'ok', 'ok', 'ok']);
    await expect(page.getByText('Sin daños encontrados en ninguna zona')).toBeVisible();
    await page.getByRole('button', { name: 'Liberar garantía' }).click();

    // DEV-09 directo, sin pasar por DEV-06/07/08
    await expect(page).toHaveURL(/\/garantia$/);
    const inspection = intercepted.commands.find((c) => c.path === 'complete-inspection');
    expect(inspection?.body.hasDamages).toBe(false);
    expect(inspection?.body.responsibilityDocument).toMatchObject({
      signerName: 'Carlos López',
      signerIsHolder: true,
      signatureData: expect.stringMatching(/^data:image\/png/),
    });
    await expect(page.getByLabel('Resumen de garantía')).toContainText('S/ 1,000.00');
    await page.getByRole('button', { name: 'Confirmar liberación de garantía' }).click();
    await expect(page.getByRole('dialog')).toContainText('S/ 1,000.00');
    await page.getByRole('dialog').getByRole('button', { name: /Confirmar S\// }).click();

    // DEV-10
    await expect(page).toHaveURL(/\/cierre$/);
    const financial = intercepted.commands.find((c) => c.path === 'close-financial');
    expect(financial?.body).toMatchObject({ refundAmount: 1000, retainedAmount: 0 });
    await expect(page.getByText(/Firmado por Carlos López \(titular\)/)).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar y archivar expediente' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar expediente' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Expediente cerrado' })).toBeVisible();
    expect(intercepted.current().status).toBe('CERRADA');
  });

  test('con daño: no hay Liberar garantía; daño estético por tarifario descuenta de la garantía', async ({ page }) => {
    const intercepted = await setup(page, { initial: { status: 'INSPECCION' }, evidence: makeReturnEvidence() });
    await completeChecklistAndGoToResult(page);

    await markZones(page, ['ok', 'ok', 'damaged', 'ok', 'ok']);
    await expect(page.getByText('Daño encontrado en 1 de 5 zonas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Liberar garantía' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Continuar a evaluación de daño' }).click();

    // DEV-06
    await expect(page).toHaveURL(/\/dano$/);
    await page.getByLabel(/Estético/).check();
    await page.getByLabel(/Leve/).check();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    await page.getByLabel(/Sí, acepta el costo/).check();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // DEV-07: el tarifario sale del backend
    await expect(page).toHaveURL(/\/dano\/estetico$/);
    await expect(page.getByRole('option', { name: /Paño en el capot/ })).toBeAttached();
    expect(intercepted.tariffRequests.at(-1)).toContain('companyId=company-001');
    await page.getByLabel('Paño del tarifario').selectOption('CAPOT');
    await expect(page.getByText(/Monto del tarifario: S\/\s?200\.00/)).toBeVisible();
    await page.getByRole('button', { name: 'Registrar daño estético' }).click();
    await expect(page.getByText('Semáforo del cliente: Ámbar').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar a garantía' })).toBeEnabled();
    await page.getByRole('button', { name: 'Continuar a garantía' }).click();

    // DEV-09 con descuento
    await expect(page).toHaveURL(/\/garantia$/);
    await expect(page.getByLabel('Resumen de garantía')).toContainText('S/ 800.00');
    const damage = intercepted.commands.find((c) => c.path === 'assess-damage');
    expect(damage?.body).toMatchObject({ origin: 'AESTHETIC', severity: 'LEVE', damagedZone: 'CAPOT', customerAcceptsCost: true });
    expect(damage?.body).not.toHaveProperty('estimatedAmount');

    // El monto sale del expediente: sobrevive a una recarga completa (otro dispositivo)
    await page.reload();
    await expect(page.getByLabel('Resumen de garantía')).toContainText('S/ 800.00');
    // La version mas reciente del expediente viaja en If-Match de cada comando
    expect(Number(damage?.ifMatch?.replace(/"/g, ''))).toBeGreaterThan(1);
  });

  test('daño grave pide confirmar lista roja y deriva al informe técnico de Motrix', async ({ page }) => {
    await setup(page, { initial: { status: 'CON_DANOS' } });
    await page.goto('/devoluciones/ret-e2e-001/dano');

    await page.getByLabel(/Técnico/).check();
    await page.getByLabel(/Grave/).check();
    await expect(page.getByText('¿El cliente acepta el costo?')).toHaveCount(0);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('dialog')).toContainText('lista roja');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar daño grave' }).click();

    await expect(page).toHaveURL(/\/dano\/tecnico$/);
    await expect(page.getByText(/no existe precio fijo/)).toBeVisible();
  });
});

test.describe('DEV-08 Daño técnico y paralización', () => {
  test('el cargo de paralización no pide tarifa: la fija el servidor y se muestra en la respuesta', async ({ page }) => {
    const intercepted = await setup(page, {
      initial: { status: 'CON_DANOS', receivedAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString() },
    });
    await page.goto('/devoluciones/ret-e2e-001/dano');
    await page.getByLabel(/Técnico/).check();
    await page.getByLabel(/Moderado/).check();
    await page.getByLabel(/No acepta el costo/).check();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page).toHaveURL(/\/dano\/tecnico$/);
    await page.getByLabel('Referencia del informe').fill('MTX-77');
    await page.getByLabel('Monto del informe (S/)').fill('1500');
    await page.getByRole('button', { name: 'Registrar daño técnico' }).click();
    await expect(page.getByText(/Semáforo del cliente: Rojo/).first()).toBeVisible();

    await expect(page.getByLabel(/Tarifa diaria/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Aplicar cargo por paralización' }).click();
    await expect(page.getByText(/Último cargo: 2 día\(s\) × S\/\s?120\.00 = S\/\s?240\.00/)).toBeVisible();
    const charge = intercepted.commands.find((c) => c.path === 'charge-immobilization');
    expect(charge?.body).not.toHaveProperty('dailyRate');
    expect(charge?.body).toMatchObject({ daysCharged: 2 });
  });
});

test.describe('Aislamiento por sede', () => {
  test('un expediente de otra sede se muestra como no encontrado', async ({ page }) => {
    await setup(page, { initial: { status: 'INSPECCION', branchId: 'branch-otra' } });
    await page.goto('/devoluciones/ret-e2e-001/resultado');
    await expect(page.getByText(/No encontramos esta devolución en tu empresa y sede/)).toBeVisible();
  });
});
