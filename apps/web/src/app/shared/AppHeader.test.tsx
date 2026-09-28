import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { useWorkSession } from './useWorkSession';

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

vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 2 }),
}));

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkSession.setState({ role: 'FRONT_OFFICE', sidebarOpen: false });
    signOutMock.mockResolvedValue(undefined);
  });

  it('muestra la marca, el correo del usuario y el botón de cerrar sesión', () => {
    render(
      <MemoryRouter>
        <AppHeader pageTitle="Tablero de Operaciones" role="FRONT_OFFICE" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Tablero de Operaciones')).toBeInTheDocument();
    expect(screen.getByText('operador@veloxrent.pe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cerrar sesión/i })).toBeInTheDocument();
  });

  it('al hacer clic en cerrar sesión, ejecuta signOut, limpia sesión y redirige a /', async () => {
    render(
      <MemoryRouter>
        <AppHeader />
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
});
