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
vi.mock('./rentals-extensions-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-extensions-client')>('./rentals-extensions-client');
  return { ...actual, requestExtension: (...a: unknown[]) => requestExtensionMock(...a) };
});
vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return { ...actual, reportExtensionBreach: (...a: unknown[]) => reportBreachMock(...a) };
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

  it('un alquiler cerrado no ofrece acciones', () => {
    wizardMock.mockReturnValue(wizard({ ...baseRental, status: 'CLOSED' }));
    renderScreen();
    expect(screen.getByText(/ya no admite acciones/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar devolución' })).not.toBeInTheDocument();
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
