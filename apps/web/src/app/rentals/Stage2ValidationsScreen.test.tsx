import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Stage2ValidationsScreen } from './Stage2ValidationsScreen';

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

const registerAlcoholTestMock = vi.fn();
vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    registerAlcoholTest: (...args: unknown[]) => registerAlcoholTestMock(...args),
  };
});

// ── fixtures ────────────────────────────────────────────────────────────────

const baseRental = {
  id: 'rent-1',
  status: 'VALIDATION',
  customerName: 'Maria Quispe',
  customerDocNumber: '12345678',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehiclePlate: 'D0Y-704',
  alcoholTestResult: null,
  version: 2,
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
        { pathname: '/alquileres/rent-1/entrega-02', state: baseContext },
      ]}
    >
      <Routes>
        <Route path="/alquileres/:id/entrega-02" element={<Stage2ValidationsScreen />} />
        <Route path="/alquileres/:id/entrega-03" element={<div>etapa 3</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── suite ───────────────────────────────────────────────────────────────────

describe('Stage2ValidationsScreen (ENTREGA-02 / ALQ-04)', () => {
  beforeEach(() => {
    registerAlcoholTestMock.mockReset();
    useRentalWizardMock.mockReset();
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

  it('muestra mensaje de error cuando state es NOT_FOUND (sesión vencida o recurso ausente)', () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ state: 'NOT_FOUND', rental: null, context: null }));
    renderScreen();
    expect(screen.getByText(/No pudimos cargar el expediente/)).toBeInTheDocument();
  });

  // ── estado: nominal ───────────────────────────────────────────────────────

  it('renderiza el formulario de alcoholímetro en estado READY', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    expect(screen.getByText(/Resultado del alcoholímetro/)).toBeInTheDocument();
    expect(screen.getByLabelText('Favorable')).toBeInTheDocument();
    expect(screen.getByLabelText('Desfavorable')).toBeInTheDocument();
  });

  it('Continuar está deshabilitado sin resultado ni hora', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  // ── validación: resultado + hora habilitan Continuar ─────────────────────

  it('Continuar se habilita solo cuando el resultado es FAVORABLE y hay hora', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByLabelText('Favorable'));
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled(); // aún falta la hora

    fireEvent.change(screen.getByLabelText(/Fecha y hora de la prueba/), { target: { value: '2024-01-01T10:30' } });
    expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled();
  });

  it('muestra aviso y deshabilita Continuar cuando el resultado no es FAVORABLE', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByLabelText('Desfavorable'));
    expect(screen.getByText(/Solo se puede continuar con resultado Favorable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  // ── guardado: submit exitoso ──────────────────────────────────────────────

  it('navega a etapa 3 y llama a setRental cuando registerAlcoholTest resuelve', async () => {
    const setRentalMock = vi.fn();
    useRentalWizardMock.mockReturnValue(makeWizard({ setRental: setRentalMock }));
    registerAlcoholTestMock.mockResolvedValue({ ...baseRental, status: 'NOTARY_EVALUATION', version: 3 });

    renderScreen();

    fireEvent.click(screen.getByLabelText('Favorable'));
    fireEvent.change(screen.getByLabelText(/Fecha y hora de la prueba/), { target: { value: '2024-01-01T10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('etapa 3')).toBeInTheDocument();
    expect(setRentalMock).toHaveBeenCalled();
    expect(registerAlcoholTestMock).toHaveBeenCalledWith(
      'tok',
      'rent-1',
      'c1',
      'b1',
      2,
      'FAVORABLE',
      expect.stringContaining('10:30'),
    );
  });

  // ── error de API ──────────────────────────────────────────────────────────

  it('muestra el mensaje del RentalCommandError cuando el comando rechaza', async () => {
    const { RentalCommandError } = await import('./rentals-client');
    useRentalWizardMock.mockReturnValue(makeWizard());
    registerAlcoholTestMock.mockRejectedValue(
      new RentalCommandError(409, { code: 'VERSION_MISMATCH', detail: 'Conflicto de versión detectado' }),
    );

    renderScreen();

    fireEvent.click(screen.getByLabelText('Favorable'));
    fireEvent.change(screen.getByLabelText(/Fecha y hora de la prueba/), { target: { value: '2024-01-01T10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Conflicto de versión detectado')).toBeInTheDocument();
  });

  it('muestra mensaje genérico cuando el error no es RentalCommandError', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    registerAlcoholTestMock.mockRejectedValue(new Error('Network error'));

    renderScreen();

    fireEvent.click(screen.getByLabelText('Favorable'));
    fireEvent.change(screen.getByLabelText(/Fecha y hora de la prueba/), { target: { value: '2024-01-01T10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText(/No pudimos registrar la validación/)).toBeInTheDocument();
  });

});
