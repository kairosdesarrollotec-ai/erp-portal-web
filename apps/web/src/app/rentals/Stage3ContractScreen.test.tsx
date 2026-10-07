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

const useRentalWizardMock = vi.fn();
vi.mock('./useRentalWizard', () => ({
  useRentalWizard: () => useRentalWizardMock(),
}));

const evaluateNotaryMock = vi.fn();
const approveNotaryExceptionMock = vi.fn();
const formalizeContractMock = vi.fn();

vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    evaluateNotary: (...args: unknown[]) => evaluateNotaryMock(...args),
    approveNotaryException: (...args: unknown[]) => approveNotaryExceptionMock(...args),
    formalizeContract: (...args: unknown[]) => formalizeContractMock(...args),
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

// ── suite ───────────────────────────────────────────────────────────────────

describe('Stage3ContractScreen (ENTREGA-03 / ALQ-07 + ALQ-08)', () => {
  beforeEach(() => {
    evaluateNotaryMock.mockReset();
    approveNotaryExceptionMock.mockReset();
    formalizeContractMock.mockReset();
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

  it('"Formalizar y continuar" se habilita con firma capturada y monto ingresado', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.change(screen.getByLabelText(/Monto \(PEN\)/), { target: { value: '500' } });

    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).not.toBeDisabled();
  });

  // ── confirmación: modal de confirmación ──────────────────────────────────

  it('abre el modal de confirmación al hacer clic en "Formalizar y continuar"', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.change(screen.getByLabelText(/Monto \(PEN\)/), { target: { value: '500' } });
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
    fireEvent.change(screen.getByLabelText(/Monto \(PEN\)/), { target: { value: '500' } });
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
    fireEvent.change(screen.getByLabelText(/Monto \(PEN\)/), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));

    expect(
      await screen.findByText('El alquiler no está en estado válido para formalizar'),
    ).toBeInTheDocument();
  });
});
