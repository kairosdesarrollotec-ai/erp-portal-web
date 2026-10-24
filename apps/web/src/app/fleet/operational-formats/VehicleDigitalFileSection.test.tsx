import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VehicleDigitalFileSection } from './VehicleDigitalFileSection';
import * as fleetClient from '../fleet-client';

vi.mock('../fleet-client', () => ({
  listVehicleOperationalRecords: vi.fn(),
  listVehicleOperationalReminders: vi.fn(),
  recordVehicleOperationalFormat: vi.fn(),
}));

vi.mock('../../providers/firebase', () => ({
  getFirebaseAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('fake-token'),
    },
  })),
}));

describe('VehicleDigitalFileSection (C4: Ficha Digital por Vehículo)', () => {
  const vehicleId = 'veh-1';
  const vehiclePlate = 'ABC-123';
  const companyId = 'comp-1';
  const branchId = 'branch-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra la lista de registros operativos guardados con odómetro, combustible y formato', async () => {
    vi.mocked(fleetClient.listVehicleOperationalRecords).mockResolvedValue({
      records: [
        {
          id: 'rec-1',
          vehicleId: 'veh-1',
          formatType: 'FORMATO_05_RIO',
          processType: null,
          processId: null,
          odometerKm: 34500,
          fuelLevelLines: 12,
          data: { descripcion: 'Fuga ligera de refrigerante en manguera superior' },
          observations: 'Se recomienda cambio de abrazadera',
          performedBy: 'Carlos Mecánico',
          performedAt: '2026-10-23T10:00:00Z',
          createdAt: '2026-10-23T10:00:00Z',
        },
        {
          id: 'rec-2',
          vehicleId: 'veh-1',
          formatType: 'FORMATO_07_RLV',
          processType: null,
          processId: null,
          odometerKm: 34100,
          fuelLevelLines: 8,
          data: { tipoLimpieza: 'Completa', costo: 35 },
          observations: 'Lavado completo y aspirado de salón',
          performedBy: 'Lavador Juan',
          performedAt: '2026-10-22T15:00:00Z',
          createdAt: '2026-10-22T15:00:00Z',
        },
      ],
      total: 2,
    } as any);

    vi.mocked(fleetClient.listVehicleOperationalReminders).mockResolvedValue({
      reminders: [],
    } as any);

    render(
      <VehicleDigitalFileSection
        vehicleId={vehicleId}
        vehiclePlate={vehiclePlate}
        companyId={companyId}
        branchId={branchId}
        idToken="token-1"
        canRegister={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('operational-records-table')).toBeInTheDocument();
    });

    expect(screen.getByText(/Registro de Incidencias y Observaciones \(RIO\)/)).toBeInTheDocument();
    expect(screen.getByText('Carlos Mecánico')).toBeInTheDocument();
    expect(screen.getByText('34500 km')).toBeInTheDocument();
    expect(screen.getByText('12/16 líneas')).toBeInTheDocument();
    expect(screen.getByText('Se recomienda cambio de abrazadera')).toBeInTheDocument();

    expect(screen.getByText(/Registro de Limpieza Vehicular \(RLV\)/)).toBeInTheDocument();
    expect(screen.getByText('Lavador Juan')).toBeInTheDocument();
    expect(screen.getByText('Lavado completo y aspirado de salón')).toBeInTheDocument();
  });

  it('permite filtrar registros por tipo de formato operativo', async () => {
    vi.mocked(fleetClient.listVehicleOperationalRecords).mockResolvedValue({
      records: [
        {
          id: 'rec-rio',
          vehicleId: 'veh-1',
          formatType: 'FORMATO_05_RIO',
          processType: null,
          processId: null,
          odometerKm: 20000,
          fuelLevelLines: 8,
          data: {},
          observations: 'Observación RIO',
          performedBy: 'Mecánico',
          performedAt: '2026-10-23T10:00:00Z',
          createdAt: '2026-10-23T10:00:00Z',
        },
        {
          id: 'rec-rlv',
          vehicleId: 'veh-1',
          formatType: 'FORMATO_07_RLV',
          processType: null,
          processId: null,
          odometerKm: 20000,
          fuelLevelLines: 8,
          data: {},
          observations: 'Lavado básico',
          performedBy: 'Lavador',
          performedAt: '2026-10-22T10:00:00Z',
          createdAt: '2026-10-22T10:00:00Z',
        },
      ],
      total: 2,
    } as any);

    vi.mocked(fleetClient.listVehicleOperationalReminders).mockResolvedValue({
      reminders: [],
    } as any);

    render(
      <VehicleDigitalFileSection
        vehicleId={vehicleId}
        vehiclePlate={vehiclePlate}
        companyId={companyId}
        branchId={branchId}
        idToken="token-1"
        canRegister={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('operational-record-row-rec-rio')).toBeInTheDocument();
      expect(screen.getByTestId('operational-record-row-rec-rlv')).toBeInTheDocument();
    });

    const select = screen.getByTestId('filter-format-select');
    fireEvent.change(select, { target: { value: 'FORMATO_05_RIO' } });

    expect(screen.getByTestId('operational-record-row-rec-rio')).toBeInTheDocument();
    expect(screen.queryByTestId('operational-record-row-rec-rlv')).not.toBeInTheDocument();
  });

  it('muestra aviso destacado si existen recordatorios in-app pendientes o vencidos (FIVI o FITVM)', async () => {
    vi.mocked(fleetClient.listVehicleOperationalRecords).mockResolvedValue({
      records: [],
      total: 0,
    } as any);

    vi.mocked(fleetClient.listVehicleOperationalReminders).mockResolvedValue({
      reminders: [
        {
          id: 'rem-1',
          vehicleId: 'veh-1',
          formatType: 'FORMATO_01_FIVI',
          dueDate: '2026-10-24T00:00:00Z',
          status: 'PENDING',
        },
        {
          id: 'rem-2',
          vehicleId: 'veh-1',
          formatType: 'FORMATO_03_FITVM',
          dueDate: '2026-10-20T00:00:00Z',
          status: 'OVERDUE',
        },
      ],
    } as any);

    render(
      <VehicleDigitalFileSection
        vehicleId={vehicleId}
        vehiclePlate={vehiclePlate}
        companyId={companyId}
        branchId={branchId}
        idToken="token-1"
        canRegister={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('vehicle-active-reminders')).toBeInTheDocument();
    });

    expect(screen.getByText('PENDIENTE')).toBeInTheDocument();
    expect(screen.getByText('VENCIDO')).toBeInTheDocument();
    expect(screen.getByTestId('btn-resolve-reminder')).toBeInTheDocument();
  });

  it('permite registrar un nuevo formato operativo (Formato 05 RIO) y lo envía al API', async () => {
    vi.mocked(fleetClient.listVehicleOperationalRecords).mockResolvedValue({
      records: [],
      total: 0,
    } as any);
    vi.mocked(fleetClient.listVehicleOperationalReminders).mockResolvedValue({
      reminders: [],
    } as any);
    vi.mocked(fleetClient.recordVehicleOperationalFormat).mockResolvedValue({
      id: 'new-rec-id',
      vehicleId: 'veh-1',
      formatType: 'FORMATO_05_RIO',
    });

    render(
      <VehicleDigitalFileSection
        vehicleId={vehicleId}
        vehiclePlate={vehiclePlate}
        companyId={companyId}
        branchId={branchId}
        idToken="token-1"
        canRegister={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('empty-operational-records')).toBeInTheDocument();
    });

    // Clic en registrar formato
    const openBtn = screen.getByTestId('btn-register-operational-format');
    fireEvent.click(openBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Registrar Formato Operativo — ABC-123/)).toBeInTheDocument();

    // Completamos el formulario
    fireEvent.change(screen.getByLabelText(/Responsable \/ Verificador/i), {
      target: { value: 'Cecilia Chumpitaz' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Detalle de la falla, ruido o daño/i), {
      target: { value: 'Espejo retrovisor izquierdo ligeramente suelto' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Sugerencia de reparación/i), {
      target: { value: 'Ajuste de pernos de base' },
    });

    // Guardar
    fireEvent.click(screen.getByText('Guardar Formato'));

    await waitFor(() => {
      expect(fleetClient.recordVehicleOperationalFormat).toHaveBeenCalledWith(
        'token-1',
        'veh-1',
        expect.objectContaining({
          companyId: 'comp-1',
          branchId: 'branch-1',
          formatType: 'FORMATO_05_RIO',
          performedBy: 'Cecilia Chumpitaz',
          data: expect.objectContaining({
            descripcion: 'Espejo retrovisor izquierdo ligeramente suelto',
            sugerencia: 'Ajuste de pernos de base',
          }),
        }),
        expect.stringContaining('op-format-veh-1-FORMATO_05_RIO'),
      );
    });
  });
});
