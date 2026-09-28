/**
 * TR-11 — ModuleHubScreen tests (HU-25)
 * Baseline visual: PROTO-TR-11-MENU-MODULOS + PROTO-TR-11-MENU-MODULOS-MOVIL
 *
 * Cubre:
 *  - LOADING: muestra texto de carga
 *  - READY (admin): 12 tarjetas visibles, admin card presente
 *  - READY (operador): 11 tarjetas (admin card oculta)
 *  - Módulo no implementado: card deshabilitada con "Próximamente"
 *  - Módulo implementado: link navegable
 *  - UNRESOLVED: mensaje de error
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModuleHubScreen } from './ModuleHubScreen';

vi.mock('./useModuleHub');
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'test@veloxrent.pe' } }),
}));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));

const { useModuleHub } = await import('./useModuleHub');
const mockUseModuleHub = vi.mocked(useModuleHub);

const baseReady = {
  state: 'READY' as const,
  branchLabel: 'VeloxRent — Ayacucho Central',
  companyId: 'c1',
  branchId: 'b1',
};

function renderHub(locationState?: Record<string, unknown>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/modulos', state: locationState ?? {} }]}>
      <ModuleHubScreen />
    </MemoryRouter>,
  );
}

describe('ModuleHubScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra texto de carga en estado LOADING', () => {
    mockUseModuleHub.mockReturnValue({ state: 'LOADING', role: null, branchLabel: null, companyId: null, branchId: null });
    renderHub();
    expect(screen.getByText(/cargando módulos/i)).toBeDefined();
  });

  it('muestra error en estado UNRESOLVED', () => {
    mockUseModuleHub.mockReturnValue({ state: 'UNRESOLVED', role: null, branchLabel: null, companyId: null, branchId: null });
    renderHub();
    expect(screen.getByText(/no pudimos determinar/i)).toBeDefined();
  });

  it('muestra 12 módulos para rol ADMINISTRACION', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: 'ADMINISTRACION' });
    renderHub();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(12);
  });

  it('muestra 11 módulos para rol FRONT_OFFICE (sin Admin)', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: 'FRONT_OFFICE' });
    renderHub();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(11);
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('muestra Tablero, Consultas, Reservas, Clientes y Flota como links navegables', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: 'FRONT_OFFICE' });
    renderHub();
    const tableroPaths = screen.getAllByRole('link', { name: /tablero/i });
    expect(tableroPaths.length).toBeGreaterThan(0);
    const consultas = screen.getByRole('link', { name: /consultas/i });
    expect(consultas).toBeDefined();
    const reservas = screen.getByRole('link', { name: /reservas/i });
    expect(reservas).toBeDefined();
    const clientes = screen.getByRole('link', { name: /clientes/i });
    expect(clientes).toBeDefined();
    const flota = screen.getByRole('link', { name: /flota/i });
    expect(flota).toBeDefined();
  });

  it('muestra badge "Próximamente" para módulos no implementados', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: 'FRONT_OFFICE' });
    renderHub();
    const badges = screen.getAllByText(/próximamente/i);
    // Módulos sin ruta implementada (Alquileres, Devoluciones,
    // Pagos, Incidentes, Personal, Reportes) = 6 sin admin
    expect(badges.length).toBe(6);
  });

  it('muestra el label de sede en el header', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: 'GERENCIA' });
    renderHub({ companyName: 'VeloxRent', branchName: 'Ayacucho Central', companyId: 'c1', branchId: 'b1' });
    expect(screen.getByText('VeloxRent — Ayacucho Central')).toBeDefined();
  });

  it('muestra el título de la página', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: 'GERENCIA' });
    renderHub();
    expect(screen.getByRole('heading', { name: /módulos del sistema/i })).toBeDefined();
  });
});
