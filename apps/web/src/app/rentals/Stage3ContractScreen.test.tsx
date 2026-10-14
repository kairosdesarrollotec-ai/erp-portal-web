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

const evaluateNotaryMock = vi.fn();
const approveNotaryExceptionMock = vi.fn();
const formalizeContractMock = vi.fn();
const getContractTemplateMock = vi.fn();

vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    evaluateNotary: (...args: unknown[]) => evaluateNotaryMock(...args),
    approveNotaryException: (...args: unknown[]) => approveNotaryExceptionMock(...args),
    formalizeContract: (...args: unknown[]) => formalizeContractMock(...args),
    getContractTemplate: (...args: unknown[]) => getContractTemplateMock(...args),
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

// ── suite ───────────────────────────────────────────────────────────────────

describe('Stage3ContractScreen (ENTREGA-03 / ALQ-07 + ALQ-08)', () => {
  beforeEach(() => {
    evaluateNotaryMock.mockReset();
    approveNotaryExceptionMock.mockReset();
    formalizeContractMock.mockReset();
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

  it('llama a evaluateNotary en el montaje cuando notaryEvaluation no existe', async () => {
    const rentalSinEval = { ...baseRental, notaryEvaluation: null };
    evaluateNotaryMock.mockResolvedValue({
      rental: { ...rentalSinEval, notaryEvaluation: mandatoryEvaluation, version: 4 },
      evaluation: mandatoryEvaluation,
    });
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: rentalSinEval }));

    renderScreen();

    await waitFor(() => expect(evaluateNotaryMock).toHaveBeenCalled());
    expect(await screen.findByText('Notaría obligatoria')).toBeInTheDocument();
  });

  it('muestra mensaje de error si evaluateNotary falla', async () => {
    const rentalSinEval = { ...baseRental, notaryEvaluation: null };
    evaluateNotaryMock.mockRejectedValue(new Error('Network'));
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: rentalSinEval }));

    renderScreen();

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

  it('"Formalizar y continuar" se habilita con firma capturada y monto ingresado', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });

    await screen.findByText(/Contrato persona natural/);
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).not.toBeDisabled();
  });

  // ── confirmación: modal de confirmación ──────────────────────────────────

  it('abre el modal de confirmación al hacer clic en "Formalizar y continuar"', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
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
      contract: { id: 'ct-1', documentRef: 'CONTRATO-rent-000', status: 'SIGNED', signedAt: null, createdAt: '', templateVersionId: 'v1' },
    });

    renderScreen();

    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    await screen.findByText(/Contrato persona natural/);
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));

    expect(await screen.findByText('etapa 4')).toBeInTheDocument();
    expect(setRentalMock).toHaveBeenCalled();
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
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    await screen.findByText(/Contrato persona natural/);
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));

    expect(
      await screen.findByText('El alquiler no está en estado válido para formalizar'),
    ).toBeInTheDocument();
  });
});

describe('Stage3ContractScreen - traslado de reserva y plantilla (P0-03 a, BR-DOC-003)', () => {
  const reservationRental = {
    ...baseRental,
    reservationId: 'res-1',
    reservationCredit: { reservationId: 'res-1', applied: true, reason: 'APPLIED', creditAmount: '300.00', currency: 'PEN' },
  };

  beforeEach(() => {
    getContractTemplateMock.mockReset();
    getContractTemplateMock.mockResolvedValue(templateSelection());
    formalizeContractMock.mockReset();
    useRentalWizardMock.mockReset();
    clearPermissions();
  });

  async function fillBasics() {
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '1000' } });
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

  it('reserva mayor que la garantia no bloquea: cobro 0 y saldo a favor', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ rental: reservationRental }));
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '200' } });
    await screen.findByText(/Contrato persona natural/);
    expect(screen.getByTestId('reservation-credit-excess')).toHaveTextContent(/Saldo a favor de la reserva \(sin reembolso automático\): S\/ 100\.00/);
    expect(screen.getByTestId('guarantee-breakdown')).toHaveTextContent('S/ 0.00');
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeEnabled();
  });

  it('traduce 400 CONTRACT_VARIANT_DRIVER_CONFLICT', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    formalizeContractMock.mockRejectedValue(new (await import('./rentals-client')).RentalCommandError(400, { code: 'CONTRACT_VARIANT_DRIVER_CONFLICT', detail: 'x' }));
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
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
    useRentalWizardMock.mockReturnValue(makeWizard());
    getContractTemplateMock.mockResolvedValue(
      templateSelection({ template: { id: 't2', type: 'RENTAL_CONTRACT_LEGAL_DRIVER', name: 'Contrato persona jurídica con conductor' } }),
    );
    formalizeContractMock.mockResolvedValue({ ...baseRental, status: 'PENDING_DELIVERY', version: 4 });
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Persona jurídica' }));
    fireEvent.click(screen.getByLabelText(/Con conductor de la empresa/));
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.change(screen.getByLabelText(/Garantía total \(PEN\)/), { target: { value: '500' } });
    await screen.findByText(/Contrato persona jurídica con conductor/);
    await waitFor(() =>
      expect(getContractTemplateMock).toHaveBeenLastCalledWith('tok', 'rent-1', 'c1', 'b1', { holderType: 'LEGAL', withCompanyDriver: true }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));
    await screen.findByText('etapa 4');
    expect(formalizeContractMock.mock.calls[0][10]).toEqual({ holderType: 'LEGAL', withCompanyDriver: true });
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
    expect(await screen.findByText(/No hay plantilla de contrato vigente/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeDisabled();
  });
});
