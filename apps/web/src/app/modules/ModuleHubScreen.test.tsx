/**
 * TR-11 — ModuleHubScreen tests (HU-25)
 * Baseline visual: PROTO-TR-11-MENU-MODULOS + PROTO-TR-11-MENU-MODULOS-MOVIL
 *
 * Cubre:
 *  - LOADING: muestra texto de carga
 *  - READY (permisos ADMIN.*, RECRUITMENT.* y HR_ADMINISTRATION.*): 13 tarjetas visibles, admin card presente
 *  - READY (sin permisos ADMIN.*, RECRUITMENT.* ni HR_ADMINISTRATION.*): 10 tarjetas (Admin, Personal y Reclutamiento ocultas)
 *  - La visibilidad se decide por permisos (INCIDENT.VIEW, ADMIN.*), no por rol
 *  - Módulo no implementado: card deshabilitada con "Próximamente"
 *  - Módulo implementado: link navegable
 *  - UNRESOLVED: mensaje de error
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
import { ModuleHubScreen } from './ModuleHubScreen';
import { clearPermissions, roleRef, setPermissions, INCIDENT_VIEW_ONLY } from '../../test/permissions';

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
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(INCIDENT_VIEW_ONLY);
  });

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

  it('muestra 13 módulos a quien tiene permisos de Administración, Reclutamiento, Personal, Pagos y Reportes', () => {
    setPermissions([
      ...INCIDENT_VIEW_ONLY,
      'ADMIN.MANAGE_USERS',
      'RECRUITMENT.VIEW_VACANCY',
      'HR_ADMINISTRATION.VIEW_EMPLOYEES',
      'PAYMENT.READ_LIST',
      'REPORT.READ_OPERATIONAL',
    ]);
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('ADMINISTRACION') });
    renderHub();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(13);
  });

  it('muestra 10 módulos a quien no tiene permisos de Admin, Reclutamiento ni Personal pero sí de Pagos y Reportes', () => {
    setPermissions([...INCIDENT_VIEW_ONLY, 'PAYMENT.READ_LIST', 'REPORT.READ_OPERATIONAL']);
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('FRONT_OFFICE') });
    renderHub();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(10);
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('muestra 8 módulos a quien no tiene permisos de Admin, Reclutamiento, Personal, Pagos ni Reportes', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('FRONT_OFFICE') });
    renderHub();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(8);
    expect(screen.queryByText('Admin')).toBeNull();
  });

  it('muestra Devoluciones como link navegable a /devoluciones', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('FRONT_OFFICE') });
    renderHub();
    expect(screen.getByRole('link', { name: /devoluciones/i }).getAttribute('href')).toBe('/devoluciones');
  });

  it('muestra Tablero, Consultas, Reservas, Clientes y Flota como links navegables', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('FRONT_OFFICE') });
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

  it('ya no quedan módulos "Próximamente": Pagos y Reportes tienen ruta y se muestran solo con permiso', () => {
    setPermissions([...INCIDENT_VIEW_ONLY, 'PAYMENT.READ_LIST', 'REPORT.READ_OPERATIONAL']);
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('FRONT_OFFICE') });
    renderHub();
    expect(screen.queryAllByText(/próximamente/i)).toHaveLength(0);
    expect(screen.getByRole('link', { name: /pagos y garantías/i }).getAttribute('href')).toBe('/pagos/garantias');
    expect(screen.getByRole('link', { name: /reportes/i }).getAttribute('href')).toBe('/reportes');
  });

  it('Personal lleva a ADP-01 (/personal) y solo se muestra con HR_ADMINISTRATION.VIEW_EMPLOYEES', () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef(null, 'Analista de personal') });
    renderHub();
    expect(screen.getByRole('link', { name: 'Personal' }).getAttribute('href')).toBe('/personal');
    expect(screen.queryByRole('link', { name: 'Reclutamiento' })).toBeNull();
  });

  it('Personal se oculta a quien no tiene permisos de Administración de Personal', () => {
    setPermissions(['INCIDENT.VIEW', 'RECRUITMENT.VIEW_VACANCY']);
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('FRONT_OFFICE') });
    renderHub();
    expect(screen.queryByRole('link', { name: 'Personal' })).toBeNull();
  });

  it('Reclutamiento es una tarjeta separada que lleva a /reclutamiento y requiere RECRUITMENT.VIEW_VACANCY', () => {
    setPermissions(['RECRUITMENT.VIEW_VACANCY']);
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef(null, 'Analista de selección') });
    renderHub();
    expect(screen.getByRole('link', { name: 'Reclutamiento' }).getAttribute('href')).toBe('/reclutamiento');
    expect(screen.queryByRole('link', { name: 'Personal' })).toBeNull();
  });

  it('Reclutamiento se oculta a quien no tiene permisos de Reclutamiento', () => {
    setPermissions(['INCIDENT.VIEW']);
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('FRONT_OFFICE') });
    renderHub();
    expect(screen.queryByRole('link', { name: 'Reclutamiento' })).toBeNull();
  });

  it('Incidencias es un módulo habilitado que lleva a /incidencias', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('FRONT_OFFICE') });
    renderHub();
    const link = screen.getByRole('link', { name: 'Incidencias' });
    expect(link.getAttribute('href')).toBe('/incidencias');
  });

  it('Incidencias se oculta a quien no tiene INCIDENT.VIEW', () => {
    setPermissions([]);
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('RRHH') });
    renderHub();
    expect(screen.queryByRole('link', { name: 'Incidencias' })).toBeNull();
  });

  it('Admin aparece con cualquiera de las acciones ADMIN.* (p. ej. solo VIEW_AUDIT)', () => {
    setPermissions(['ADMIN.VIEW_AUDIT']);
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef(null, 'Auditor externo') });
    renderHub();
    expect(screen.getByRole('link', { name: 'Admin' })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Incidencias' })).toBeNull();
  });

  it('un rol personalizado con solo INCIDENT.VIEW ve Incidencias pero no Admin', () => {
    setPermissions(['INCIDENT.VIEW']);
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef(null, 'Supervisor de incidencias') });
    renderHub();
    expect(screen.getByRole('link', { name: 'Incidencias' })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
  });

  it('mientras los permisos cargan o si fallan, los módulos restringidos se ocultan (deny-by-default)', () => {
    clearPermissions();
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('ADMINISTRACION') });
    renderHub();
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Incidencias' })).toBeNull();
    // Los módulos sin restricción siguen visibles.
    expect(screen.getByRole('link', { name: /devoluciones/i })).toBeDefined();
  });

  it('muestra el label de sede en el header', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('GERENCIA') });
    renderHub({ companyName: 'VeloxRent', branchName: 'Ayacucho Central', companyId: 'c1', branchId: 'b1' });
    expect(screen.getByText('VeloxRent — Ayacucho Central')).toBeDefined();
  });

  it('muestra el título de la página', () => {
    mockUseModuleHub.mockReturnValue({ ...baseReady, role: roleRef('GERENCIA') });
    renderHub();
    expect(screen.getByRole('heading', { name: /módulos del sistema/i })).toBeDefined();
  });
});
