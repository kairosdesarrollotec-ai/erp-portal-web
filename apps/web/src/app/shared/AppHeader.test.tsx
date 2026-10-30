import { describe, it, expect, vi, beforeEach } from 'vitest';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('./GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { useWorkSession } from './useWorkSession';
import { roleRef } from '../../test/permissions';

vi.mock('firebase/auth', () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      email: 'operador@veloxrent.pe',
      displayName: 'Carlos Operador',
      metadata: { lastSignInTime: new Date(Date.now() - 3600_000).toUTCString() },
      getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
    },
  }),
}));

vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 2 }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkSession.setState({ role: roleRef('FRONT_OFFICE', 'Front Office'), sidebarOpen: false });
  });

  it('muestra la marca y el título de página', () => {
    render(
      <MemoryRouter>
        <AppHeader pageTitle="Tablero de Operaciones" role={roleRef('FRONT_OFFICE', 'Front Office')} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Tablero de Operaciones')).toBeInTheDocument();
    expect(screen.getByLabelText(/ir al inicio/i)).toBeInTheDocument();
  });

  it('renderiza el botón del menú de perfil (avatar)', () => {
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /Menú de perfil y sesión/i })).toBeInTheDocument();
  });

  it('renderiza el botón de notificaciones', () => {
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /Notificaciones/i })).toBeInTheDocument();
  });

  it('muestra el badge de empresa/sede cuando viene en location.state', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/dashboard', state: { companyName: 'VeloxRent', branchName: 'Lima Norte' } }]}>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.getByText(/VeloxRent — Lima Norte/)).toBeInTheDocument();
  });
});

describe('AppHeader - V-21 campana sin empresa y sede', () => {
  it('sin empresa/sede en el contexto la campana avisa que hay que elegir sede (en vez de no hacer nada)', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Elige una empresa y sede/);
    expect(screen.getByRole('button', { name: 'Elegir sede' })).toBeInTheDocument();
  });
});
