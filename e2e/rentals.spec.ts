import { test, expect } from '@playwright/test';
import { loginViaUI, interceptRentals, makeEvidenceFixture, RENTAL_FIXTURE, SINGLE_ASSIGNMENT } from './helpers/routes';

// ── helpers ────────────────────────────────────────────────────────────────

async function setupTest(
  page: Parameters<typeof loginViaUI>[0],
  rentalOptions: Parameters<typeof interceptRentals>[1] = {},
) {
  await interceptRentals(page, rentalOptions);
  await loginViaUI(page, { assignments: [SINGLE_ASSIGNMENT] });
  await page.waitForURL('**/tablero', { timeout: 10_000 });
}

async function uploadRequiredDocument(
  page: Parameters<typeof loginViaUI>[0],
  label: string,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  const documentItem = page.getByText(label, { exact: true }).locator('..');
  await documentItem.getByRole('button', { name: 'Subir' }).click();
  await page.getByTestId('document-file-input').setInputFiles(file);
  await expect(documentItem.getByRole('button', { name: 'Subir' })).toHaveCount(0);
}

async function attachGuaranteePaymentProof(
  page: Parameters<typeof loginViaUI>[0],
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  await page.getByLabel(/Nº de operación/).fill('E2E-TRANSFER-001');
  await page.getByTestId('payment-proof-form').getByLabel('Comprobante de pago').setInputFiles(file);
}

async function evaluateNotary(
  page: Parameters<typeof loginViaUI>[0],
) {
  await page.getByRole('button', { name: 'Evaluar notaría' }).click();
  await expect(page.getByText('Notaría obligatoria', { exact: true })).toBeVisible();
}

// ── ALQ-01 Bandeja ─────────────────────────────────────────────────────────

test.describe('ALQ-01 Bandeja de alquileres', () => {
  test('muestra la lista de expedientes', async ({ page }) => {
    await setupTest(page);
    await page.goto('/alquileres');

    await expect(page.getByText('Carlos López')).toBeVisible();
    await expect(page.getByText('ABC-123')).toBeVisible();
  });

  test('no existe el enlace Nuevo alquiler (todo alquiler nace de una consulta)', async ({ page }) => {
    await setupTest(page);
    await page.goto('/alquileres');

    await expect(page.getByText('Carlos López')).toBeVisible();
    await expect(page.getByRole('link', { name: /nuevo alquiler/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /nuevo alquiler/i })).toHaveCount(0);
  });
});

// ── ENTREGA-01 Stage 1 ─────────────────────────────────────────────────────

test.describe('ENTREGA-01 Cliente y documentos', () => {
  test('muestra resumen del cliente y los items de documentos', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-01`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Carlos López')).toBeVisible();
    await expect(page.getByText('ABC-123')).toBeVisible();
    await expect(page.getByText('Licencia de conducir')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  test('Continuar se habilita al subir licencia e identificación', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-01`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Licencia de conducir')).toBeVisible();

    // El selector de archivo es compartido: primero se indica el documento a subir.
    const fakeFile = { name: 'doc.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };
    await uploadRequiredDocument(page, 'Licencia de conducir vigente', fakeFile);
    await uploadRequiredDocument(page, 'DNI', fakeFile);
    await uploadRequiredDocument(page, 'Recibo de agua o luz', fakeFile);

    await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled({ timeout: 10_000 });
  });
});

// ── ENTREGA-02 Stage 2 ─────────────────────────────────────────────────────

test.describe('ENTREGA-02 Validaciones y alcoholímetro', () => {
  test('muestra RENIEC y MTC con verificación manual por checkbox', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-02`);

    await expect(page.getByText('RENIEC')).toBeVisible();
    await expect(page.getByText('MTC')).toBeVisible();
    // Inician como "Pendiente de verificación"; al marcar cambian a "Verificado"
    await expect(page.getByText('Pendiente de verificación')).toHaveCount(2);
    await page.getByLabel(/Confirmar verificación manual/).first().check();
    await page.getByLabel(/Confirmar verificación manual/).last().check();
    await expect(page.getByText('Verificado')).toHaveCount(2);
  });

  test('Continuar se habilita con resultado Favorable y hora', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-02`);

    await expect(page.getByRole('radio', { name: 'Favorable', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();

    await page.getByRole('radio', { name: 'Favorable', exact: true }).check();
    await page.getByLabel(/Fecha y hora de la prueba/i).fill('2026-10-05T10:30');

    await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });
});

// ── ENTREGA-03 Stage 3 ─────────────────────────────────────────────────────

test.describe('ENTREGA-03 Garantía y contrato', () => {
  test('muestra sección de evaluación notarial y pago de garantía', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-03`);

    await expect(page.getByText(/Evaluación notarial/i)).toBeVisible();
    await expect(page.getByText(/Pago de garantía/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Formalizar/i })).toBeDisabled();
  });

  test('Formalizar se habilita tras evaluación, monto y firma', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-03`);

    await evaluateNotary(page);

    await page.getByLabel(/Garantía total/i).fill('500');
    await attachGuaranteePaymentProof(page, { name: 'transferencia.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
    // La huella digital del cliente en el contrato es obligatoria para formalizar.
    await page.getByTestId('fingerprint-taken-checkbox').check();

    // SignaturePad usa canvas — simular trazo con eventos de ratón
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 80);
      await page.mouse.up();
    }

    await expect(page.getByRole('button', { name: /Formalizar y continuar/i })).toBeEnabled();
  });
});

// ── ENTREGA-04 Stage 4 ─────────────────────────────────────────────────────

test.describe('ENTREGA-04 Checklist y evidencias', () => {
  test('muestra contadores de fotos y videos', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-04`);

    await expect(page.getByText(/Fotos \(/)).toBeVisible();
    await expect(page.getByText(/Videos \(/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  test('Continuar se habilita con checklist completo (evidencia real pre-cargada)', async ({ page }) => {
    await page.addInitScript((rentalId: string) => {
      try {
        sessionStorage.setItem(
          `kairos.alquiler.${rentalId}.checklist`,
          JSON.stringify({ technicalMinutes: 30, documentaryMinutes: 15, exceptionReason: '', notes: '' }),
        );
      } catch {
        // sessionStorage may not be available in some contexts
      }
    }, RENTAL_FIXTURE.id);

    await setupTest(page, { evidence: makeEvidenceFixture() });
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-04`);

    await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });
});

// ── ENTREGA-05 Stage 5 ─────────────────────────────────────────────────────

test.describe('ENTREGA-05 Confirmación de entrega', () => {
  test('muestra el resumen de las 4 etapas anteriores', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-05`);

    await expect(page.locator('p').filter({ hasText: 'Cliente y documentos' })).toBeVisible();
    await expect(page.getByText(/Validaciones y alcoholímetro/i)).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Garantía y contrato' })).toBeVisible();
    await expect(page.getByText(/Checklist y evidencias/i)).toBeVisible();
  });

  test('Confirmar entrega abre modal y navega al confirmar', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-05`);

    await page.getByRole('button', { name: /Confirmar entrega/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Esta acción es irreversible/i)).toBeVisible();

    // Confirmar en el modal
    await page.getByRole('dialog').getByRole('button', { name: /Confirmar entrega/i }).click();

    await expect(page).toHaveURL(/\/alquileres$/);
  });
});

// ── Flujo completo ENTREGA-01 → ENTREGA-05 ────────────────────────────────

test.describe('Flujo completo asistente de entrega', () => {
  test('completa las 5 etapas y navega de vuelta a la bandeja', async ({ page }) => {
    await page.addInitScript((rentalId: string) => {
      try {
        sessionStorage.setItem(
          `kairos.alquiler.${rentalId}.checklist`,
          JSON.stringify({ technicalMinutes: 30, documentaryMinutes: 15, exceptionReason: '', notes: '' }),
        );
      } catch {
        // no-op
      }
    }, RENTAL_FIXTURE.id);

    await setupTest(page, { evidence: makeEvidenceFixture() });
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-01`);
    await page.waitForLoadState('networkidle');

    // — Stage 1 —
    await expect(page.getByText('Carlos López')).toBeVisible();
    const fakeFile = { name: 'doc.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') };
    await uploadRequiredDocument(page, 'Licencia de conducir vigente', fakeFile);
    await uploadRequiredDocument(page, 'DNI', fakeFile);
    await uploadRequiredDocument(page, 'Recibo de agua o luz', fakeFile);
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Continuar' }).click();

    // — Stage 2 —
    await expect(page).toHaveURL(/entrega-02/);
    await expect(page.getByRole('radio', { name: 'Favorable', exact: true })).toBeVisible();
    await page.getByRole('radio', { name: 'Favorable', exact: true }).check();
    await page.getByLabel(/Fecha y hora de la prueba/i).fill('2026-10-05T09:15');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // — Stage 3 —
    await expect(page).toHaveURL(/entrega-03/);
    await evaluateNotary(page);
    await page.getByLabel(/Garantía total/i).fill('500');
    await attachGuaranteePaymentProof(page, { name: 'transferencia.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake') });
    // La huella digital del cliente en el contrato es obligatoria para formalizar.
    await page.getByTestId('fingerprint-taken-checkbox').check();

    // SignaturePad usa canvas — simular trazo con eventos de ratón
    const canvas3 = page.locator('canvas').first();
    const box3 = await canvas3.boundingBox();
    if (box3) {
      await page.mouse.move(box3.x + 50, box3.y + 50);
      await page.mouse.down();
      await page.mouse.move(box3.x + 100, box3.y + 80);
      await page.mouse.up();
    }

    await page.getByRole('button', { name: /Formalizar y continuar/i }).click();
    // Modal de confirmación
    await page.getByRole('dialog').getByRole('button', { name: /Formalizar/i }).click();

    // — Stage 4 —
    await expect(page).toHaveURL(/entrega-04/);
    // sessionStorage pre-loaded, Continuar debería estar habilitado
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // — Stage 5 —
    await expect(page).toHaveURL(/entrega-05/);
    await expect(page.getByText(/Confirmar entrega/i)).toBeVisible();
    await page.getByRole('button', { name: /Confirmar entrega/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Confirmar entrega/i }).click();

    // Vuelta a la bandeja
    await expect(page).toHaveURL(/\/alquileres$/);
  });
});
