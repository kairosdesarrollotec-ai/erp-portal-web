/**
 * REP-01 — Pruebas de componente para ReportsDashboardScreen.
 * Fuentes: BDD-REP-001, SDD-REP-001, TDD-REP-001, reporting.yaml v0.1.0.
 *
 * Estados cubiertos: tab por defecto, LOADING, READY con KPIs, cambio de tab,
 * validación de rango de fechas, botón de exportar CSV, permisos insuficientes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportsDashboardScreen } from './ReportsDashboardScreen';

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock('../shared/AppHeader', () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { getIdToken: vi.fn().mockResolvedValue('test-token') },
  }),
}));

vi.mock('../incidents/useWorkContextForIncidents', () => ({
  useWorkContextForIncidents: vi.fn(),
}));

vi.mock('../shared/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

const mockOperationalKpis = vi.fn();
const mockFinancialKpis = vi.fn();
const mockExportMutate = vi.fn();

vi.mock('./hooks/useReporting', () => ({
  useOperationalKpis: (...args: unknown[]) => mockOperationalKpis(...args),
  useFinancialKpis: (...args: unknown[]) => mockFinancialKpis(...args),
  useExportReport: () => ({
    mutate: mockExportMutate,
    isPending: false,
  }),
}));

// ── Importaciones después de mocks ─────────────────────────────────────

import { useWorkContextForIncidents } from '../incidents/useWorkContextForIncidents';
import { usePermissions } from '../shared/usePermissions';

const mockUseWorkContext = useWorkContextForIncidents as ReturnType<typeof vi.fn>;
const mockUsePermissions = usePermissions as ReturnType<typeof vi.fn>;

// ── Fixtures ───────────────────────────────────────────────────────────

const mockContext = {
  companyId: 'comp-1',
  branchId: 'branch-1',
  companyName: 'VeloxRent',
  branchName: 'Lima',
};

const mockOpKpis = {
  activeRentals: 12,
  pendingReturns: 3,
  availableVehicles: 20,
  activeReservations: 5,
  openIncidents: 2,
  fleetOccupancyRate: 0.37,
  dailyRentals: [
    { date: '2026-10-01', count: 4 },
    { date: '2026-10-02', count: 6 },
  ],
  recentActivity: [],
};

// ── Helpers ────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

function renderScreen() {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/reportes']}>
        <ReportsDashboardScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setupAllPermissions() {
  mockUsePermissions.mockReturnValue({
    can: (module: string, action: string) => {
      const key = `${module}.${action}`;
      return [
        'REPORT.READ_OPERATIONAL',
        'REPORT.READ_FINANCIAL',
        'REPORT.EXPORT',
      ].includes(key);
    },
  });
}

// ── Pruebas ────────────────────────────────────────────────────────────

describe('ReportsDashboardScreen (REP-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAllPermissions();
    mockUseWorkContext.mockReturnValue({ context: mockContext, loading: false });
    // Por defecto los hooks de KPIs retornan estado inactivo
    mockOperationalKpis.mockReturnValue({ isPending: false, isError: false, data: undefined });
    mockFinancialKpis.mockReturnValue({ isPending: false, isError: false, data: undefined });
  });

  it('tab "Operativo" está activo por defecto (aria-selected="true")', () => {
    renderScreen();
    const operativoTab = screen.getByRole('tab', { name: /operativo/i });
    expect(operativoTab).toHaveAttribute('aria-selected', 'true');
    const financieroTab = screen.getByRole('tab', { name: /financiero/i });
    expect(financieroTab).toHaveAttribute('aria-selected', 'false');
  });

  it('LOADING — muestra indicador de carga cuando el hook reporta isPending', async () => {
    mockOperationalKpis.mockReturnValue({ isPending: true, isError: false, data: undefined });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/cargando kpis operativos/i)).toBeInTheDocument();
    });
  });

  it('READY — renderiza tarjetas KPI con los valores del hook', async () => {
    mockOperationalKpis.mockReturnValue({
      isPending: false,
      isError: false,
      data: { kpis: mockOpKpis },
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Alquileres activos')).toBeInTheDocument();
    });

    expect(screen.getByText('12')).toBeInTheDocument(); // activeRentals
    expect(screen.getByText('3')).toBeInTheDocument();  // pendingReturns
    expect(screen.getByText('20')).toBeInTheDocument(); // availableVehicles
    expect(screen.getByText('5')).toBeInTheDocument();  // activeReservations
    expect(screen.getByText('2')).toBeInTheDocument();  // openIncidents
  });

  it('cambio de tab — clic en "Financiero" conmuta el panel activo', async () => {
    renderScreen();

    const financieroTab = screen.getByRole('tab', { name: /financiero/i });
    fireEvent.click(financieroTab);

    expect(financieroTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /operativo/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('validación rango — mostrar mensaje cuando el rango supera 90 días', async () => {
    renderScreen();

    const inputFrom = screen.getByLabelText(/desde/i);
    const inputTo = screen.getByLabelText(/hasta/i);

    fireEvent.change(inputFrom, { target: { value: '2026-01-01' } });
    fireEvent.change(inputTo, { target: { value: '2026-12-31' } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/rango máximo/i);
  });

  it('exportar CSV — clic en botón llama a mutate del hook', async () => {
    renderScreen();

    const exportBtn = screen.getByRole('button', { name: /exportar datos como csv/i });
    fireEvent.click(exportBtn);

    expect(mockExportMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'comp-1',
        branchId: 'branch-1',
        type: 'combined',
      }),
    );
  });

  it('permisos insuficientes — muestra "Acceso restringido" si no tiene ningún permiso de reportes', () => {
    mockUsePermissions.mockReturnValue({ can: () => false });

    renderScreen();

    expect(screen.getByRole('alert')).toHaveTextContent(/acceso restringido/i);
  });

  it('sesión vencida / sin usuario — context null muestra estado sin KPIs (no crash)', () => {
    mockUseWorkContext.mockReturnValue({ context: null, loading: false });

    // No debe lanzar excepción y la pantalla debe renderizarse
    expect(() => renderScreen()).not.toThrow();
  });
});
