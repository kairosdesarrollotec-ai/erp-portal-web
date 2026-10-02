import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InquiryDetailScreen } from './InquiryDetailScreen';

const getInquiryMock = vi.fn();
const closeInquiryMock = vi.fn();
const convertInquiryToReservationMock = vi.fn();
const getCustomerMock = vi.fn();
const getVehicleMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();

vi.mock('../shared/useRolePermissions', () => ({
  useRolePermissions: () => ({ can: () => true }),
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./inquiries-client', async () => {
  const actual = await vi.importActual<typeof import('./inquiries-client')>('./inquiries-client');
  return {
    ...actual,
    getInquiry: (...args: unknown[]) => getInquiryMock(...args),
    closeInquiry: (...args: unknown[]) => closeInquiryMock(...args),
    convertInquiryToReservation: (...args: unknown[]) => convertInquiryToReservationMock(...args),
  };
});

vi.mock('../customers/customers-client', async () => {
  const actual = await vi.importActual<typeof import('../customers/customers-client')>('../customers/customers-client');
  return {
    ...actual,
    getCustomer: (...args: unknown[]) => getCustomerMock(...args),
  };
});

vi.mock('../fleet/fleet-client', async () => {
  const actual = await vi.importActual<typeof import('../fleet/fleet-client')>('../fleet/fleet-client');
  return {
    ...actual,
    getVehicle: (...args: unknown[]) => getVehicleMock(...args),
  };
});

vi.mock('../auth/work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
}));

const oneAssignment = [{ companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' }];

function buildInquiry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'con-1',
    status: 'COTIZADA',
    channel: 'WHATSAPP',
    version: 1,
    companyId: 'c1',
    customerId: 'cust-1',
    touristUse: true,
    createdAt: '2026-09-16T00:00:00Z',
    travelStartDate: '2026-10-10T00:00:00Z',
    interactions: [],
    quotations: [
      { id: 'quo-1', vehicleId: 'veh-mock-hilux', destination: 'Ayacucho', estimatedDays: 3, createdAt: '2026-09-16T01:00:00Z' },
    ],
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/consultas/con-1', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path="/consultas/:id" element={<InquiryDetailScreen />} />
        <Route path="/consultas" element={<div>bandeja</div>} />
        <Route path="/reservas" element={<div>reservas</div>} />
        <Route path="/reservas/:id" element={<div>detalle de reserva</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InquiryDetailScreen (CON-04)', () => {
  beforeEach(() => {
    getInquiryMock.mockReset();
    closeInquiryMock.mockReset();
    convertInquiryToReservationMock.mockReset();
    getCustomerMock.mockReset().mockResolvedValue({ id: 'cust-1', fullName: 'Maria Quispe' });
    getVehicleMock.mockReset().mockResolvedValue({ id: 'veh-mock-hilux', brand: 'Toyota', model: 'Hilux' });
    getWorkContextAssignmentsMock.mockReset().mockResolvedValue(oneAssignment);
  });

  it('muestra el resumen y la cotizacion, resolviendo el nombre del vehiculo (no el UUID)', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(await screen.findByText('Toyota Hilux')).toBeInTheDocument();
    expect(screen.queryByText('veh-mock-hilux')).not.toBeInTheDocument();
  });

  // Reactivado: "Reservar este vehiculo" abre un formulario corto
  // (modalidad + fecha de inicio, los 2 datos que le faltaban a
  // convert-to-reservation) y, al confirmar, crea la Reservation real y
  // navega a /reservas/:id.
  it('cuando hay cotizacion, "Reservar este vehiculo" prellena la fecha de Consulta, pide modalidad solo si no se puede calcular, y crea la reserva real', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    convertInquiryToReservationMock.mockResolvedValue({
      inquiry: { ...buildInquiry(), status: 'CONVERTIDA', version: 2 },
      reservation: { id: 'res-1', status: 'BORRADOR', version: 1 },
    });
    renderScreen();

    await screen.findByText('Maria Quispe');
    fireEvent.click(screen.getByText('Reservar este vehículo'));

    // La fecha viene prellenada desde inquiry.travelStartDate (CON-02) -
    // nunca se pide vacia.
    expect(screen.getByLabelText('Fecha y hora de inicio')).toHaveValue('2026-10-10T09:00');

    // El boton queda deshabilitado hasta responder la pregunta de
    // modalidad (BR-RES-005: se calcula por ubicacion del cliente: como
    // ese dato aun no se captura en Consulta, cae en el caso de excepcion
    // documentado en RES-04 - pregunta explicita, no un selector libre).
    expect(screen.getByText('Confirmar reserva')).toBeDisabled();
    fireEvent.click(screen.getByText('Sí — presencial'));
    expect(screen.getByText('Confirmar reserva')).toBeEnabled();

    fireEvent.click(screen.getByText('Confirmar reserva'));

    expect(await screen.findByText('detalle de reserva')).toBeInTheDocument();
    expect(convertInquiryToReservationMock).toHaveBeenCalledWith(
      'fake-id-token',
      'con-1',
      1,
      'c1',
      'b1',
      'PRESENCIAL',
      expect.any(String),
    );
  });

  it('bloquea la conversion a reserva si la consulta no tiene cliente formal (prospecto)', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry({ customerId: null }));
    getCustomerMock.mockReset();
    renderScreen();

    await screen.findByText('Cotizada');
    expect(screen.queryByText('Reservar este vehículo')).not.toBeInTheDocument();
    expect(screen.getByText(/no tiene un cliente formal asociado/)).toBeInTheDocument();
  });

  it('no permite confirmar el cierre sin motivo', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    renderScreen();

    await screen.findByText('Maria Quispe');
    fireEvent.click(screen.getByText('Cerrar sin conversión'));

    const confirmButton = screen.getByText('Confirmar cierre');
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Motivo del cierre (obligatorio)'), {
      target: { value: 'El cliente ya no requiere el vehículo.' },
    });
    expect(confirmButton).not.toBeDisabled();

    closeInquiryMock.mockResolvedValue(buildInquiry({ status: 'CERRADA_SIN_CONVERSION', version: 2 }));
    fireEvent.click(confirmButton);

    expect(await screen.findByText('Esta consulta fue cerrada sin conversión.')).toBeInTheDocument();
    expect(closeInquiryMock).toHaveBeenCalledWith(
      'fake-id-token',
      'con-1',
      1,
      'c1',
      'b1',
      'CIERRE_MANUAL',
      'El cliente ya no requiere el vehículo.',
    );
  });
});
