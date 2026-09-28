import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FleetListScreen } from './FleetListScreen';
import { FleetApiError } from './fleet-client';

const listVehiclesMock = vi.fn();
const createVehicleMock = vi.fn();
const updateVehicleStatusMock = vi.fn();
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
    listVehicles: (...args: unknown[]) => listVehiclesMock(...args),
    createVehicle: (...args: unknown[]) => createVehicleMock(...args),
    updateVehicleStatus: (...args: unknown[]) => updateVehicleStatusMock(...args),
  };
});

vi.mock('../auth/work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
}));

const oneAssignment = [
  { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
];

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/flota',
          state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
        },
      ]}
    >
      <Routes>
        <Route path="/flota" element={<FleetListScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FleetListScreen', () => {
  beforeEach(() => {
    listVehiclesMock.mockReset();
    createVehicleMock.mockReset();
    updateVehicleStatusMock.mockReset();
    getWorkContextAssignmentsMock.mockReset().mockResolvedValue(oneAssignment);
  });

  it('muestra la tabla de vehículos con sus datos y badges de estado', async () => {
    listVehiclesMock.mockResolvedValue({
      items: [
        {
          id: 'v-1',
          organizationId: 'org-1',
          operatingCompanyId: 'c1',
          branchId: 'b1',
          plate: 'ABC-123',
          brand: 'Toyota',
          model: 'Hilux',
          year: 2024,
          color: 'Blanco',
          category: 'PICKUP',
          status: 'AVAILABLE',
          dailyRate: 250,
          photoUrl: null,
          createdAt: '2026-09-28T12:00:00.000Z',
          updatedAt: '2026-09-28T12:00:00.000Z',
        },
      ],
      total: 1,
    });

    renderScreen();

    expect(await screen.findByText('ABC-123')).toBeInTheDocument();
    expect(screen.getByText('Toyota Hilux')).toBeInTheDocument();
    expect(screen.getByText('PICKUP')).toBeInTheDocument();
    expect(screen.getByText('S/ 250.00')).toBeInTheDocument();
    expect(screen.getAllByText('Disponible').length).toBeGreaterThan(0);
    expect(screen.getByText('+ Nuevo Vehículo')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay vehículos', async () => {
    listVehiclesMock.mockResolvedValue({ items: [], total: 0 });
    renderScreen();

    expect(
      await screen.findByText('Todavía no hay vehículos registrados en la flota de esta empresa.'),
    ).toBeInTheDocument();
  });

  it('muestra error recuperable si la API falla', async () => {
    listVehiclesMock.mockRejectedValue(new Error('Network error'));
    renderScreen();

    expect(
      await screen.findByText(/No pudimos cargar el catálogo de flota vehicular/),
    ).toBeInTheDocument();
  });

  it('muestra estado FORBIDDEN si la API devuelve 403', async () => {
    listVehiclesMock.mockRejectedValue(new FleetApiError('Forbidden', 403));
    renderScreen();

    expect(
      await screen.findByText(/No tienes permisos para ver la flota de esta sede o empresa/),
    ).toBeInTheDocument();
  });

  it('aplica debounce al escribir en el buscador', async () => {
    listVehiclesMock.mockResolvedValue({ items: [], total: 0 });
    renderScreen();

    const searchInput = screen.getByLabelText('Buscar vehículos');
    fireEvent.change(searchInput, { target: { value: 'H' } });
    fireEvent.change(searchInput, { target: { value: 'Hi' } });
    fireEvent.change(searchInput, { target: { value: 'Hilux' } });

    await waitFor(() => {
      const lastCall = listVehiclesMock.mock.calls[listVehiclesMock.mock.calls.length - 1];
      expect(lastCall?.[1]).toMatchObject({ search: 'Hilux' });
    });

    expect(listVehiclesMock.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('permite filtrar por estado', async () => {
    listVehiclesMock.mockResolvedValue({ items: [], total: 0 });
    renderScreen();

    const select = screen.getByLabelText('Filtrar por estado');
    fireEvent.change(select, { target: { value: 'MAINTENANCE' } });

    await waitFor(() => {
      const lastCall = listVehiclesMock.mock.calls[listVehiclesMock.mock.calls.length - 1];
      expect(lastCall?.[1]).toMatchObject({ status: 'MAINTENANCE' });
    });
  });

  it('permite cambiar el estado de un vehículo directamente desde la tabla', async () => {
    listVehiclesMock.mockResolvedValue({
      items: [
        {
          id: 'v-1',
          plate: 'ABC-123',
          brand: 'Toyota',
          model: 'Hilux',
          category: 'PICKUP',
          status: 'AVAILABLE',
          dailyRate: 250,
          createdAt: '2026-09-28T12:00:00.000Z',
          updatedAt: '2026-09-28T12:00:00.000Z',
        },
      ],
      total: 1,
    });
    updateVehicleStatusMock.mockResolvedValue({ id: 'v-1', status: 'MAINTENANCE' });

    renderScreen();

    expect(await screen.findByText('ABC-123')).toBeInTheDocument();

    const changeStatusSelect = screen.getByLabelText('Cambiar estado de ABC-123');
    fireEvent.change(changeStatusSelect, { target: { value: 'MAINTENANCE' } });

    await waitFor(() => {
      expect(updateVehicleStatusMock).toHaveBeenCalledWith('fake-id-token', 'v-1', {
        companyId: 'c1',
        branchId: 'b1',
        status: 'MAINTENANCE',
      });
    });
  });

  it('abre el modal y registra un nuevo vehículo', async () => {
    listVehiclesMock.mockResolvedValue({ items: [], total: 0 });
    createVehicleMock.mockResolvedValue({ id: 'v-new', plate: 'XYZ-789' });

    renderScreen();

    const newBtn = await screen.findByText('+ Nuevo Vehículo');
    fireEvent.click(newBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Registrar Vehículo' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('ABC-123'), {
      target: { value: 'XYZ-789' },
    });
    fireEvent.change(screen.getByPlaceholderText('Toyota, Hyundai, Nissan...'), {
      target: { value: 'Hyundai' },
    });
    fireEvent.change(screen.getByPlaceholderText('Hilux, Tucson, Frontier...'), {
      target: { value: 'Tucson' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Registrar Vehículo' }));

    await waitFor(() => {
      expect(createVehicleMock).toHaveBeenCalledWith(
        'fake-id-token',
        expect.objectContaining({
          companyId: 'c1',
          branchId: 'b1',
          plate: 'XYZ-789',
          brand: 'Hyundai',
          model: 'Tucson',
        }),
        expect.any(String),
      );
    });
  });
});
