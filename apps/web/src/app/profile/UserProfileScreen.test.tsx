import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserProfileScreen } from './UserProfileScreen';
import { useWorkSession } from '../shared/useWorkSession';
import { roleRef } from '../../test/permissions';
import * as profileClientModule from './profile-client';
import * as localDrafts from '../shared/local-drafts';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0 }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let currentUserMock: Record<string, unknown> | null = null;

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    get currentUser() {
      return currentUserMock;
    },
  }),
}));

vi.mock('./profile-client', () => ({ getMyProfile: vi.fn() }));
vi.mock('../shared/local-drafts', () => ({
  getLocalDraftCount: vi.fn(() => 0),
  refreshLocalDraftCount: vi.fn().mockResolvedValue(undefined),
}));
const mockSignOut = vi.fn();
vi.mock('../shared/useSignOut', () => ({ useSignOut: () => mockSignOut }));

function renderProfileScreen(state: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/perfil', state }]}>
      <UserProfileScreen />
    </MemoryRouter>,
  );
}

const apiProfile: profileClientModule.UserProfileResponse = {
  firebaseUid: 'user-kairos-789',
  email: 'carlos.operador@veloxrent.pe',
  displayName: 'Carlos Operador',
  organizationId: 'org-1',
  requiresPasswordChange: false,
  mfaEnrolled: true,
  mfaEnrolledAt: '2026-02-01T10:00:00.000Z',
  assignments: [
    {
      companyId: 'comp-1',
      companyName: 'VeloxRent Perú',
      branchId: 'branch-1',
      branchName: 'Sede Aeropuerto',
      role: { id: 'r-1', name: 'Jefe de Operaciones', key: 'OPS_MANAGER' },
    },
    {
      companyId: 'comp-2',
      companyName: 'Kairos Logistics',
      branchId: 'branch-2',
      branchName: 'Sede Callao',
      role: { id: 'r-2', name: 'Supervisor de Flota', key: null },
    },
  ],
};

describe('UserProfileScreen (TR-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(localDrafts.getLocalDraftCount).mockReturnValue(0);
    useWorkSession.setState({
      role: roleRef('OPS_MANAGER', 'Operations Manager'),
      sidebarOpen: false,
    });
    currentUserMock = {
      uid: 'user-kairos-789',
      metadata: {
        creationTime: '2026-01-10T12:00:00.000Z',
        lastSignInTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      getIdToken: vi.fn().mockResolvedValue('fake-jwt-token'),
    };
    vi.mocked(profileClientModule.getMyProfile).mockResolvedValue(apiProfile);
  });

  it('consulta el endpoint con el idToken y muestra identidad (nombre, correo, UID)', async () => {
    renderProfileScreen();
    await waitFor(() => expect(screen.getByText('Carlos Operador')).toBeInTheDocument());
    expect(profileClientModule.getMyProfile).toHaveBeenCalledWith('fake-jwt-token');
    expect(screen.getByText('carlos.operador@veloxrent.pe')).toBeInTheDocument();
    expect(screen.getByText('user-kairos-789')).toBeInTheDocument();
    expect(screen.getByText('Identidad del Usuario')).toBeInTheDocument();
  });

  it('muestra MFA protegido, contraseña al día y tiempo restante de sesión real', async () => {
    renderProfileScreen();
    await waitFor(() => expect(screen.getByText('Protegido con MFA')).toBeInTheDocument());
    expect(screen.getByText('Al día')).toBeInTheDocument();
    expect(screen.getByText(/^5h 5\dmin restantes$|^6h restantes$/)).toBeInTheDocument();
    expect(screen.queryByText(/8 horas/)).not.toBeInTheDocument();
  });

  it('muestra badges ámbar cuando MFA no está enrolado y la contraseña requiere cambio', async () => {
    vi.mocked(profileClientModule.getMyProfile).mockResolvedValue({
      ...apiProfile,
      mfaEnrolled: false,
      mfaEnrolledAt: null,
      requiresPasswordChange: true,
    });
    renderProfileScreen();
    await waitFor(() => expect(screen.getByText('MFA no configurado')).toBeInTheDocument());
    expect(screen.getByText('Requiere cambio')).toBeInTheDocument();
  });

  it('muestra el contexto activo (empresa/sede de la sesión y rol del store)', async () => {
    renderProfileScreen({ companyName: 'VeloxRent', branchName: 'Lima Norte' });
    const ctx = await screen.findByRole('region', { name: 'Contexto activo' });
    expect(within(ctx).getByText('VeloxRent')).toBeInTheDocument();
    expect(within(ctx).getByText('Lima Norte')).toBeInTheDocument();
    expect(within(ctx).getByText('Operations Manager')).toBeInTheDocument();
  });

  it('usa "—" cuando falta el contexto activo y no inventa empresa ni sede', async () => {
    useWorkSession.setState({ role: null, sidebarOpen: false });
    renderProfileScreen();
    const ctx = await screen.findByRole('region', { name: 'Contexto activo' });
    expect(within(ctx).getAllByText('—')).toHaveLength(3);
    expect(screen.queryByText('Empresa Asignada')).not.toBeInTheDocument();
  });

  it('usa "—" para nombre/correo nulos y tiempo de sesión desconocido', async () => {
    currentUserMock = { uid: 'u', metadata: {}, getIdToken: vi.fn().mockResolvedValue('t') };
    vi.mocked(profileClientModule.getMyProfile).mockResolvedValue({
      ...apiProfile,
      displayName: null,
      email: null,
    });
    renderProfileScreen();
    await screen.findByText('Identidad del Usuario');
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('renderiza el listado de empresas y sedes asignadas con sus roles', async () => {
    renderProfileScreen();
    await waitFor(() => expect(screen.getByText('VeloxRent Perú')).toBeInTheDocument());
    expect(screen.getByText('Sede Aeropuerto')).toBeInTheDocument();
    expect(screen.getByText('Jefe de Operaciones')).toBeInTheDocument();
    expect(screen.getByText('Kairos Logistics')).toBeInTheDocument();
    expect(screen.getByText('Supervisor de Flota')).toBeInTheDocument();
  });

  it('muestra mensaje informativo cuando no hay asignaciones', async () => {
    vi.mocked(profileClientModule.getMyProfile).mockResolvedValue({ ...apiProfile, assignments: [] });
    renderProfileScreen();
    await waitFor(() =>
      expect(screen.getByText('No tienes empresas o sedes asignadas actualmente.')).toBeInTheDocument(),
    );
  });

  it('muestra estado ERROR con reintento cuando el backend falla (sin datos de relleno)', async () => {
    vi.mocked(profileClientModule.getMyProfile)
      .mockRejectedValueOnce(new Error('No se pudo obtener el perfil (500)'))
      .mockResolvedValueOnce(apiProfile);
    renderProfileScreen();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo obtener el perfil (500)');
    expect(screen.queryByText('Identidad del Usuario')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getByText('Carlos Operador')).toBeInTheDocument());
  });

  it('muestra ERROR cuando no hay sesión de Firebase', async () => {
    currentUserMock = null;
    renderProfileScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay sesión de usuario activa.');
    expect(profileClientModule.getMyProfile).not.toHaveBeenCalled();
  });

  it('"Cambiar empresa/sede" navega a /seleccion-empresa-sede', async () => {
    renderProfileScreen({ companyName: 'VeloxRent', branchName: 'Lima Norte' });
    fireEvent.click(await screen.findByRole('button', { name: /Cambiar empresa\/sede/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/seleccion-empresa-sede',
      expect.objectContaining({ state: expect.anything() }),
    );
  });

  it('"Cerrar sesión" sin borradores cierra sesión directamente', async () => {
    renderProfileScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Cerrar sesión" con borradores locales pide confirmación y solo cierra al confirmar', async () => {
    vi.mocked(localDrafts.getLocalDraftCount).mockReturnValue(2);
    renderProfileScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    const dialog = await screen.findByRole('dialog');
    expect(mockSignOut).not.toHaveBeenCalled();
    const confirmBtn = within(dialog).getAllByRole('button').find((b) => /cerrar sesión/i.test(b.textContent ?? ''));
    expect(confirmBtn).toBeDefined();
    fireEvent.click(confirmBtn!);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('el botón Volver navega hacia atrás', async () => {
    renderProfileScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Volver a la página anterior/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
