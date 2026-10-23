import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useWorkSession } from './useWorkSession';
import { clearPermissions, setPermissions, INCIDENT_VIEW_ONLY } from '../../test/permissions';

const signOutMock = vi.fn();
const mockNavigate = vi.fn();

vi.mock('firebase/auth', () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      email: 'operador@veloxrent.pe',
      getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
    },
  }),
}));

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPermissions();
    setPermissions(INCIDENT_VIEW_ONLY);
    useWorkSession.setState({ sidebarOpen: true });
    signOutMock.mockResolvedValue(undefined);
  });

  it('muestra la navegación de módulos y el pie con Cambiar sede y Cerrar sesión', () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText('Módulos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cambiar sede/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cerrar sesión/i })).toBeInTheDocument();
  });

  it('TR-08: el enlace «Sincronización» solo aparece para supervisores (resolver conflictos)', () => {
    const { unmount } = render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /Sincronización/ })).not.toBeInTheDocument();
    unmount();

    setPermissions(['SYNC.SUPERVISE_CONFLICTS']);
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Sincronización/ })).toHaveAttribute('href', '/sincronizacion');
  });

  it('al hacer clic en cerrar sesión en el sidebar, ejecuta signOut, limpia sesión y redirige a /', async () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );

    const logoutButton = screen.getByRole('button', { name: /Cerrar sesión/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(useWorkSession.getState().role).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('muestra el ítem Incidencias según permiso INCIDENT.VIEW', () => {
    const { unmount } = render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Incidencias/ })).toHaveAttribute('href', '/incidencias');
    unmount();

    setPermissions([]);
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /Incidencias/ })).toBeNull();
  });

  it('el ítem Admin aparece solo con algún permiso ADMIN.* y no mientras los permisos cargan', () => {
    clearPermissions();
    const { unmount } = render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /Admin/ })).toBeNull();
    unmount();

    setPermissions(['ADMIN.MANAGE_PERMISSIONS']);
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Admin/ })).toHaveAttribute('href', '/admin/usuarios');
  });
});
