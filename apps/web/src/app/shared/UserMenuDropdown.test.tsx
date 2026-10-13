import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserMenuDropdown } from './UserMenuDropdown';
import { useWorkSession } from './useWorkSession';
import { roleRef } from '../../test/permissions';
import * as localDraftsModule from './local-drafts';

// Mock de local-drafts para controlar el conteo de borradores por test.
// Por defecto devuelve 0 (TR-08 pendiente).
vi.mock('./local-drafts', () => ({
  getLocalDraftCount: vi.fn(() => 0),
}));

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

const LAST_SIGN_IN = new Date(Date.now() - 3600_000).toUTCString(); // hace 1 hora → ~7h restantes

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      email: 'operador@veloxrent.pe',
      displayName: 'Carlos Operador',
      metadata: { lastSignInTime: LAST_SIGN_IN },
      getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
    },
  }),
}));

function renderDropdown(props = {}, state: Record<string, string> = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/dashboard', state }]}>
      <UserMenuDropdown {...props} />
    </MemoryRouter>,
  );
}

describe('UserMenuDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkSession.setState({ role: roleRef('OPS_MANAGER', 'Operations Manager'), sidebarOpen: false });
    signOutMock.mockResolvedValue(undefined);
  });

  it('renderiza el botón de avatar cerrado por defecto', () => {
    renderDropdown();
    const trigger = screen.getByRole('button', { name: /Menú de perfil y sesión/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('abre el dropdown al hacer clic en el avatar', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Menú de perfil y sesión/i })).toHaveAttribute('aria-expanded', 'true');
  });

  it('muestra el nombre del usuario y el badge de rol cuando está abierto', () => {
    renderDropdown({ role: roleRef('OPS_MANAGER', 'Operations Manager') });
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    expect(screen.getByText('Carlos Operador')).toBeInTheDocument();
    expect(screen.getByText('Operations Manager')).toBeInTheDocument();
  });

  it('usa el rol de la sesión cuando no se pasa prop role', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    expect(screen.getByText('Operations Manager')).toBeInTheDocument();
  });

  it('muestra empresa/sede y botón Cambiar cuando hay state', () => {
    renderDropdown({}, { companyName: 'VeloxRent', branchName: 'Lima Norte' });
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    expect(screen.getByText(/VeloxRent — Lima Norte/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cambiar empresa\/sede/i })).toBeInTheDocument();
  });

  it('no muestra sección empresa/sede cuando no hay state', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    expect(screen.queryByText(/Empresa y sede activa/i)).not.toBeInTheDocument();
  });

  it('muestra el tiempo de sesión restante', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    expect(screen.getByText(/restantes/i)).toBeInTheDocument();
  });

  it('al hacer clic en Cerrar sesión, ejecuta signOut y redirige a /', async () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Cerrar sesión/i }));
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('cierra el dropdown al presionar Escape', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('cierra el dropdown al hacer clic fuera', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('al hacer clic en Cambiar empresa/sede, navega y cierra el dropdown', () => {
    renderDropdown({}, { companyName: 'VeloxRent', branchName: 'Lima Norte' });
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cambiar empresa\/sede/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/seleccion-empresa-sede', expect.objectContaining({ state: expect.anything() }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('muestra el enlace a "Mi Perfil" y navega a /perfil cerrando el dropdown al hacer clic', () => {
    renderDropdown({}, { companyName: 'VeloxRent', branchName: 'Lima Norte' });
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    const profileItem = screen.getByRole('menuitem', { name: /Mi Perfil/i });
    expect(profileItem).toBeInTheDocument();
    fireEvent.click(profileItem);
    expect(mockNavigate).toHaveBeenCalledWith('/perfil', expect.objectContaining({ state: expect.anything() }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  // ── Modal de confirmación de cierre de sesión (TR-09) ────────────────

  it('cuando no hay borradores (count=0), "Cerrar sesión" ejecuta signOut directamente sin mostrar modal', async () => {
    vi.mocked(localDraftsModule.getLocalDraftCount).mockReturnValue(0);
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Cerrar sesión/i }));
    // El modal no debe aparecer
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
    });
  });

  it('cuando hay borradores (count>0), "Cerrar sesión" muestra el modal de confirmación sin cerrar sesión', () => {
    vi.mocked(localDraftsModule.getLocalDraftCount).mockReturnValue(2);
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Cerrar sesión/i }));
    // Modal debe aparecer
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Cerrar sesión ahora/i)).toBeInTheDocument();
    // signOut no debe haberse llamado todavía
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('en el modal, "Cancelar" cierra el modal sin ejecutar signOut', () => {
    vi.mocked(localDraftsModule.getLocalDraftCount).mockReturnValue(1);
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Cerrar sesión/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Cancelar$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('en el modal, "Cerrar sesión de todas formas" ejecuta signOut', async () => {
    vi.mocked(localDraftsModule.getLocalDraftCount).mockReturnValue(3);
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: /Menú de perfil y sesión/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Cerrar sesión/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cerrar sesión de todas formas/i }));
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
    });
  });
});
