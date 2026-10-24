import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OperationalRemindersModal } from './OperationalRemindersModal';
import * as fleetClient from '../fleet-client';

vi.mock('../fleet-client', () => ({
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

describe('OperationalRemindersModal (C4: Interfaz in-app de recordatorios)', () => {
  const companyId = 'comp-1';
  const branchId = 'branch-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista recordatorios in-app de FIVI (interdiaria) y FITVM (mensual) pendientes y vencidos', async () => {
    vi.mocked(fleetClient.listVehicleOperationalReminders).mockResolvedValue({
      reminders: [
        {
          id: 'rem-fivi-1',
          vehicleId: 'veh-1',
          vehiclePlate: 'ABC-123',
          formatType: 'FORMATO_01_FIVI',
          dueDate: '2026-10-24T00:00:00Z',
          status: 'PENDING',
        },
        {
          id: 'rem-fitvm-2',
          vehicleId: 'veh-2',
          vehiclePlate: 'XYZ-789',
          formatType: 'FORMATO_03_FITVM',
          dueDate: '2026-10-21T00:00:00Z',
          status: 'OVERDUE',
        },
      ],
      total: 2,
    } as any);

    render(
      <OperationalRemindersModal
        isOpen={true}
        onClose={vi.fn()}
        companyId={companyId}
        branchId={branchId}
        idToken="test-token"
        canRegister={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('reminders-table')).toBeInTheDocument();
    });

    expect(screen.getByText('PENDIENTE')).toBeInTheDocument();
    expect(screen.getByText('VENCIDO')).toBeInTheDocument();
    expect(screen.getByText(/Inspección Vehicular Interdiaria \(FIVI\)/)).toBeInTheDocument();
    expect(screen.getByText(/Inspección Técnica Vehicular Mensual \(FITVM\)/)).toBeInTheDocument();
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
    expect(screen.getByText('XYZ-789')).toBeInTheDocument();
    expect(screen.getByTestId('btn-resolve-reminder-rem-fivi-1')).toBeInTheDocument();
    expect(screen.getByTestId('btn-resolve-reminder-rem-fitvm-2')).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay recordatorios pendientes', async () => {
    vi.mocked(fleetClient.listVehicleOperationalReminders).mockResolvedValue({
      reminders: [],
      total: 0,
    } as any);

    render(
      <OperationalRemindersModal
        isOpen={true}
        onClose={vi.fn()}
        companyId={companyId}
        branchId={branchId}
        idToken="test-token"
        canRegister={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('empty-reminders-state')).toBeInTheDocument();
    });

    expect(screen.getByText(/No hay recordatorios de inspección pendientes ni vencidos/)).toBeInTheDocument();
  });

  it('permite abrir el formulario de resolución y al registrar formato re-consulta los recordatorios', async () => {
    vi.mocked(fleetClient.listVehicleOperationalReminders).mockResolvedValueOnce({
      reminders: [
        {
          id: 'rem-fivi-1',
          vehicleId: 'veh-1',
          vehiclePlate: 'ABC-123',
          formatType: 'FORMATO_01_FIVI',
          dueDate: '2026-10-24T00:00:00Z',
          status: 'PENDING',
        },
      ],
      total: 1,
    } as any).mockResolvedValueOnce({
      reminders: [],
      total: 0,
    } as any);

    vi.mocked(fleetClient.recordVehicleOperationalFormat).mockResolvedValue({
      id: 'rec-fivi-done',
      vehicleId: 'veh-1',
      formatType: 'FORMATO_01_FIVI',
    });

    render(
      <OperationalRemindersModal
        isOpen={true}
        onClose={vi.fn()}
        companyId={companyId}
        branchId={branchId}
        idToken="test-token"
        canRegister={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('btn-resolve-reminder-rem-fivi-1')).toBeInTheDocument();
    });

    // Clic en registrar formato desde el recordatorio
    fireEvent.click(screen.getByTestId('btn-resolve-reminder-rem-fivi-1'));

    expect(screen.getByText(/Registrar Formato Operativo — ABC-123/)).toBeInTheDocument();

    // Llenamos el responsable y guardamos
    fireEvent.change(screen.getByLabelText(/Responsable \/ Verificador/i), {
      target: { value: 'Cecilia Chumpitaz' },
    });
    fireEvent.click(screen.getByText('Guardar Formato'));

    await waitFor(() => {
      expect(fleetClient.recordVehicleOperationalFormat).toHaveBeenCalledWith(
        'test-token',
        'veh-1',
        expect.objectContaining({
          formatType: 'FORMATO_01_FIVI',
          performedBy: 'Cecilia Chumpitaz',
        }),
        expect.any(String),
      );
    });

    // Comprobamos que tras resolver, se re-consulta la lista de recordatorios y ahora está vacía
    await waitFor(() => {
      expect(screen.getByTestId('empty-reminders-state')).toBeInTheDocument();
    });
  });
});
