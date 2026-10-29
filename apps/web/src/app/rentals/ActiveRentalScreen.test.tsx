import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { axe } from 'jest-axe';
import { ActiveRentalScreen } from './ActiveRentalScreen';
import { GpsPanel } from './GpsPanel';
import { clearPermissions, setPermissions } from '../../test/permissions';

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') },
  }),
}));
vi.mock('../shared/AppHeader', () => ({ AppHeader: () => <header>cabecera</header> }));

const wizardMock = vi.fn();
vi.mock('./useRentalWizard', () => ({ useRentalWizard: () => wizardMock() }));

const requestExtensionMock = vi.fn();
const reportBreachMock = vi.fn();
const getAirportServiceMock = vi.fn();
const requestAirportServiceMock = vi.fn();
vi.mock('./rentals-extensions-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-extensions-client')>('./rentals-extensions-client');
  return { ...actual, requestExtension: (...a: unknown[]) => requestExtensionMock(...a) };
});
vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    reportExtensionBreach: (...a: unknown[]) => reportBreachMock(...a),
    getRentalAirportService: (...a: unknown[]) => getAirportServiceMock(...a),
    requestRentalAirportService: (...a: unknown[]) => requestAirportServiceMock(...a),
  };
});

const context = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede' };
const baseRental = {
  id: 'rent-1',
  status: 'ACTIVE',
  customerName: 'Maria Quispe',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehiclePlate: 'D0Y-704',
  planCode: 'STANDARD',
  startAt: '2026-10-01T08:00:00Z',
  expectedEndAt: '2026-10-20T08:00:00Z',
  version: 5,
  deposit: { id: 'd1', originalAmount: '1000.00', currency: 'PEN', status: 'HELD', createdAt: '', reservationCreditAmount: '300.00', amountCollected: '700.00' },
  extensions: [],
};

function wizard(rental: unknown = baseRental, extra: Record<string, unknown> = {}) {
  return { id: 'rent-1', state: 'READY', rental, context, reload: vi.fn(), setRental: vi.fn(), getIdToken: vi.fn(), ...extra };
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/alquileres/rent-1', state: context }]}>
      <Routes>
        <Route path="/alquileres/:id" element={<ActiveRentalScreen />} />
        <Route path="/devoluciones/recepcion/:rentalId" element={<div>recepcion</div>} />
        <Route path="/incidencias" element={<div>incidencias</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ActiveRentalScreen (ALQ-10)', () => {
  beforeEach(() => {
    wizardMock.mockReset();
    requestExtensionMock.mockReset();
    reportBreachMock.mockReset();
    getAirportServiceMock.mockReset();
    requestAirportServiceMock.mockReset();
    getAirportServiceMock.mockResolvedValue(null);
    clearPermissions();
  });

  it('estados de carga, error y no encontrado', () => {
    wizardMock.mockReturnValue(wizard(null, { state: 'LOADING' }));
    const { unmount } = renderScreen();
    expect(screen.getByText(/Cargando alquiler/)).toBeInTheDocument();
    unmount();
    wizardMock.mockReturnValue(wizard(null, { state: 'NOT_FOUND' }));
    const second = renderScreen();
    expect(screen.getByText(/No encontramos este alquiler/)).toBeInTheDocument();
    second.unmount();
    wizardMock.mockReturnValue(wizard(null, { state: 'RECOVERABLE_ERROR' }));
    renderScreen();
    expect(screen.getByText(/No pudimos cargar el alquiler/)).toBeInTheDocument();
  });

  it('muestra resumen, garantia con reserva aplicada y GPS no conectado', () => {
    wizardMock.mockReturnValue(wizard());
    renderScreen();
    expect(screen.getByText(/Toyota Hilux — D0Y-704/)).toBeInTheDocument();
    const g = screen.getByTestId('active-guarantee');
    expect(g).toHaveTextContent('S/ 1000.00');
    expect(g).toHaveTextContent('S/ 300.00');
    expect(g).toHaveTextContent('S/ 700.00');
    expect(screen.getByText(/seguimiento GPS aún no está conectado/)).toBeInTheDocument();
  });

  it('conductor de la empresa: tolera deposit null, muestra sin garantia y nunca un saldo a favor', () => {
    wizardMock.mockReturnValue(wizard({ ...baseRental, deposit: null, depositRequired: false }));
    renderScreen();
    expect(screen.getByTestId('no-deposit-company-driver')).toHaveTextContent('con conductor de la empresa no se cobra garantía');
    expect(screen.queryByTestId('active-guarantee')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reservation-credit-excess')).not.toBeInTheDocument();
    expect(screen.queryByText(/saldo a favor/i)).not.toBeInTheDocument();
  });

  it('Iniciar devolucion lleva a la recepcion', async () => {
    wizardMock.mockReturnValue(wizard());
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar devolución' }));
    expect(await screen.findByText('recepcion')).toBeInTheDocument();
  });

  it('Registrar incidencia lleva a incidencias', async () => {
    wizardMock.mockReturnValue(wizard());
    renderScreen();
    fireEvent.click(screen.getByRole('link', { name: 'Registrar incidencia' }));
    expect(await screen.findByText('incidencias')).toBeInTheDocument();
  });

  it('solicita ampliacion con la nueva fecha (ALQ-11) y recarga', async () => {
    const w = wizard();
    wizardMock.mockReturnValue(w);
    requestExtensionMock.mockResolvedValue({ ...baseRental, status: 'EXTENSION_PENDING' });
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar ampliación' }));
    const send = screen.getByRole('button', { name: 'Enviar solicitud' });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nueva fecha y hora/), { target: { value: '2026-10-25T10:00' } });
    fireEvent.click(send);
    await waitFor(() => expect(requestExtensionMock).toHaveBeenCalled());
    expect(requestExtensionMock.mock.calls[0].slice(1, 5)).toEqual(['rent-1', 'c1', 'b1', 5]);
    await waitFor(() => expect(w.reload).toHaveBeenCalled());
  });

  it('rechaza una nueva fecha anterior a la devolucion prevista', () => {
    wizardMock.mockReturnValue(wizard());
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar ampliación' }));
    fireEvent.change(screen.getByLabelText(/Nueva fecha y hora/), { target: { value: '2026-10-10T10:00' } });
    expect(screen.getByText(/debe ser posterior/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
  });

  it('muestra el error del backend al solicitar ampliacion', async () => {
    const { RentalCommandError } = await import('./rentals-client');
    wizardMock.mockReturnValue(wizard());
    requestExtensionMock.mockRejectedValue(new RentalCommandError(422, { code: 'X', detail: 'No se puede ampliar' }));
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar ampliación' }));
    fireEvent.change(screen.getByLabelText(/Nueva fecha y hora/), { target: { value: '2026-10-25T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('No se puede ampliar')).toBeInTheDocument();
  });

  it('EXTENSION_PENDING: Gerencia ve falta grave con requisitos reales; sin permiso no la ve', async () => {
    const pending = {
      ...baseRental,
      status: 'EXTENSION_PENDING',
      extensions: [{ id: 'e1', status: 'REQUESTED', requirements: { noticeGiven: false, authorized: false, paid: false, addendumSigned: false } }],
    };
    wizardMock.mockReturnValue(wizard(pending));
    const { unmount } = renderScreen();
    expect(screen.queryByRole('button', { name: 'Registrar falta grave' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar ampliación' })).toBeDisabled();
    unmount();

    setPermissions(['RENTAL.REPORT_EXTENSION_BREACH']);
    wizardMock.mockReturnValue(wizard(pending));
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar falta grave' }));
    expect(await screen.findByText('0 de 4 cumplidos')).toBeInTheDocument();
  });

  it('EXTENSION_PENDING: el panel de decision aparece solo con permiso de autorizar/rechazar (ALQ-11)', () => {
    const pending = {
      ...baseRental,
      status: 'EXTENSION_PENDING',
      extensions: [{ id: 'e1', status: 'PENDING', requestedEndAt: '2026-10-25T13:00:00Z', requirements: { noticeGiven: true, authorized: false, paid: false, addendumSigned: false } }],
    };
    wizardMock.mockReturnValue(wizard(pending));
    const { unmount } = renderScreen();
    expect(screen.getByTestId('extension-awaiting-manager')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Autorizar ampliación' })).not.toBeInTheDocument();
    unmount();

    setPermissions(['RENTAL.AUTHORIZE_EXTENSION', 'RENTAL.REJECT_EXTENSION']);
    wizardMock.mockReturnValue(wizard(pending));
    renderScreen();
    expect(screen.getByRole('button', { name: 'Autorizar ampliación' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rechazar ampliación' })).toBeEnabled();
  });

  it('un alquiler cerrado no ofrece acciones', () => {
    wizardMock.mockReturnValue(wizard({ ...baseRental, status: 'CLOSED' }));
    renderScreen();
    expect(screen.getByText(/ya no admite acciones/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar devolución' })).not.toBeInTheDocument();
  });

  describe('C1: BR-ALQ-014 Servicio de Aeropuerto en Alquiler Activo', () => {
    it('muestra el boton si tiene permiso RENTAL.REQUEST_AIRPORT_SERVICE y abre el modal', async () => {
      setPermissions(['RENTAL.REQUEST_AIRPORT_SERVICE']);
      wizardMock.mockReturnValue(wizard());
      renderScreen();

      const btn = screen.getByTestId('request-rental-airport-btn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Solicitar servicio de aeropuerto' })).toBeInTheDocument();

      fireEvent.change(screen.getByTestId('modal-airport-scheduled-at'), { target: { value: '2026-10-21T10:00' } });
      fireEvent.change(screen.getByTestId('modal-airport-location'), { target: { value: 'Aeropuerto AYP' } });
      fireEvent.change(screen.getByTestId('modal-airport-amount'), { target: { value: '60.00' } });

      requestAirportServiceMock.mockResolvedValueOnce({ ...baseRental, version: 6 });
      fireEvent.click(screen.getByTestId('modal-airport-submit-btn'));

      await waitFor(() => {
        expect(requestAirportServiceMock).toHaveBeenCalledWith(
          'tok',
          'rent-1',
          'c1',
          'b1',
          5,
          '2026-10-21T10:00',
          'Aeropuerto AYP',
          '60.00',
          undefined,
        );
      });
    });

    it('renderiza la tarjeta con los datos cuando ya existe servicio de aeropuerto', async () => {
      getAirportServiceMock.mockResolvedValueOnce({
        id: 'asp-1',
        rentalId: 'rent-1',
        status: 'REQUESTED',
        scheduledAt: '2026-10-21T10:00:00Z',
        location: 'Aeropuerto AYP',
        additionalAmount: '60.00',
        currency: 'PEN',
        notes: 'Vuelo LA2100',
        requestedByUserId: 'u1',
        requestedAt: '2026-10-20T12:00:00Z',
        createdAt: '2026-10-20T12:00:00Z',
        updatedAt: '2026-10-20T12:00:00Z',
      });
      wizardMock.mockReturnValue(wizard());
      renderScreen();

      await waitFor(() => {
        expect(screen.getByTestId('rental-airport-service-card')).toBeInTheDocument();
      });
      expect(screen.getByText('Solicitado')).toBeInTheDocument();
      expect(screen.getByText('Aeropuerto AYP')).toBeInTheDocument();
      expect(screen.getByText('S/ 60.00')).toBeInTheDocument();
      expect(screen.getByText('Vuelo LA2100')).toBeInTheDocument();
      expect(screen.queryByTestId('request-rental-airport-btn')).not.toBeInTheDocument();
    });
  });

  it('no tiene violaciones de accesibilidad', async () => {
    wizardMock.mockReturnValue(wizard());
    const { container } = renderScreen();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('GpsPanel (alerta BR-ALQ-010)', () => {
  it('UNAVAILABLE muestra la alerta y permite registrar incidencia', () => {
    const onIncident = vi.fn();
    render(<GpsPanel status="UNAVAILABLE" plate="D0Y-704" onRegisterIncident={onIncident} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/GPS no disponible/);
    fireEvent.click(screen.getByRole('button', { name: 'Registrar incidencia' }));
    expect(onIncident).toHaveBeenCalled();
  });

  it('AVAILABLE muestra la ultima posicion', () => {
    render(<GpsPanel status="AVAILABLE" plate="D0Y-704" lastPosition={{ label: 'Av. Lima', reportedAt: 'hace 2 min' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Av. Lima');
  });

  it('UNAVAILABLE no tiene violaciones axe', async () => {
    const { container } = render(<GpsPanel status="UNAVAILABLE" plate="D0Y-704" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
