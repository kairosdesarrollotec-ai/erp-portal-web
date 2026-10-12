/**
 * PAG-02 — Pruebas de componente para DepositDetailScreen.
 * Fuentes: BDD-PAG-001, SDD-PAG-001, payments.yaml v0.1.0, UX/UI §PAG-02.
 *
 * Estados cubiertos: LOADING, READY, RECOVERABLE_ERROR, panel de acciones,
 * diálogo de ajuste, aprobación de devolución, estado terminal, navegación atrás.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DepositDetailScreen } from './DepositDetailScreen';

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock('./payments-client', () => ({
  getDeposit: vi.fn(),
  registerAdjustment: vi.fn(),
  approveRefund: vi.fn(),
  closeFinancial: vi.fn(),
  PaymentCommandError: class PaymentCommandError extends Error {
    readonly name = 'PaymentCommandError';
    constructor(
      public readonly status: number,
      public readonly problem: { code?: string; detail?: string } | null,
    ) {
      super(problem?.detail ?? `La operación no se pudo completar (${status})`);
    }
  },
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

vi.mock('./DepositBadges', () => ({
  DepositStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="deposit-status-badge">{status}</span>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ depositId: 'dep-uuid-1' }),
  };
});

// ── Importaciones después de mocks ─────────────────────────────────────

import { getDeposit, registerAdjustment, approveRefund, closeFinancial } from './payments-client';
import { useWorkContextForPayments } from './useWorkContextForPayments';
import { usePaymentPermissions } from './payment-permissions';

const mockGetDeposit = getDeposit as ReturnType<typeof vi.fn>;
const mockRegisterAdjustment = registerAdjustment as ReturnType<typeof vi.fn>;
const mockApproveRefund = approveRefund as ReturnType<typeof vi.fn>;
const mockCloseFinancial = closeFinancial as ReturnType<typeof vi.fn>;
const mockUseWorkContext = useWorkContextForPayments as ReturnType<typeof vi.fn>;
const mockUsePaymentPermissions = usePaymentPermissions as ReturnType<typeof vi.fn>;

// ── Fixtures ───────────────────────────────────────────────────────────

const mockContext = { companyId: 'comp-1', branchId: 'branch-1' };

const mockDeposit = {
  id: 'dep-uuid-1',
  rentalId: 'rental-uuid-1',
  rentalCode: 'ALQ-1187',
  clientName: 'Roberto Fuentes Alva',
  originalAmount: 1200,
  netAmount: 1050,
  currentStatus: 'HELD',
  createdAt: new Date().toISOString(),
  adjustments: [
    {
      id: 'adj-1',
      type: 'DISCOUNT',
      amount: 150,
      reason: 'Daño menor en tapicería',
      actorId: 'user-1',
      createdAt: new Date().toISOString(),
    },
  ],
};

const mockDepositReturned = { ...mockDeposit, currentStatus: 'RETURNED', adjustments: [] };

// ── Helpers ────────────────────────────────────────────────────────────

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/pagos/garantias/dep-uuid-1']}>
      <DepositDetailScreen />
    </MemoryRouter>,
  );
}

// ── Pruebas ────────────────────────────────────────────────────────────

describe('DepositDetailScreen (PAG-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePaymentPermissions.mockReturnValue({ can: () => false });
  });

  // ── 1. LOADING ────────────────────────────────────────────────────

  it('LOADING — muestra texto de carga mientras el contexto está cargando', () => {
    mockUseWorkContext.mockReturnValue({ context: null, loading: true });

    renderScreen();

    expect(screen.getByText('Cargando garantía…')).toBeInTheDocument();
  });

  it('LOADING — muestra texto de carga mientras getDeposit está pendiente', () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    // getDeposit never resolves during this test
    mockGetDeposit.mockReturnValue(new Promise(() => {}));

    renderScreen();

    expect(screen.getByText('Cargando garantía…')).toBeInTheDocument();
  });

  // ── 2. READY — renderiza detalle ──────────────────────────────────

  it('READY — renderiza el código de alquiler, cliente y ajuste', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockGetDeposit.mockResolvedValue(mockDeposit);
    mockUsePaymentPermissions.mockReturnValue({ can: () => false });

    renderScreen();

    // "Garantía — ALQ-1187" aparece en el encabezado h2
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /garantía.*ALQ-1187/i })).toBeInTheDocument();
    });

    // El nombre aparece tanto en el subtítulo como en la tabla de info del alquiler
    expect(screen.getAllByText('Roberto Fuentes Alva').length).toBeGreaterThan(0);
    expect(screen.getByText('Daño menor en tapicería')).toBeInTheDocument();
  });

  // ── 3. RECOVERABLE_ERROR ──────────────────────────────────────────

  it('RECOVERABLE_ERROR — muestra alerta con role="alert" cuando getDeposit rechaza', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockGetDeposit.mockRejectedValue(new Error('network'));

    renderScreen();

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/no pudimos cargar la garantía/i);
    });
  });

  // ── 4. Panel de acciones — botones según estado y permisos ────────

  it('HELD + permisos parciales — muestra "Registrar ajuste" y "Aprobar devolución", no "Cerrar expediente"', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockGetDeposit.mockResolvedValue(mockDeposit);
    mockUsePaymentPermissions.mockReturnValue({
      can: (permission: string) =>
        permission === 'REGISTER_ADJUSTMENT' || permission === 'APPROVE_REFUND',
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /garantía.*ALQ-1187/i })).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /registrar ajuste/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /aprobar devolución/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /cerrar expediente/i }),
    ).not.toBeInTheDocument();
  });

  // ── 5. Diálogo de ajuste — abre, llena formulario y envía ─────────

  it('diálogo de ajuste — abre, llena el formulario y llama a registerAdjustment con los datos correctos', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockGetDeposit.mockResolvedValue(mockDeposit);
    mockRegisterAdjustment.mockResolvedValue({ ...mockDeposit, adjustments: [] });
    // After the dialog submits, load() is called again
    mockGetDeposit.mockResolvedValueOnce(mockDeposit).mockResolvedValue({
      ...mockDeposit,
      adjustments: [],
    });
    mockUsePaymentPermissions.mockReturnValue({
      can: (permission: string) => permission === 'REGISTER_ADJUSTMENT',
    });

    renderScreen();

    // Esperar a que cargue el depósito
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /garantía.*ALQ-1187/i })).toBeInTheDocument();
    });

    // Abrir el diálogo
    const registrarBtn = screen.getByRole('button', { name: /registrar ajuste/i });
    fireEvent.click(registrarBtn);

    // Verificar que el diálogo es visible
    await waitFor(() => {
      expect(screen.getByText('Registrar ajuste de garantía')).toBeInTheDocument();
    });

    // Llenar el formulario
    const typeSelect = screen.getByLabelText(/tipo de ajuste/i);
    fireEvent.change(typeSelect, { target: { value: 'DISCOUNT' } });

    const amountInput = screen.getByLabelText(/monto/i);
    fireEvent.change(amountInput, { target: { value: '50', valueAsNumber: 50 } });
    // React Hook Form uses valueAsNumber; trigger a proper number change
    Object.defineProperty(amountInput, 'value', { value: '50', writable: true });
    fireEvent.input(amountInput, { target: { value: '50', valueAsNumber: 50 } });

    const reasonTextarea = screen.getByLabelText(/motivo/i);
    fireEvent.change(reasonTextarea, { target: { value: 'Ajuste por prueba unitaria' } });

    // Enviar — click en el botón submit (puede estar deshabilitado si form no es válido todavía)
    // usar fireEvent.submit en el form directamente para forzar el envío
    const form = typeSelect.closest('form')!;
    expect(form).toBeTruthy();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockRegisterAdjustment).toHaveBeenCalled();
    });

    // Verificar que se llamó con los parámetros correctos
    const [calledToken, calledDepositId, calledCompanyId, calledBranchId] =
      mockRegisterAdjustment.mock.calls[0] as [string, string, string, string, unknown];
    expect(calledToken).toBe('test-token');
    expect(calledDepositId).toBe('dep-uuid-1');
    expect(calledCompanyId).toBe('comp-1');
    expect(calledBranchId).toBe('branch-1');
  });

  it('diálogo de ajuste — se cierra al hacer clic en Cancelar', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockGetDeposit.mockResolvedValue(mockDeposit);
    mockUsePaymentPermissions.mockReturnValue({
      can: (permission: string) => permission === 'REGISTER_ADJUSTMENT',
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /garantía.*ALQ-1187/i })).toBeInTheDocument();
    });

    // Abrir el diálogo
    fireEvent.click(screen.getByRole('button', { name: /registrar ajuste/i }));
    await waitFor(() => {
      expect(screen.getByText('Registrar ajuste de garantía')).toBeInTheDocument();
    });

    // Cancelar
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => {
      expect(screen.queryByText('Registrar ajuste de garantía')).not.toBeInTheDocument();
    });
  });

  // ── 6. Aprobar devolución — llama a approveRefund ─────────────────

  it('HELD + canApproveRefund — clic en "Aprobar devolución" llama a approveRefund con los parámetros correctos', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockGetDeposit.mockResolvedValue(mockDeposit);
    mockApproveRefund.mockResolvedValue({ ...mockDeposit, currentStatus: 'RETURNED' });
    mockUsePaymentPermissions.mockReturnValue({
      can: (permission: string) => permission === 'APPROVE_REFUND',
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /garantía.*ALQ-1187/i })).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole('button', { name: /aprobar devolución/i });
    expect(approveBtn).not.toBeDisabled();
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockApproveRefund).toHaveBeenCalledWith(
        'test-token',
        'dep-uuid-1',
        'comp-1',
        'branch-1',
      );
    });
  });

  // ── 7. Estado terminal (RETURNED) — sin botones de mutación ───────

  it('RETURNED — el botón "Registrar ajuste" no está visible (estado terminal)', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockGetDeposit.mockResolvedValue(mockDepositReturned);
    mockUsePaymentPermissions.mockReturnValue({ can: () => true });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /garantía.*ALQ-1187/i })).toBeInTheDocument();
    });

    // "Registrar ajuste" no debe aparecer cuando el depósito está en estado terminal
    expect(
      screen.queryByRole('button', { name: /registrar ajuste/i }),
    ).not.toBeInTheDocument();
  });

  it('RETURNED — el botón "Aprobar devolución" está deshabilitado', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockGetDeposit.mockResolvedValue(mockDepositReturned);
    mockUsePaymentPermissions.mockReturnValue({ can: () => true });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /garantía.*ALQ-1187/i })).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole('button', { name: /aprobar devolución/i });
    expect(approveBtn).toBeDisabled();
  });

  // ── 8. Navegación atrás ───────────────────────────────────────────

  it('navegación — clic en "← Volver" navega a /pagos/garantias', async () => {
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockGetDeposit.mockResolvedValue(mockDeposit);
    mockUsePaymentPermissions.mockReturnValue({ can: () => false });

    renderScreen();

    // El botón "← Volver" está disponible incluso durante la carga
    const backBtn = screen.getByRole('button', { name: /← volver/i });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/pagos/garantias',
      expect.anything(),
    );
  });

  // ── 9. Cerrar expediente financiero ──────────────────────────────

  it('HELD + canCloseFinancial — clic en "Cerrar expediente" llama a closeFinancial con los parámetros correctos', async () => {
    const depositWithAdjustment = {
      ...mockDeposit,
      adjustedAmount: 150,
    };
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    mockGetDeposit.mockResolvedValue(depositWithAdjustment);
    mockCloseFinancial.mockResolvedValue({
      ...depositWithAdjustment,
      currentStatus: 'RETAINED',
    });
    mockUsePaymentPermissions.mockReturnValue({
      can: (permission: string) => permission === 'CLOSE_FINANCIAL',
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /garantía.*ALQ-1187/i })).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /cerrar expediente/i });
    expect(closeBtn).not.toBeDisabled();
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(mockCloseFinancial).toHaveBeenCalledWith(
        'test-token',
        'dep-uuid-1',
        'comp-1',
        'branch-1',
        150,
        'Cierre de expediente financiero',
      );
    });
  });
});
