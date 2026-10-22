import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NewRentalScreen } from './NewRentalScreen';
import { RentalCommandError } from './rentals-client';

vi.mock('../shared/AppHeader', () => ({ AppHeader: () => <header>cabecera</header> }));

const createRentalFromReservationMock = vi.fn();
const getInquiryMock = vi.fn();
const convertInquiryToRentalMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    createRentalFromReservation: (...args: unknown[]) => createRentalFromReservationMock(...args),
  };
});

vi.mock('../inquiries/inquiries-client', async () => {
  const actual = await vi.importActual<typeof import('../inquiries/inquiries-client')>('../inquiries/inquiries-client');
  return {
    ...actual,
    getInquiry: (...args: unknown[]) => getInquiryMock(...args),
    convertInquiryToRental: (...args: unknown[]) => convertInquiryToRentalMock(...args),
  };
});

const workContext = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' };

function renderScreen(navState: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/alquileres/nuevo', state: { ...workContext, ...navState } }]}>
      <Routes>
        <Route path="/alquileres/nuevo" element={<NewRentalScreen />} />
        <Route path="/alquileres/:id/entrega-01" element={<div>etapa 1</div>} />
        <Route path="/consultas" element={<div>bandeja de consultas</div>} />
        <Route path="/reservas/:id/no-show" element={<div>protocolo no-show</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NewRentalScreen (ALQ-02) - la Consulta es el unico punto de entrada', () => {
  beforeEach(() => {
    createRentalFromReservationMock.mockReset();
    getInquiryMock.mockReset();
    convertInquiryToRentalMock.mockReset();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sin consulta ni reserva no hay alquiler directo: boton deshabilitado y enlace a Consultas', () => {
    renderScreen({ customerId: 'cust-1', vehicleId: 'veh-1' });
    expect(screen.getByRole('button', { name: 'Crear expediente' })).toBeDisabled();
    expect(screen.getByText(/Todo alquiler nace de una Consulta/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Consultas' })).toBeInTheDocument();
  });

  it('desde una reserva llama a createRentalFromReservation y navega a entrega-01', async () => {
    createRentalFromReservationMock.mockResolvedValue({ id: 'rent-new' });
    renderScreen({ reservationId: 'res-1', startAt: '2026-10-22T14:00:00Z' });

    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));

    await waitFor(() => expect(screen.getByText('etapa 1')).toBeInTheDocument());
    expect(createRentalFromReservationMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', 'res-1', undefined);
  });

  it('antes de la fecha pactada (hora de Lima) deshabilita el boton y explica cuando estara disponible', () => {
    renderScreen({ reservationId: 'res-1', startAt: '2026-10-25T15:00:00Z' });
    expect(screen.getByRole('button', { name: 'Crear expediente' })).toBeDisabled();
    expect(screen.getByTestId('agreed-date-notice')).toHaveTextContent('Disponible el día pactado: 25/10');
  });

  it('desde una consulta convierte con convert-to-rental (envia el origen = Consulta)', async () => {
    getInquiryMock.mockResolvedValue({ id: 'inq-1', version: 4 });
    convertInquiryToRentalMock.mockResolvedValue({ rental: { id: 'rent-from-inquiry' } });
    renderScreen({ inquiryId: 'inq-1', customerName: 'Maria Quispe', vehicleLabel: 'Toyota Hilux' });

    expect(screen.getByText('Maria Quispe')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));

    await waitFor(() => expect(screen.getByText('etapa 1')).toBeInTheDocument());
    expect(convertInquiryToRentalMock).toHaveBeenCalledWith('fake-id-token', 'inq-1', 4, 'c1', 'b1');
  });

  it('traduce INQUIRY_CONVERSION_REQUIRED', async () => {
    createRentalFromReservationMock.mockRejectedValue(new RentalCommandError(422, { code: 'INQUIRY_CONVERSION_REQUIRED', detail: 'x' }));
    renderScreen({ reservationId: 'res-1', startAt: '2026-10-22T14:00:00Z' });

    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));

    expect(await screen.findByText(/Convertir a Alquiler/)).toBeInTheDocument();
  });

  it('RESERVATION_START_NOT_REACHED explica que solo se puede el dia pactado', async () => {
    createRentalFromReservationMock.mockRejectedValue(new RentalCommandError(422, { code: 'RESERVATION_START_NOT_REACHED' }));
    renderScreen({ reservationId: 'res-1', startAt: '2026-10-22T14:00:00Z' });

    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));

    expect(await screen.findByText(/Todavía no llegó la fecha pactada/)).toBeInTheDocument();
  });

  it('RESERVATION_START_DATE_PASSED sugiere el protocolo no-show', async () => {
    createRentalFromReservationMock.mockRejectedValue(new RentalCommandError(422, { code: 'RESERVATION_START_DATE_PASSED' }));
    renderScreen({ reservationId: 'res-1', startAt: '2026-10-22T14:00:00Z' });

    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));

    expect(await screen.findByText(/La fecha pactada de la reserva ya pasó/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Ir al protocolo de no-show' }));
    expect(await screen.findByText('protocolo no-show')).toBeInTheDocument();
  });

  it('muestra mensaje generico cuando el error no es de dominio', async () => {
    createRentalFromReservationMock.mockRejectedValue(new Error('Network error'));
    renderScreen({ reservationId: 'res-1', startAt: '2026-10-22T14:00:00Z' });

    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));

    expect(await screen.findByText('No pudimos crear el expediente de alquiler.')).toBeInTheDocument();
  });
});
