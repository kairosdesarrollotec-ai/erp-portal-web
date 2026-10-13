/**
 * BUS-01 — pruebas del componente GlobalSearch.
 * Sigue el patrón de NotificationsPanel.test.tsx: mock de funciones
 * del cliente de dominio.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalSearch } from './GlobalSearch';

// ── Mocks ──────────────────────────────────────────────────────────────

// Restore the real useGlobalSearch implementation so tests can exercise
// the actual hook behavior (debounce, useQuery) with the mocked search client.
// The global setup.ts mock returns a static idle state for all other test files
// that don't need to interact with GlobalSearch.
vi.mock('./useGlobalSearch', async () => vi.importActual('./useGlobalSearch'));

vi.mock('../../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('fake-token'),
    },
  }),
}));

const mockGlobalSearch = vi.fn();

vi.mock('./search-client', async () => {
  const actual = await vi.importActual<typeof import('./search-client')>('./search-client');
  return {
    ...actual,
    globalSearch: (...args: unknown[]) => mockGlobalSearch(...args),
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Helpers ────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderSearch() {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <GlobalSearch />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Pruebas ────────────────────────────────────────────────────────────

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el botón lupa inicial', () => {
    renderSearch();
    expect(screen.getByRole('button', { name: /abrir búsqueda global/i })).toBeInTheDocument();
  });

  it('tipear 1 carácter no dispara consulta al backend', async () => {
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /abrir búsqueda global/i }));
    const input = screen.getByRole('combobox', { name: /búsqueda global/i });
    fireEvent.change(input, { target: { value: 'A' } });
    // Esperar para asegurarse de que el debounce no se dispara
    await new Promise((r) => setTimeout(r, 400));
    expect(mockGlobalSearch).not.toHaveBeenCalled();
  });

  it('tipear 2+ caracteres muestra dropdown con resultados', async () => {
    mockGlobalSearch.mockResolvedValue({
      query: 'Ma',
      groups: [
        {
          type: 'CUSTOMER',
          label: 'Clientes',
          results: [
            {
              id: 'cust-1',
              type: 'CUSTOMER',
              title: 'María Quispe',
              subtitle: 'DNI ****5910',
              route: '/customers/cust-1',
            },
          ],
        },
      ],
      totalGroups: 1,
      generatedAt: '2026-10-11T10:00:00Z',
    });

    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /abrir búsqueda global/i }));
    const input = screen.getByRole('combobox', { name: /búsqueda global/i });
    fireEvent.change(input, { target: { value: 'Ma' } });

    await waitFor(() => {
      expect(screen.getByText('María Quispe')).toBeInTheDocument();
    });

    expect(screen.getByText('CLIENTES')).toBeInTheDocument();
    expect(screen.getByText('DNI ****5910')).toBeInTheDocument();
  });

  it('estado vacío muestra mensaje orientador cuando no hay resultados', async () => {
    mockGlobalSearch.mockResolvedValue({
      query: 'XYZ999',
      groups: [],
      totalGroups: 0,
      generatedAt: '2026-10-11T10:00:00Z',
    });

    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /abrir búsqueda global/i }));
    const input = screen.getByRole('combobox', { name: /búsqueda global/i });
    fireEvent.change(input, { target: { value: 'XY' } });

    await waitFor(() => {
      expect(screen.getByText(/no encontramos resultados/i)).toBeInTheDocument();
    });
  });

  it('Escape cierra el dropdown', async () => {
    mockGlobalSearch.mockResolvedValue({
      query: 'Al',
      groups: [
        {
          type: 'RENTAL',
          label: 'Alquileres',
          results: [
            {
              id: 'r-1',
              type: 'RENTAL',
              title: 'ALQ-1187',
              subtitle: 'Toyota Hilux',
              route: '/rentals/r-1',
            },
          ],
        },
      ],
      totalGroups: 1,
      generatedAt: '2026-10-11T10:00:00Z',
    });

    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /abrir búsqueda global/i }));
    const input = screen.getByRole('combobox', { name: /búsqueda global/i });
    fireEvent.change(input, { target: { value: 'Al' } });

    await waitFor(() => {
      expect(screen.getByText('ALQ-1187')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('combobox', { name: /búsqueda global/i })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /abrir búsqueda global/i })).toBeInTheDocument();
  });

  it('clic en resultado navega a la ruta correcta y cierra el dropdown', async () => {
    mockGlobalSearch.mockResolvedValue({
      query: 'ALQ',
      groups: [
        {
          type: 'RENTAL',
          label: 'Alquileres',
          results: [
            {
              id: 'r-99',
              type: 'RENTAL',
              title: 'ALQ-9999',
              subtitle: 'Honda CR-V',
              route: '/rentals/r-99',
            },
          ],
        },
      ],
      totalGroups: 1,
      generatedAt: '2026-10-11T10:00:00Z',
    });

    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /abrir búsqueda global/i }));
    const input = screen.getByRole('combobox', { name: /búsqueda global/i });
    fireEvent.change(input, { target: { value: 'AL' } });

    await waitFor(() => {
      expect(screen.getByText('ALQ-9999')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ALQ-9999'));
    expect(mockNavigate).toHaveBeenCalledWith('/rentals/r-99');

    await waitFor(() => {
      expect(screen.queryByRole('combobox', { name: /búsqueda global/i })).not.toBeInTheDocument();
    });
  });
});
