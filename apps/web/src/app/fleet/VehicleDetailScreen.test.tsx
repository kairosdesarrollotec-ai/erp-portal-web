import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VehicleDetailScreen } from './VehicleDetailScreen';
import { FleetApiError, FleetCommandError } from './fleet-client';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

const getVehicleMock = vi.fn();
const updateVehicleStatusMock = vi.fn();
const updateVehicleMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      email: 'operaciones@veloxrent.pe',
      getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
    },
  }),
}));

vi.mock('./fleet-client', async () => {
  const actual = await vi.importActual<typeof import('./fleet-client')>('./fleet-client');
  return {
    ...actual,
    getVehicle: (...args: unknown[]) => getVehicleMock(...args),
    updateVehicleStatus: (...args: unknown[]) => updateVehicleStatusMock(...args),
    updateVehicle: (...args: unknown[]) => updateVehicleMock(...args),
  };
});

vi.mock('../auth/work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
}));

const oneAssignment = [
  { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
];

const sampleVehicle = {
  id: 'veh-1',
  organizationId: 'org-1',
  operatingCompanyId: 'c1',
  branchId: 'b1',
  plate: 'D0Y-704',
  brand: 'Toyota',
  model: 'Hilux',
  year: 2024,
  color: 'Blanco',
  category: 'PICK-UP 4X4',
  status: 'AVAILABLE',
  dailyRate: 350,
  photoUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderScreen(vehicleId = 'veh-1') {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: `/flota/${vehicleId}`,
            state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
          },
        ]}
      >
        <Routes>
          <Route path="/flota/:id" element={<VehicleDetailScreen />} />
          <Route path="/flota" element={<div>Flota list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getWorkContextAssignmentsMock.mockResolvedValue(oneAssignment);
  getVehicleMock.mockResolvedValue(sampleVehicle);
  updateVehicleStatusMock.mockResolvedValue({ ...sampleVehicle, status: 'MAINTENANCE' });
  updateVehicleMock.mockResolvedValue(sampleVehicle);
});

describe('VehicleDetailScreen', () => {
  it('muestra estado LOADING mientras carga', () => {
    getVehicleMock.mockReturnValue(new Promise(() => { /* never resolves */ }));
    renderScreen();
    expect(screen.getByText(/cargando vehículo/i)).toBeInTheDocument();
  });

  it('muestra los datos del vehículo en estado READY', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Toyota Hilux')).toBeInTheDocument());
    expect(screen.getAllByText('D0Y-704').length).toBeGreaterThan(0);
    expect(screen.getByText(/S\/ 350\.00 \/ día/)).toBeInTheDocument();
    expect(screen.getByText('PICK-UP 4X4')).toBeInTheDocument();
    expect(screen.getByText('Año: 2024')).toBeInTheDocument();
  });

  it('muestra el estado operativo actual', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Toyota Hilux')).toBeInTheDocument());
    expect(screen.getAllByText('Disponible').length).toBeGreaterThan(0);
  });

  it('permite cambiar el estado operativo vía el select', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByLabelText(/cambiar estado operativo/i)).toBeInTheDocument());
    const select = screen.getByLabelText(/cambiar estado operativo/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'MAINTENANCE' } });
    await waitFor(() =>
      expect(updateVehicleStatusMock).toHaveBeenCalledWith(
        'fake-id-token',
        'veh-1',
        expect.objectContaining({ status: 'MAINTENANCE', companyId: 'c1', branchId: 'b1' }),
      ),
    );
  });

  it('muestra RECOVERABLE_ERROR cuando getVehicle falla', async () => {
    getVehicleMock.mockRejectedValue(new Error('Network error'));
    renderScreen();
    await waitFor(() =>
      expect(screen.getByText(/no pudimos cargar este vehículo/i)).toBeInTheDocument(),
    );
  });

  it('muestra FORBIDDEN cuando el servidor devuelve 403', async () => {
    getVehicleMock.mockRejectedValue(new FleetApiError('Forbidden', 403));
    renderScreen();
    await waitFor(() =>
      expect(screen.getByText(/no tienes permisos para ver este vehículo/i)).toBeInTheDocument(),
    );
  });

  it('muestra error de estado cuando updateVehicleStatus falla', async () => {
    updateVehicleStatusMock.mockRejectedValue(
      new FleetCommandError(422, { code: 'INVALID_STATUS', detail: 'No se puede cambiar a ese estado.' }),
    );
    renderScreen();
    await waitFor(() => expect(screen.getByLabelText(/cambiar estado operativo/i)).toBeInTheDocument());
    const select = screen.getByLabelText(/cambiar estado operativo/i);
    fireEvent.change(select, { target: { value: 'MAINTENANCE' } });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    );
  });

  it('muestra el botón Editar vehículo', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Toyota Hilux')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /editar vehículo/i })).toBeInTheDocument();
  });

  it('tiene botón para volver a Flota', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Toyota Hilux')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /volver a la lista de flota/i })).toBeInTheDocument();
  });
});
