import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Stage5ConfirmationScreen } from './Stage5ConfirmationScreen';

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

const completeDeliveryMock = vi.fn();
const listRentalEvidenceMock = vi.fn();
vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    completeDelivery: (...args: unknown[]) => completeDeliveryMock(...args),
    listRentalEvidence: (...args: unknown[]) => listRentalEvidenceMock(...args),
  };
});

// ── fixtures ────────────────────────────────────────────────────────────────

const baseRental = {
  id: 'rent-1',
  status: 'PENDING_DELIVERY',
  customerName: 'Pedro Ramirez',
  customerDocNumber: '55667788',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehiclePlate: 'C3D-789',
  alcoholTestResult: 'FAVORABLE',
  version: 5,
  notaryEvaluation: {
    id: 'ne-1',
    policyVersion: 1,
    result: 'MANDATORY',
    reason: 'Obligatoria por modelo',
    evaluatedAt: '2024-01-01T00:00:00Z',
    approvedBy: null,
    justification: null,
  },
  contract: {
    id: 'ct-1',
    documentRef: 'CONTRATO-rent-000',
    status: 'SIGNED',
    signedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    templateVersionId: 'v1',
  },
  deposit: { id: 'dep-1', originalAmount: '500', currency: 'PEN', status: 'HELD', createdAt: '' },
};

const baseContext = {
  companyId: 'c1',
  companyName: 'VeloxRent',
  branchId: 'b1',
  branchName: 'Sede Central',
};

const CHECKLIST_KEY = 'kairos.alquiler.rent-1.checklist';

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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          { pathname: '/alquileres/rent-1/entrega-05', state: baseContext },
        ]}
      >
        <Routes>
          <Route path="/alquileres/:id/entrega-05" element={<Stage5ConfirmationScreen />} />
          <Route path="/alquileres" element={<div>bandeja de alquileres</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── suite ───────────────────────────────────────────────────────────────────

describe('Stage5ConfirmationScreen (ENTREGA-05 / ALQ-09)', () => {
  beforeEach(() => {
    completeDeliveryMock.mockReset();
    useRentalWizardMock.mockReset();
    listRentalEvidenceMock.mockReset();
    listRentalEvidenceMock.mockResolvedValue([]);
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

  it('muestra mensaje de error cuando state es NOT_FOUND', () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ state: 'NOT_FOUND', rental: null, context: null }));
    renderScreen();
    expect(screen.getByText(/No pudimos cargar el expediente/)).toBeInTheDocument();
  });

  // ── estado: nominal — resumen de las 4 etapas ─────────────────────────────

  it('muestra el resumen del cliente y del contrato en estado READY', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    expect(screen.getByText(/Pedro Ramirez/)).toBeInTheDocument();
    expect(screen.getByText(/55667788/)).toBeInTheDocument();
    expect(screen.getByText(/CONTRATO-rent-000/)).toBeInTheDocument();
    expect(screen.getByText(/500 PEN/)).toBeInTheDocument();
  });

  it('muestra el resumen de evidencia (fotos y videos) leído del backend', async () => {
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => ({
        id: `ev-p-${i}`,
        rentalId: 'rent-1',
        type: 'PHOTO' as const,
        zone: 'FRONTAL' as const,
        objectUrl: `https://storage.googleapis.com/bucket/p-${i}.jpg`,
        uploadedBy: 'uid-1',
        uploadedAt: new Date().toISOString(),
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `ev-v-${i}`,
        rentalId: 'rent-1',
        type: 'VIDEO' as const,
        zone: 'FRONTAL' as const,
        objectUrl: `https://storage.googleapis.com/bucket/v-${i}.mp4`,
        uploadedBy: 'uid-1',
        uploadedAt: new Date().toISOString(),
      })),
    ]);
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    expect(await screen.findByText(/35 fotos/)).toBeInTheDocument();
    expect(screen.getByText(/3 videos/)).toBeInTheDocument();
  });

  // ── confirmación: modal ───────────────────────────────────────────────────

  it('abre el modal de confirmación al hacer clic en "Confirmar entrega"', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Confirmar la entrega/)).toBeInTheDocument();
    expect(screen.getByText(/Esta acción es irreversible/)).toBeInTheDocument();
  });

  it('cierra el modal al hacer clic en Cancelar', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ── guardado: complete-delivery exitoso ───────────────────────────────────

  it('llama a completeDelivery con datos del borrador y navega a la bandeja', async () => {
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ photosCount: 35, videosCount: 3, technicalMinutes: 35, documentaryMinutes: 20, exceptionReason: '', notes: 'Sin novedades' }),
    );
    const setRentalMock = vi.fn();
    useRentalWizardMock.mockReturnValue(makeWizard({ setRental: setRentalMock }));
    completeDeliveryMock.mockResolvedValue({ ...baseRental, status: 'ACTIVE', version: 6 });

    renderScreen();

    // Clic en el botón principal abre el modal
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    // Clic en el botón de confirmación dentro del diálogo
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar entrega' }));

    expect(await screen.findByText('bandeja de alquileres')).toBeInTheDocument();
    expect(setRentalMock).toHaveBeenCalled();
    expect(completeDeliveryMock).toHaveBeenCalledWith(
      'tok',
      'rent-1',
      'c1',
      'b1',
      5,
      expect.stringContaining('Sin novedades'),
    );
    // Borrador debe haberse limpiado
    expect(sessionStorage.getItem(CHECKLIST_KEY)).toBeNull();
  });

  // ── error de API ──────────────────────────────────────────────────────────

  it('muestra el detail del RentalCommandError cuando completeDelivery rechaza', async () => {
    const { RentalCommandError } = await import('./rentals-client');
    useRentalWizardMock.mockReturnValue(makeWizard());
    completeDeliveryMock.mockRejectedValue(
      new RentalCommandError(409, { code: 'VERSION_MISMATCH', detail: 'El expediente fue modificado por otro usuario' }),
    );

    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar entrega' }));

    expect(
      await screen.findByText('El expediente fue modificado por otro usuario'),
    ).toBeInTheDocument();
  });

  it('muestra mensaje genérico cuando el error no es RentalCommandError', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    completeDeliveryMock.mockRejectedValue(new Error('Network'));

    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar entrega' }));

    expect(await screen.findByText(/No pudimos confirmar la entrega/)).toBeInTheDocument();
  });
});
