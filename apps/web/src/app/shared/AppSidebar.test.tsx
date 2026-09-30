import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
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

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkSession.setState({ role: 'FRONT_OFFICE', sidebarOpen: true });
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
});
