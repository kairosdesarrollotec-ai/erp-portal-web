import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Stage4ChecklistScreen } from './Stage4ChecklistScreen';

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

// ── fixtures ────────────────────────────────────────────────────────────────

const baseRental = {
  id: 'rent-1',
  status: 'PENDING_DELIVERY',
  customerName: 'Ana Torres',
  customerDocNumber: '11223344',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Yaris',
  vehiclePlate: 'B2C-456',
  alcoholTestResult: 'FAVORABLE',
  version: 4,
  notaryEvaluation: null,
  contract: { id: 'ct-1', documentRef: 'CONTRATO-rent-000', status: 'SIGNED', signedAt: null, createdAt: '', templateVersionId: 'v1' },
  deposit: { id: 'dep-1', originalAmount: '500', currency: 'PEN', status: 'HELD', createdAt: '' },
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

const CHECKLIST_KEY = 'kairos.alquiler.rent-1.checklist';

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/alquileres/rent-1/entrega-04', state: baseContext },
      ]}
    >
      <Routes>
        <Route path="/alquileres/:id/entrega-04" element={<Stage4ChecklistScreen />} />
        <Route path="/alquileres/:id/entrega-05" element={<div>etapa 5</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── suite ───────────────────────────────────────────────────────────────────

describe('Stage4ChecklistScreen (ENTREGA-04 / ALQ-09)', () => {
  beforeEach(() => {
    useRentalWizardMock.mockReset();
    sessionStorage.removeItem(CHECKLIST_KEY);
  });

  afterEach(() => {
    sessionStorage.removeItem(CHECKLIST_KEY);
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

  // ── estado: nominal ───────────────────────────────────────────────────────

  it('renderiza el formulario de checklist en estado READY', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    expect(screen.getByText(/Fotos por zona/)).toBeInTheDocument();
    expect(screen.getByText(/Videos/)).toBeInTheDocument();
    expect(screen.getByText(/Temporizador/)).toBeInTheDocument();
  });

  it('Continuar está deshabilitado sin las fotos y videos mínimos', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  // ── validación: completar checklist habilita Continuar ────────────────────

  it('Continuar se habilita al alcanzar 35 fotos y 3 videos (borrador pre-cargado en sessionStorage)', () => {
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ photosCount: 35, videosCount: 3, technicalMinutes: 35, documentaryMinutes: 20, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled();
  });

  // ── guardado: navegación a etapa 5 ───────────────────────────────────────

  it('navega a etapa 5 al hacer clic en Continuar cuando el checklist está completo', () => {
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ photosCount: 35, videosCount: 3, technicalMinutes: 35, documentaryMinutes: 20, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('etapa 5')).toBeInTheDocument();
  });

  // ── confirmación: modal de excepción de tiempo ───────────────────────────

  it('abre el modal de excepción cuando el tiempo está por debajo del mínimo', () => {
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ photosCount: 35, videosCount: 3, technicalMinutes: 10, documentaryMinutes: 5, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Tiempo por debajo del mínimo/)).toBeInTheDocument();
  });

  it('permite continuar con excepción tras ingresar el motivo en el modal', () => {
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ photosCount: 35, videosCount: 3, technicalMinutes: 10, documentaryMinutes: 5, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    // El modal está abierto; ingresar motivo y confirmar
    const textarea = screen.getByRole('dialog').querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Cliente solicitó acortar la inspección' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con excepción' }));

    expect(screen.getByText('etapa 5')).toBeInTheDocument();
  });

  // ── vacios: contadores parten en 0 ───────────────────────────────────────

  it('los contadores muestran 0 fotos y 0 videos al iniciar sin borrador', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    // "Fotos por zona (0/35)": regex específico para "0/35"
    expect(screen.getByText(/0\/35/)).toBeInTheDocument();
    // "Videos (0/3)": regex con lookahead negativo para no confundir con "0/35"
    expect(screen.getByText(/\/3(?!\d)/)).toBeInTheDocument();
  });

  // ── persistencia de borrador ──────────────────────────────────────────────

  it('incrementar el contador de fotos actualiza el display y guarda en sessionStorage', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    const addButtons = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(addButtons[0]); // primer + corresponde a fotos

    expect(screen.getByText(/1\/35/)).toBeInTheDocument();
    const saved = JSON.parse(sessionStorage.getItem(CHECKLIST_KEY) ?? '{}') as { photosCount: number };
    expect(saved.photosCount).toBe(1);
  });
});
