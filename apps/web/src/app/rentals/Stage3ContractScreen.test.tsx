import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Stage3ContractScreen } from './Stage3ContractScreen';
import { clearPermissions, setPermissions } from '../../test/permissions';

// ── mocks de infraestructura ────────────────────────────────────────────────

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('../shared/AppHeader', () => ({ AppHeader: () => <header>cabecera</header> }));

const useRentalWizardMock = vi.fn();
vi.mock('./useRentalWizard', () => ({
  useRentalWizard: () => useRentalWizardMock(),
}));

const mfaRequestMock = vi.fn();
vi.mock('../auth/useMfaStepUp', async () => {
  const actual = await vi.importActual<typeof import('../auth/useMfaStepUp')>('../auth/useMfaStepUp');
  return {
    ...actual,
    useMfaStepUp: () => ({
      request: (...args: unknown[]) => mfaRequestMock(...args),
      challenge: { isOpen: false, state: 'READY' as const, requirePassword: true, onConfirm: vi.fn(), onCancel: vi.fn() },
    }),
  };
});

const evaluateNotaryMock = vi.fn();
const approveNotaryExceptionMock = vi.fn();
const formalizeContractMock = vi.fn();
const getContractTemplateMock = vi.fn();
const setCompanyDriverDailyRateMock = vi.fn();
const requestUploadSessionMock = vi.fn();
const uploadFileToGcsMock = vi.fn();
const recordRentalDocumentMock = vi.fn();

vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    evaluateNotary: (...args: unknown[]) => evaluateNotaryMock(...args),
    approveNotaryException: (...args: unknown[]) => approveNotaryExceptionMock(...args),
    formalizeContract: (...args: unknown[]) => formalizeContractMock(...args),
    getContractTemplate: (...args: unknown[]) => getContractTemplateMock(...args),
    setCompanyDriverDailyRate: (...args: unknown[]) => setCompanyDriverDailyRateMock(...args),
    requestRentalDocumentUploadSession: (...args: unknown[]) => requestUploadSessionMock(...args),
    uploadFileToGcs: (...args: unknown[]) => uploadFileToGcsMock(...args),
    recordRentalDocument: (...args: unknown[]) => recordRentalDocumentMock(...args),
  };
});

// ── fixtures ────────────────────────────────────────────────────────────────

const mandatoryEvaluation = {
  id: 'ne-1',
  policyVersion: 1,
  result: 'MANDATORY' as const,
  reason: 'Modelo Hilux requiere notaría obligatoria (BR-ALQ-003)',
  evaluatedAt: '2024-01-01T00:00:00Z',
  approvedBy: null,
  justification: null,
};

const thirdPathEvaluation = {
  id: 'ne-2',
  policyVersion: 1,
  result: 'THIRD_PATH_ELIGIBLE' as const,
  reason: 'Elegible para tercer camino pendiente de aprobación',
  evaluatedAt: '2024-01-01T00:00:00Z',
  approvedBy: null,
  justification: null,
};

const baseRental = {
  id: 'rent-1',
  status: 'NOTARY_EVALUATION',
  customerName: 'Carlos Vega',
  customerDocNumber: '87654321',
  vehicleBrand: 'Chevrolet',
  vehicleModel: 'Colorado',
  vehiclePlate: 'A1B-234',
  alcoholTestResult: 'FAVORABLE',
  version: 3,
  notaryEvaluation: mandatoryEvaluation,
  contract: null,
  deposit: null,
};

const baseContext = {
  companyId: 'c1',
  companyName: 'VeloxRent',
  branchId: 'b1',
  branchName: 'Sede Central',
};

function makeWizard(overrides?: Record<string, unknown>) {
  return {
    id: 'rent-1',
    state: 'READY' as const,
    rental: baseRental,
    context: baseContext,
    getIdToken: vi.fn().mockResolvedValue('tok'),
    setRental: vi.fn(),
    reload: vi.fn(),
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/alquileres/rent-1/entrega-03', state: baseContext },
      ]}
    >
      <Routes>
        <Route path="/alquileres/:id/entrega-03" element={<Stage3ContractScreen />} />
        <Route path="/alquileres/:id/entrega-04" element={<div>etapa 4</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function templateSelection(overrides?: Record<string, unknown>) {
  return {
    variant: { holderType: 'NATURAL', withCompanyDriver: false },
    requestedType: 'RENTAL_CONTRACT_NATURAL',
    fallbackUsed: false,
    template: { id: 't1', type: 'RENTAL_CONTRACT_NATURAL', name: 'Contrato persona natural' },
    ...overrides,
  };
}

/** Decision 22-oct #8: con diferencia a cobrar hay que registrar el comprobante (metodo, nº de operacion y voucher). */
function fillPaymentProof() {
  const op = screen.queryByLabelText(/Nº de operación/);
  if (!op) return;
  fireEvent.change(op, { target: { value: 'OP-123' } });
  fireEvent.change(screen.getByLabelText(/Comprobante de pago/), {
    target: { files: [new File(['v'], 'voucher.png', { type: 'image/png' })] },
  });
}

function setupUploadMocks() {
  requestUploadSessionMock.mockReset();
  uploadFileToGcsMock.mockReset();
  recordRentalDocumentMock.mockReset();
  requestUploadSessionMock.mockResolvedValue({ uploadUrl: 'https://gcs/up', objectUrl: 'https://gcs/obj' });
  uploadFileToGcsMock.mockResolvedValue(undefined);
  recordRentalDocumentMock.mockResolvedValue({ id: 'doc-77' });
}

// ── suite ───────────────────────────────────────────────────────────────────

describe('Stage3ContractScreen (ENTREGA-03 / ALQ-07 + ALQ-08)', () => {
  beforeEach(() => {
    window.sessionStorage.clear(); // V-15: el borrador de ENTREGA-03 no debe filtrarse entre tests
    evaluateNotaryMock.mockReset();
    approveNotaryExceptionMock.mockReset();
    formalizeContractMock.mockReset();
    mfaRequestMock.mockReset();
    setupUploadMocks();
    getContractTemplateMock.mockReset();
    getContractTemplateMock.mockResolvedValue(templateSelection());
    useRentalWizardMock.mockReset();
    clearPermissions();
  });

  // ── estado: carga ─────────────────────────────────────────────────────────

  it('muestra mensaje de carga cuando state es LOADING', () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ state: 'LOADING', rental: null, context: null }));
    renderScreen();
    expect(screen.getByText(/Cargando expediente/)).toBeInTheDocument();
  });

  // ── estado: error ─────────────────────────────────────────────────────────

  it('muestra mensaje de error cuando state es RECOVERABLE_ERROR', () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ state: 'RECOVERABLE_ERROR', rental: null, context: null }));
    renderScreen();
    expect(screen.getByText(/No pudimos cargar el expediente/)).toBeInTheDocument();
  });

  // ── estado: nominal con evaluación ya resuelta ────────────────────────────

  it('renderiza la evaluación notarial y el formulario de contrato cuando notaryEvaluation ya existe', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    expect(screen.getByText('Notaría obligatoria')).toBeInTheDocument();
    expect(screen.getByText(/BR-ALQ-003/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Área de firma digital/)).toBeInTheDocument();
  });

  it('"Formalizar y continuar" está deshabilitado sin firma ni monto', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeDisabled();
  });

  // ── estado: evaluación en curso (notaryEvaluation === null) ───────────────

  it('evalua la notaría al pulsar "Evaluar notaría" cuando notaryEvaluation no existe', async () => {
    const rentalSinEval = { ...baseRental, notaryEvaluation: null };
    evaluateNotaryMock.mockResolvedValue({
      rental: { ...rentalSinEval, notaryEvaluation: mandatoryEvaluation, version: 4 },
      evaluation: mandatoryEvaluation,
    });
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: rentalSinEval }));

    renderScreen();

    // La evaluacion ya no es automatica: primero se registra (o no) la biometria y luego se evalua.
    expect(evaluateNotaryMock).not.toHaveBeenCalled();
    // A-01: sin marcar la biometría el botón está deshabilitado.
    expect(screen.getByRole('button', { name: 'Evaluar notaría' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Verificación biométrica favorable/));
    fireEvent.click(screen.getByRole('button', { name: 'Evaluar notaría' }));
    await waitFor(() => expect(evaluateNotaryMock).toHaveBeenCalled());
    expect(await screen.findByText('Notaría obligatoria')).toBeInTheDocument();
  });

  it('muestra mensaje de error si evaluateNotary falla', async () => {
    const rentalSinEval = { ...baseRental, notaryEvaluation: null };
    evaluateNotaryMock.mockRejectedValue(new Error('Network'));
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: rentalSinEval }));

    renderScreen();
    fireEvent.click(screen.getByLabelText(/Verificación biométrica favorable/));
    fireEvent.click(screen.getByRole('button', { name: 'Evaluar notaría' }));

    expect(await screen.findByText(/No pudimos evaluar la matriz notarial/)).toBeInTheDocument();
  });

  // ── excepción notarial: permisos ──────────────────────────────────────────

  it('usuario sin RENTAL.APPROVE_NOTARY_EXCEPTION ve el aviso de falta de permiso cuando el resultado requiere excepción (THIRD_PATH_ELIGIBLE)', () => {
    setPermissions(['RENTAL.READ', 'RENTAL.FORMALIZE_CONTRACT']);
    const rentalThirdPath = { ...baseRental, notaryEvaluation: thirdPathEvaluation };
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: rentalThirdPath }));

    renderScreen();

    expect(screen.getByText(/No tienes permiso para aprobar o rechazar esta excepción notarial/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprobar excepción' })).not.toBeInTheDocument();
  });

  it('usuario con RENTAL.APPROVE_NOTARY_EXCEPTION (cualquier rol) ve el botón "Aprobar excepción" cuando el resultado es THIRD_PATH_ELIGIBLE', () => {
    setPermissions(['RENTAL.APPROVE_NOTARY_EXCEPTION']);
    const rentalThirdPath = { ...baseRental, notaryEvaluation: thirdPathEvaluation };
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: rentalThirdPath }));

    renderScreen();

    expect(screen.getByRole('button', { name: 'Aprobar excepción' })).toBeInTheDocument();
  });

  it('mientras los permisos cargan no se ofrece "Aprobar excepción"', () => {
    clearPermissions();
    const rentalThirdPath = { ...baseRental, notaryEvaluation: thirdPathEvaluation };
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: rentalThirdPath }));

    renderScreen();

    expect(screen.queryByRole('button', { name: 'Aprobar excepción' })).not.toBeInTheDocument();
  });

  // ── validación: campos necesarios para formalizar ────────────────────────

  it('"Formalizar y continuar" se habilita con firma capturada, huella física y monto ingresado', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    fillPaymentProof();

    await screen.findByText(/Contrato persona natural/);
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeDisabled();

    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).not.toBeDisabled();
  });

  // ── confirmación: modal de confirmación ──────────────────────────────────

  it('abre el modal de confirmación al hacer clic en "Formalizar y continuar"', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    fillPaymentProof();
    await screen.findByText(/Contrato persona natural/);
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Formalizar el contrato/)).toBeInTheDocument();
  });

  // ── guardado: submit exitoso ──────────────────────────────────────────────

  it('navega a etapa 4 cuando formalizeContract resuelve', async () => {
    const setRentalMock = vi.fn();
    useRentalWizardMock.mockReturnValue(makeWizard({ setRental: setRentalMock }));
    formalizeContractMock.mockResolvedValue({
      ...baseRental,
      status: 'PENDING_DELIVERY',
      version: 4,
      contract: { id: 'ct-1', documentRef: 'CONTRATO-rent-000', status: 'SIGNED', signedAt: null, createdAt: '', templateVersionId: 'v1', fingerprintTaken: true },
    });

    renderScreen();

    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    fillPaymentProof();
    await screen.findByText(/Contrato persona natural/);
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));

    expect(await screen.findByText('etapa 4')).toBeInTheDocument();
    expect(setRentalMock).toHaveBeenCalled();
    expect(formalizeContractMock.mock.calls[0][12]).toBe(true);
  });

  // ── error de API ──────────────────────────────────────────────────────────

  it('muestra el detail del RentalCommandError cuando formalizeContract rechaza', async () => {
    const { RentalCommandError } = await import('./rentals-client');
    useRentalWizardMock.mockReturnValue(makeWizard());
    formalizeContractMock.mockRejectedValue(
      new RentalCommandError(422, { code: 'INVALID_STATE', detail: 'El alquiler no está en estado válido para formalizar' }),
    );

    renderScreen();

    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    fillPaymentProof();
    await screen.findByText(/Contrato persona natural/);
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));

    expect(
      await screen.findByText('El alquiler no está en estado válido para formalizar'),
    ).toBeInTheDocument();
  });
  it('V-07: con MFA_RECENT_REQUIRED muestra «Verificar MFA» y reintenta la formalización con el token renovado', async () => {
    const { RentalCommandError } = await import('./rentals-client');
    useRentalWizardMock.mockReturnValue(makeWizard());
    formalizeContractMock
      .mockRejectedValueOnce(new RentalCommandError(403, { code: 'MFA_RECENT_REQUIRED', detail: 'MFA requerido' }))
      .mockResolvedValueOnce({ ...baseRental, status: 'PENDING_DELIVERY', version: 4 });
    mfaRequestMock.mockResolvedValue('fresh-token');

    renderScreen();
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    fillPaymentProof();
    await screen.findByText(/Contrato persona natural/);
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Verificar MFA' }));

    await waitFor(() => expect(formalizeContractMock).toHaveBeenCalledTimes(2));
    expect(mfaRequestMock).toHaveBeenCalledTimes(1);
    expect(formalizeContractMock.mock.calls[1][0]).toBe('fresh-token');
  });

});

describe('Stage3ContractScreen - traslado de reserva y plantilla (P0-03 a, BR-DOC-003)', () => {
  const reservationRental = {
    ...baseRental,
    reservationId: 'res-1',
    reservationCredit: { reservationId: 'res-1', applied: true, reason: 'APPLIED', creditAmount: '300.00', currency: 'PEN' },
  };

  beforeEach(() => {
    window.sessionStorage.clear(); // V-15: el borrador de ENTREGA-03 no debe filtrarse entre tests
    getContractTemplateMock.mockReset();
    getContractTemplateMock.mockResolvedValue(templateSelection());
    formalizeContractMock.mockReset();
    setupUploadMocks();
    useRentalWizardMock.mockReset();
    clearPermissions();
  });

  async function fillBasics() {
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '1000' } });
    fillPaymentProof();
    await screen.findByText(/Contrato persona natural/);
  }

  it('alquiler de origen Reserva muestra el desglose: total, reserva aplicada y diferencia', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: reservationRental }));
    renderScreen();
    await fillBasics();
    const box = screen.getByTestId('guarantee-breakdown');
    expect(box).toHaveTextContent('S/ 1000.00');
    expect(box).toHaveTextContent('- S/ 300.00');
    expect(box).toHaveTextContent('S/ 700.00');
  });

  it('alquiler directo cobra la garantia completa (reserva aplicada 0)', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    await fillBasics();
    const box = screen.getByTestId('guarantee-breakdown');
    expect(box).toHaveTextContent('- S/ 0.00');
    expect(box).toHaveTextContent('S/ 1000.00');
  });

  it('reserva cancelada: avisa que no traslada monto y cobra todo', async () => {
    const cancelled = {
      ...reservationRental,
      reservationCredit: { ...reservationRental.reservationCredit, applied: false, reason: 'RESERVATION_NOT_ACTIVE', creditAmount: '0.00' },
    };
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: cancelled }));
    renderScreen();
    await fillBasics();
    expect(screen.getByText(/no traslada monto/)).toBeInTheDocument();
    expect(screen.getByTestId('guarantee-breakdown')).toHaveTextContent('- S/ 0.00');
  });

  it('reserva con monto distinto (S/ 450) se descuenta tal cual', async () => {
    const r = { ...reservationRental, reservationCredit: { ...reservationRental.reservationCredit, creditAmount: '450.00' } };
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: r }));
    renderScreen();
    await fillBasics();
    expect(screen.getByTestId('guarantee-breakdown')).toHaveTextContent('S/ 550.00');
  });

  it('reserva mayor que la garantia: cobro 0 y nunca se muestra saldo a favor', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: reservationRental }));
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '200' } });
    fillPaymentProof();
    await screen.findByText(/Contrato persona natural/);
    expect(screen.queryByTestId('reservation-credit-excess')).not.toBeInTheDocument();
    expect(screen.getByTestId('guarantee-breakdown')).toHaveTextContent('S/ 0.00');
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeEnabled();
  });

  it('traduce 400 CONTRACT_VARIANT_DRIVER_CONFLICT', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    formalizeContractMock.mockRejectedValue(new (await import('./rentals-client')).RentalCommandError(400, { code: 'CONTRACT_VARIANT_DRIVER_CONFLICT', detail: 'x' }));
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    fillPaymentProof();
    await screen.findByText(/Contrato persona natural/);
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));
    expect(await screen.findByText(/variante del contrato es inconsistente/)).toBeInTheDocument();
  });

  it('el modal de confirmacion incluye el desglose', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: reservationRental }));
    renderScreen();
    await fillBasics();
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/reserva aplicada S\/ 300\.00; a cobrar ahora S\/ 700\.00/);
  });

  it('envia holderType y withCompanyDriver elegidos a formalize-contract', async () => {
    setCompanyDriverDailyRateMock.mockResolvedValue({ ...baseRental, status: 'PENDING_DELIVERY', version: 5 });
    useRentalWizardMock.mockReturnValue(makeWizard());
    getContractTemplateMock.mockResolvedValue(
      templateSelection({ template: { id: 't2', type: 'RENTAL_CONTRACT_LEGAL_DRIVER', name: 'Contrato persona jurídica con conductor' } }),
    );
    formalizeContractMock.mockResolvedValue({ ...baseRental, status: 'PENDING_DELIVERY', version: 4 });
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Persona jurídica' }));
    fireEvent.click(screen.getByLabelText(/Con conductor de la empresa/));
    fireEvent.change(screen.getByLabelText('Tarifa diaria del conductor (S/)'), { target: { value: '100' } });
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    await screen.findByText(/Contrato persona jurídica con conductor/);
    await waitFor(() =>
      expect(getContractTemplateMock).toHaveBeenLastCalledWith('tok', 'rent-1', 'c1', 'b1', { holderType: 'LEGAL', withCompanyDriver: true }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));
    await screen.findByText('etapa 4');
    expect(formalizeContractMock.mock.calls[0][10]).toEqual({ holderType: 'LEGAL', withCompanyDriver: true });
    // Con conductor de la empresa NO se envia garantia (DEC-ALQ-COMPANY-DRIVER-004).
    expect(formalizeContractMock.mock.calls[0][6]).toBeNull();
    expect(formalizeContractMock.mock.calls[0][7]).toBeNull();
    expect(formalizeContractMock.mock.calls[0][12]).toBe(true);
  });

  it('con conductor de la empresa oculta el cobro de garantia y muestra el mensaje', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    expect(screen.getByLabelText(/Garantía total \(PEN\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Con conductor de la empresa/));
    expect(screen.queryByLabelText(/Garantía total \(PEN\)/)).not.toBeInTheDocument();
    expect(screen.getByTestId('no-deposit-company-driver')).toHaveTextContent('Con conductor de la empresa no se cobra garantía');
    fireEvent.change(screen.getByLabelText('Tarifa diaria del conductor (S/)'), { target: { value: '100' } });
    // formalizar exige la firma y huella
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeEnabled());
  });

  it('con conductor de la empresa y reserva pagada no muestra saldo a favor', async () => {
    useRentalWizardMock.mockReturnValue(
      makeWizard({
        rental: {
          ...baseRental,
          reservationCredit: { reservationId: 'res-1', applied: true, reason: 'APPLIED', creditAmount: '300.00', currency: 'PEN' },
        },
      }),
    );
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Con conductor de la empresa/));
    expect(screen.queryByTestId('reservation-credit-excess')).not.toBeInTheDocument();
  });

  it('traduce DEPOSIT_NOT_APPLICABLE_WITH_COMPANY_DRIVER', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    formalizeContractMock.mockRejectedValue(
      new (await import('./rentals-client')).RentalCommandError(422, { code: 'DEPOSIT_NOT_APPLICABLE_WITH_COMPANY_DRIVER', detail: 'x' }),
    );
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Con conductor de la empresa/));
    fireEvent.change(screen.getByLabelText('Tarifa diaria del conductor (S/)'), { target: { value: '100' } });
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Con conductor de la empresa no se cobra garantía.');
  });

  it('avisa cuando se usa la plantilla general por falta de la especifica', async () => {
    getContractTemplateMock.mockResolvedValue(templateSelection({ fallbackUsed: true, template: { id: 'g', type: 'RENTAL_CONTRACT', name: 'Contrato general' } }));
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    expect(await screen.findByText(/plantilla general de alquiler/)).toBeInTheDocument();
  });

  it('sin plantilla vigente bloquea formalizar con aviso', async () => {
    getContractTemplateMock.mockResolvedValue(templateSelection({ template: null }));
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    fillPaymentProof();
    expect(await screen.findByText(/No hay plantilla de contrato vigente/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeDisabled();
  });
});


describe('Stage3ContractScreen - comprobante de garantia, biometria y tercera via (22-oct)', () => {
  const rentalSinEval = { ...baseRental, notaryEvaluation: null };

  beforeEach(() => {
    window.sessionStorage.clear(); // V-15: el borrador de ENTREGA-03 no debe filtrarse entre tests
    getContractTemplateMock.mockReset();
    getContractTemplateMock.mockResolvedValue(templateSelection());
    formalizeContractMock.mockReset();
    setupUploadMocks();
    evaluateNotaryMock.mockReset();
    useRentalWizardMock.mockReset();
    requestUploadSessionMock.mockReset();
    uploadFileToGcsMock.mockReset();
    recordRentalDocumentMock.mockReset();
    requestUploadSessionMock.mockResolvedValue({ uploadUrl: 'https://gcs/up', objectUrl: 'https://gcs/obj' });
    uploadFileToGcsMock.mockResolvedValue(undefined);
    recordRentalDocumentMock.mockResolvedValue({ id: 'doc-77' });
    clearPermissions();
  });

  it('envia biometricVerified=true a evaluate-notary cuando el personal marca la casilla', async () => {
    evaluateNotaryMock.mockResolvedValue({
      rental: { ...rentalSinEval, notaryEvaluation: mandatoryEvaluation, version: 4 },
      evaluation: mandatoryEvaluation,
    });
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: rentalSinEval }));
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Verificación biométrica favorable/));
    fireEvent.click(screen.getByRole('button', { name: 'Evaluar notaría' }));
    await waitFor(() => expect(evaluateNotaryMock).toHaveBeenCalledWith('tok', 'rent-1', 'c1', 'b1', 3, true));
  });

  it.each([
    ['THIRD_PATH_ELIGIBLE', /documento de responsabilidad en lugar de ir a notaría/],
    ['MANUAL_REVIEW', /Cliente antiguo sin verificación biométrica/],
    ['DOUBLE_DEPOSIT', /se exige el doble de la garantía base/],
    ['MANDATORY', /trámite notarial es obligatorio/],
  ])('explica el resultado %s con su significado', async (result, text) => {
    const evaluation = { ...mandatoryEvaluation, result, previousRentalsCount: 4, biometricVerified: true, biometricVerifiedBy: 'u1' };
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: { ...baseRental, notaryEvaluation: evaluation } }));
    renderScreen();
    expect(screen.getByTestId('notary-explanation')).toHaveTextContent(text);
    expect(screen.getByTestId('notary-previous-rentals')).toHaveTextContent('4');
    expect(screen.getByTestId('notary-biometric')).toBeInTheDocument();
  });

  it('con DOUBLE_DEPOSIT propone la garantia exigida (x2) y avisa el calculo', async () => {
    const rental = {
      ...baseRental,
      notaryEvaluation: { ...mandatoryEvaluation, result: 'DOUBLE_DEPOSIT' },
      requiredGuarantee: { baseAmount: '500.00', multiplier: 2, amount: '1000.00' },
    };
    useRentalWizardMock.mockReturnValue(makeWizard({ rental }));
    renderScreen();
    expect(screen.getByLabelText(/Garantía total \(PEN\)/)).toHaveValue(1000);
    expect(screen.getByTestId('required-guarantee')).toHaveTextContent('doble depósito: base S/ 500.00 x 2');
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '600' } });
    expect(screen.getByText(/inferior a la garantía exigida \(S\/ 1000\.00\)/)).toBeInTheDocument();
  });

  it('muestra la marca de tercera via del vehiculo', () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: { ...baseRental, vehicleThirdPathEligible: true } }));
    renderScreen();
    expect(screen.getByTestId('vehicle-third-path-flag')).toBeInTheDocument();
  });

  it('sin comprobante no se puede formalizar; con comprobante sube el voucher y envia el pago real', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    formalizeContractMock.mockResolvedValue({ ...baseRental, status: 'PENDING_DELIVERY', version: 4 });
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    await screen.findByText(/Contrato persona natural/);
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeDisabled();
    expect(screen.getByText('Adjunta el comprobante de pago.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Método de pago/), { target: { value: 'YAPE' } });
    fillPaymentProof();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));

    await screen.findByText('etapa 4');
    expect(requestUploadSessionMock).toHaveBeenCalledWith(
      'tok', 'rent-1', 'c1', 'b1', 'PAYMENT_VOUCHER', 'image/png', expect.any(Number),
    );
    expect(formalizeContractMock.mock.calls[0][11]).toEqual({
      method: 'YAPE',
      operationNumber: 'OP-123',
      payerName: 'Carlos Vega',
      payerIsExternalAgent: false,
      voucherDocumentId: 'doc-77',
    });
    expect(formalizeContractMock.mock.calls[0][12]).toBe(true);
  });

  it('agente externo exige documento y verificacion adicional', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    await screen.findByText(/Contrato persona natural/);
    fillPaymentProof();
    fireEvent.click(screen.getByRole('button', { name: 'Paga un agente externo' }));
    fireEvent.change(screen.getByLabelText(/Nombre de quien paga/), { target: { value: 'Luis Soto' } });
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Documento del agente externo/), { target: { value: '12345678' } });
    fireEvent.click(screen.getByLabelText(/Verifiqué al agente externo/));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeEnabled());
  });

  it('si la reserva cubre toda la garantia no pide comprobante', async () => {
    const rental = {
      ...baseRental,
      reservationCredit: { reservationId: 'r', applied: true, reason: 'APPLIED', creditAmount: '500.00', currency: 'PEN' },
    };
    useRentalWizardMock.mockReturnValue(makeWizard({ rental }));
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    await screen.findByText(/Contrato persona natural/);
    expect(screen.queryByTestId('payment-proof-form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeEnabled();
  });

  it('traduce 422 INVALID_DEPOSIT_AMOUNT', async () => {
    const { RentalCommandError } = await import('./rentals-client');
    useRentalWizardMock.mockReturnValue(makeWizard());
    formalizeContractMock.mockRejectedValue(new RentalCommandError(422, { code: 'INVALID_DEPOSIT_AMOUNT' }));
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    fillPaymentProof();
    await screen.findByText(/Contrato persona natural/);
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));
    expect(await screen.findByText(/El monto de la garantía no es válido/)).toBeInTheDocument();
  });
});
