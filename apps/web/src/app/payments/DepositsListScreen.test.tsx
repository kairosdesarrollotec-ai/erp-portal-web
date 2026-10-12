/**
 * PAG-01 — Pruebas de componente para DepositsListScreen.
 * Fuentes: BDD-PAG-001, SDD-PAG-001, payments.yaml v0.1.0, UX/UI §PAG-01.
 *
 * Estados cubiertos: LOADING, READY, EMPTY, RECOVERABLE_ERROR, navegación.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DepositsListScreen } from './DepositsListScreen';

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock('./payments-client', () => ({
  listDeposits: vi.fn(),
  getDepositsSummary: vi.fn(),
}));

vi.mock('./useWorkContextForPayments', () => ({
  useWorkContextForPayments: vi.fn(),
}));

vi.mock('./payment-permissions', () => ({
  usePaymentPermissions: vi.fn(),
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: vi.fn(() => ({
    currentUser: { getIdToken: vi.fn().mockResolvedValue('test-token') },
  })),
}));

vi.mock('../shared/AppHeader', () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Importaciones después de mocks ─────────────────────────────────────

import { listDeposits, getDepositsSummary } from './payments-client';
import { useWorkContextForPayments } from './useWorkContextForPayments';
import { usePaymentPermissions } from './payment-permissions';

const mockListDeposits = listDeposits as ReturnType<typeof vi.fn>;
const mockGetDepositsSummary = getDepositsSummary as ReturnType<typeof vi.fn>;
const mockUseWorkContext = useWorkContextForPayments as ReturnType<typeof vi.fn>;
const mockUsePaymentPermissions = usePaymentPermissions as ReturnType<typeof vi.fn>;

// ── Fixtures ───────────────────────────────────────────────────────────

const mockContext = { companyId: 'comp-1', branchId: 'branch-1', companyName: 'VeloxRent', branchName: 'Lima' };
const mockSummary = {
  held: 3,
  returned: 10,
  retained: 1,
  partiallyRetained: 2,
  heldAmount: 5000,
  totalAmount: 8000,
};
const mockDeposit = {
  id: 'dep-1',
  rentalCode: 'ALQ-001',
  clientName: 'Test Client',
  originalAmount: 1000,
  netAmount: 900,
  currentStatus: 'HELD',
  createdAt: new Date().toISOString(),
};

// ── Helpers ────────────────────────────────────────────────────────────

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/pagos/garantias']}>
      <DepositsListScreen />
    </MemoryRouter>,
  );
}

// ── Pruebas ────────────────────────────────────────────────────────────

describe('DepositsListScreen (PAG-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUsePaymentPermissions.mockReturnValue({ can: () => true });
  });

  it('LOADING — muestra texto de carga mientras el contexto carga', () => {
    mockUseWorkContext.mockReturnValue({ context: null, loading: true });

    renderScreen();

    expect(screen.getByText('Cargando garantías…')).toBeInTheDocument();
  });

  it('READY — renderiza la tabla con depósitos y las tarjetas de resumen', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockListDeposits.mockResolvedValue({ data: [mockDeposit], hasMore: false });
    mockGetDepositsSummary.mockResolvedValue(mockSummary);

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('ALQ-001')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Client')).toBeInTheDocument();
    // Tarjeta "En custodia" con valor 3 — puede haber más de un "En custodia" (badge + tarjeta)
    const summaryRegion = screen.getByRole('region', { name: /resumen de garantías/i });
    expect(summaryRegion).toBeInTheDocument();
    // El valor "3" debe aparecer en la región de resumen
    expect(summaryRegion).toHaveTextContent('En custodia');
    expect(summaryRegion).toHaveTextContent('3');
  });

  it('EMPTY — muestra mensaje vacío cuando no hay depósitos', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockListDeposits.mockResolvedValue({ data: [], hasMore: false });
    mockGetDepositsSummary.mockResolvedValue(mockSummary);

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Todavía no hay garantías registradas.')).toBeInTheDocument();
    });
  });

  it('RECOVERABLE_ERROR — muestra alerta de error cuando listDeposits rechaza', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockListDeposits.mockRejectedValue(new Error('network'));
    mockGetDepositsSummary.mockResolvedValue(mockSummary);

    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/no pudimos cargar/i);
  });

  it('navegación — clic en "Ver detalle" navega a la ruta del depósito', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockListDeposits.mockResolvedValue({ data: [mockDeposit], hasMore: false });
    mockGetDepositsSummary.mockResolvedValue(mockSummary);

    renderScreen();

    const btn = await screen.findByRole('button', { name: /ver detalle de garantía alq-001/i });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith('/pagos/garantias/dep-1', expect.anything());
  });
});
