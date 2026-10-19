import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VehicleDetailScreen } from './VehicleDetailScreen';
import { axe } from 'jest-axe';
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

vi.mock('../shared/useRolePermissions', () => ({
  useRolePermissions: () => ({ can: () => true }),
}));

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
  depositMinimum: 800,
  passengerCapacity: 5,
  fuelPrice: 4.5,
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
    expect(screen.getByText('S/ 800.00')).toBeInTheDocument();
    expect(screen.getByText('Capacidad de pasajeros')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('S/ 4.50 / unidad')).toBeInTheDocument();
  });

  it('indica «Falta registrar la capacidad» y "Sin registrar" el combustible cuando el vehículo no tiene esos datos', async () => {
    getVehicleMock.mockResolvedValue({ ...sampleVehicle, passengerCapacity: null, fuelPrice: null, depositMinimum: null });
    renderScreen();
    await waitFor(() => expect(screen.getByText('Toyota Hilux')).toBeInTheDocument());
    expect(screen.getByText('Falta registrar la capacidad')).toBeInTheDocument();
    expect(screen.getAllByText('Sin registrar')).toHaveLength(1);
  });

  it('no muestra el aviso cuando el vehículo ya tiene capacidad', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Toyota Hilux')).toBeInTheDocument());
    expect(screen.queryByText('Falta registrar la capacidad')).not.toBeInTheDocument();
  });

  it('«Completar capacidad» abre la edición y guarda la capacidad', async () => {
    getVehicleMock.mockResolvedValue({ ...sampleVehicle, passengerCapacity: null });
    renderScreen();
    await waitFor(() => expect(screen.getByText('Toyota Hilux')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Completar capacidad' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Capacidad de pasajeros/), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() =>
      expect(updateVehicleMock).toHaveBeenCalledWith(
        'fake-id-token',
        'veh-1',
        expect.objectContaining({ passengerCapacity: 5 }),
      ),
    );
  });

  it('axe: detalle con aviso de capacidad faltante sin violaciones', async () => {
    getVehicleMock.mockResolvedValue({ ...sampleVehicle, passengerCapacity: null });
    const { container } = renderScreen();
    await screen.findByText('Falta registrar la capacidad');
    expect(await axe(container)).toHaveNoViolations();
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
