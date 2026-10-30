import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InquiryDetailScreen } from './InquiryDetailScreen';
import { useLocation } from 'react-router-dom';
import { InquiryCommandError } from './inquiries-client';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));

// Hallazgo Russbel (ronda 2): "Cambiar vehiculo" reenviaba el navState
// original con una `version` congelada, que ya no coincidia con
// `inquiry.version` tras cotizar - CON-03 quedaba bloqueada con el aviso
// de staleness sin forma de recuperarse. Esta sonda deja verificar que
// la version que viaja en location.state es siempre la vigente.
function LocationStateProbe() {
  const location = useLocation();
  const state = location.state as { version?: number } | null;
  return <div>pantalla de vehiculos (version {state?.version})</div>;
}

const getInquiryMock = vi.fn();
const closeInquiryMock = vi.fn();
const convertInquiryToReservationMock = vi.fn();
const convertInquiryToRentalMock = vi.fn();
const getCustomerMock = vi.fn();
const getVehicleMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();

const deniedPermissions = vi.hoisted(() => new Set<string>());
vi.mock('../shared/useRolePermissions', () => ({
  useRolePermissions: () => ({ can: (module: string, action: string) => !deniedPermissions.has(`${module}.${action}`) }),
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
    convertInquiryToRental: (...args: unknown[]) => convertInquiryToRentalMock(...args),
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
        <Route path="/alquileres/:id/entrega-01" element={<div>expediente de alquiler</div>} />
        <Route
          path="/consultas/:id/vehiculos"
          element={<LocationStateProbe />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InquiryDetailScreen (CON-04)', () => {
  beforeEach(() => {
    getInquiryMock.mockReset();
    closeInquiryMock.mockReset();
    convertInquiryToReservationMock.mockReset();
    convertInquiryToRentalMock.mockReset();
    getCustomerMock.mockReset().mockResolvedValue({ id: 'cust-1', fullName: 'Maria Quispe' });
    getVehicleMock.mockReset().mockResolvedValue({ id: 'veh-mock-hilux', brand: 'Toyota', model: 'Hilux', photoUrl: 'https://cdn.example.com/hilux.jpg' });
    getWorkContextAssignmentsMock.mockReset().mockResolvedValue(oneAssignment);
  });

  it('CR-02: el nombre del cliente sale de la consulta, no de un estado de navegación obsoleto', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/consultas/con-1', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central', customerName: 'DEMO Cliente Extranjero' } },
        ]}
      >
        <Routes>
          <Route path="/consultas/:id" element={<InquiryDetailScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(screen.queryByText('DEMO Cliente Extranjero')).not.toBeInTheDocument();
  });

  it('muestra el resumen y la cotizacion, resolviendo el nombre del vehiculo (no el UUID)', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(await screen.findByText('Toyota Hilux')).toBeInTheDocument();
    expect(screen.queryByText('veh-mock-hilux')).not.toBeInTheDocument();
  });

  // Hallazgo Russbel (ronda 2): el vehiculo cotizado no se veia (solo
  // texto) y no habia forma de corregir una seleccion equivocada.
  it('muestra una foto del vehiculo cotizado y permite cambiarlo antes de reservar', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    renderScreen();

    await screen.findByText('Toyota Hilux');
    const photo = await screen.findByAltText('Toyota Hilux');
    expect(photo).toHaveAttribute('src', 'https://cdn.example.com/hilux.jpg');

    fireEvent.click(screen.getByText('Cambiar vehículo'));
    // La consulta de prueba tiene version: 1 (ver buildInquiry) - se debe
    // reenviar esa version vigente, no una heredada/congelada del navState.
    expect(await screen.findByText('pantalla de vehiculos (version 1)')).toBeInTheDocument();
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
      true,
      undefined,
    );
  });

  it('V-22: sin permiso CONVERT_TO_RESERVATION (p. ej. Gerencia) no se ofrece "Reservar este vehículo"', async () => {
    deniedPermissions.add('INQUIRY.CONVERT_TO_RESERVATION');
    try {
      getInquiryMock.mockResolvedValue(buildInquiry());
      renderScreen();

      await screen.findByText('Maria Quispe');
      expect(screen.queryByText('Reservar este vehículo')).not.toBeInTheDocument();
      expect(screen.getByText('Convertir a Alquiler')).toBeInTheDocument();
    } finally {
      deniedPermissions.clear();
    }
  });

  it('ofrece siempre ambos botones: "Reservar este vehículo" y "Convertir a Alquiler"', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    renderScreen();

    await screen.findByText('Maria Quispe');
    expect(screen.getByText('Reservar este vehículo')).toBeInTheDocument();
    expect(screen.getByText('Convertir a Alquiler')).toBeInTheDocument();
  });

  it('"Convertir a Alquiler" llama al comando con la version vigente y navega al expediente creado', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    convertInquiryToRentalMock.mockResolvedValue({
      inquiry: { ...buildInquiry(), status: 'CONVERTIDA', version: 2 },
      rental: { id: 'rent-9', status: 'DRAFT', version: 1 },
    });
    renderScreen();

    await screen.findByText('Maria Quispe');
    fireEvent.click(screen.getByText('Convertir a Alquiler'));

    expect(await screen.findByText('expediente de alquiler')).toBeInTheDocument();
    expect(convertInquiryToRentalMock).toHaveBeenCalledWith('fake-id-token', 'con-1', 1, 'c1', 'b1');
  });

  it('muestra el error de dominio de "Convertir a Alquiler" y no navega', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    convertInquiryToRentalMock.mockRejectedValue(
      new InquiryCommandError(422, { code: 'VEHICLE_NOT_AVAILABLE', detail: 'El vehículo ya no está disponible.' }),
    );
    renderScreen();

    await screen.findByText('Maria Quispe');
    fireEvent.click(screen.getByText('Convertir a Alquiler'));

    expect(await screen.findByText('El vehículo ya no está disponible.')).toBeInTheDocument();
    expect(screen.queryByText('expediente de alquiler')).not.toBeInTheDocument();
  });

  it('no permite convertir a alquiler una consulta ya convertida', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry({ status: 'CONVERTIDA' }));
    renderScreen();

    await screen.findByText('Maria Quispe');
    expect(screen.queryByText('Convertir a Alquiler')).not.toBeInTheDocument();
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

    const dialog = screen.getByRole('dialog', { name: '¿Por qué cierras esta consulta sin conversión?' });
    expect(dialog).toBeInTheDocument();
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

  it('el modal de cierre enfoca el motivo, cierra con Esc/Cancelar y atrapa el foco', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    renderScreen();
    await screen.findByText('Maria Quispe');

    fireEvent.click(screen.getByText('Cerrar sin conversión'));
    const reason = screen.getByLabelText('Motivo de cierre');
    expect(reason).toHaveFocus();

    // Tab desde el ultimo control (Confirmar deshabilitado -> Cancelar) vuelve al primero.
    const cancel = screen.getByRole('button', { name: 'Cancelar' });
    cancel.focus();
    fireEvent.keyDown(cancel, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Cerrar ventana' })).toHaveFocus();

    fireEvent.keyDown(reason, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Cerrar sin conversión'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(closeInquiryMock).not.toHaveBeenCalled();
  });
});
