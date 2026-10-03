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

// ── ALQ-01 Bandeja ─────────────────────────────────────────────────────────

test.describe('ALQ-01 Bandeja de alquileres', () => {
  test('muestra la lista de expedientes', async ({ page }) => {
    await setupTest(page);
    await page.goto('/alquileres');

    await expect(page.getByText('Carlos López')).toBeVisible();
    await expect(page.getByText('ABC-123')).toBeVisible();
  });

  test('el enlace Nuevo alquiler lleva a /alquileres/nuevo', async ({ page }) => {
    await setupTest(page);
    await page.goto('/alquileres');

    await page.getByRole('link', { name: /nuevo alquiler/i }).click();
    await expect(page).toHaveURL(/\/alquileres\/nuevo/);
  });
});

// ── ENTREGA-01 Stage 1 ─────────────────────────────────────────────────────

test.describe('ENTREGA-01 Cliente y documentos', () => {
  test('muestra resumen del cliente y los checkboxes de documentos', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-01`);

    await expect(page.getByText('Carlos López')).toBeVisible();
    await expect(page.getByText('ABC-123')).toBeVisible();
    await expect(page.getByText(/Licencia de conducir/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  test('Continuar se habilita al marcar licencia e identificación', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-01`);

    // Espera que el formulario cargue
    await expect(page.getByText(/Licencia de conducir/i)).toBeVisible();

    await page.getByLabel(/Licencia de conducir/i).check();
    await page.getByLabel(/DNI válido/i).check();

    await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });
});

// ── ENTREGA-02 Stage 2 ─────────────────────────────────────────────────────

test.describe('ENTREGA-02 Validaciones y alcoholímetro', () => {
  test('muestra RENIEC y MTC como verificados estáticamente', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-02`);

    await expect(page.getByText('RENIEC')).toBeVisible();
    await expect(page.getByText('MTC')).toBeVisible();
    // Ambas tarjetas muestran "Verificado" (aparece dos veces)
    expect(await page.getByText('Verificado').count()).toBe(2);
  });

  test('Continuar se habilita con resultado Favorable y hora', async ({ page }) => {
    await setupTest(page);
    await page.goto(`/alquileres/${RENTAL_FIXTURE.id}/entrega-02`);

    await expect(page.getByRole('radio', { name: 'Favorable', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();

    await page.getByRole('radio', { name: 'Favorable', exact: true }).check();
    await page.getByLabel(/Hora de la prueba/i).fill('10:30');

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

    // Espera que evaluate-notary complete (resultado MANDATORY aparece)
    await expect(page.getByText('Notaría obligatoria', { exact: true })).toBeVisible();

    await page.getByLabel(/Monto/i).fill('500');
    await page.getByLabel(/Firma .* capturada/i).check();

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

    // — Stage 1 —
    await expect(page.getByText('Carlos López')).toBeVisible();
    await page.getByLabel(/Licencia de conducir/i).check();
    await page.getByLabel(/DNI válido/i).check();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // — Stage 2 —
    await expect(page).toHaveURL(/entrega-02/);
    await expect(page.getByRole('radio', { name: 'Favorable', exact: true })).toBeVisible();
    await page.getByRole('radio', { name: 'Favorable', exact: true }).check();
    await page.getByLabel(/Hora de la prueba/i).fill('09:15');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // — Stage 3 —
    await expect(page).toHaveURL(/entrega-03/);
    await expect(page.getByText('Notaría obligatoria', { exact: true })).toBeVisible();
    await page.getByLabel(/Monto/i).fill('500');
    await page.getByLabel(/Firma .* capturada/i).check();
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
