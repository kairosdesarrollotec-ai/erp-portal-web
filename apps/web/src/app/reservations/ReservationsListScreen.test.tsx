import { describe, it, expect, vi, beforeEach } from 'vitest';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReservationsListScreen } from './ReservationsListScreen';

const listReservationsMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./reservations-client', () => ({
  listReservations: (...args: unknown[]) => listReservationsMock(...args),
}));

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reservas', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } }]}>
      <Routes>
        <Route path="/reservas" element={<ReservationsListScreen />} />
        <Route path="/reservas/:id" element={<div>detalle</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReservationsListScreen (RES-01)', () => {
  beforeEach(() => {
    listReservationsMock.mockReset();
    sessionStorage.clear();
  });

  it('muestra la bandeja con badges por estado', async () => {
    listReservationsMock.mockResolvedValue([
      {
        id: 'res-1',
        status: 'DRAFT',
        channelMode: 'PRESENCIAL',
        version: 1,
        customer: { id: 'c', name: 'Maria Quispe' },
        vehicle: { id: 'v', plate: 'D0Y-704', label: 'Toyota Hilux - D0Y-704' },
        startAt: '2026-09-20T14:00:00Z',
        endAt: '2026-09-22T14:00:00Z',
        requiredPayment: { amount: '300.00', currency: 'PEN' },
        requirements: { paymentValidatedAt: null, documentsCompletedAt: null },
        missingRequirements: ['PAYMENT_VALIDATION', 'DOCUMENTS_COMPLETE'],
        confirmedAt: null,
        createdAt: '2026-09-16T00:00:00Z',
      },
    ]);
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /Borrador \/ No confirmada/ })).toBeInTheDocument();
    expect(screen.getByText('VeloxRent')).toBeInTheDocument(); // columna Empresa
    expect(screen.getByText('Continuar')).toBeInTheDocument();
  });

  it('muestra el estado vacio cuando no hay reservas', async () => {
    listReservationsMock.mockResolvedValue([]);
    renderScreen();

    expect(await screen.findByText('Todavía no hay reservas registradas.')).toBeInTheDocument();
  });

  it('muestra el error recuperable si la carga falla', async () => {
    listReservationsMock.mockRejectedValue(new Error('network'));
    renderScreen();

    expect(
      await screen.findByText(/No pudimos cargar la bandeja de reservas/),
    ).toBeInTheDocument();
  });

  it('filtra por estado y por cliente, conserva el filtro en la sesion y ofrece Nueva reserva (va a Consulta)', async () => {
    const base = {
      channelMode: 'PRESENCIAL', version: 1, vehicle: { id: 'v', plate: 'D0Y-704', label: 'Toyota Hilux - D0Y-704' },
      startAt: '2026-09-20T14:00:00Z', endAt: '2026-09-22T14:00:00Z', createdAt: '2026-09-16T00:00:00Z',
    };
    listReservationsMock.mockResolvedValue([
      { ...base, id: 'r1', status: 'DRAFT', customer: { id: 'c1', name: 'Maria Quispe' } },
      { ...base, id: 'r2', status: 'CONFIRMED', customer: { id: 'c2', name: 'Juan Perez' } },
    ]);
    renderScreen();
    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filtrar por cliente o vehículo'), { target: { value: 'juan' } });
    expect(screen.queryByText('Maria Quispe')).not.toBeInTheDocument();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('kairos.reservas.filtros') ?? '{}').query).toBe('juan');

    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'DRAFT' } });
    expect(await screen.findByText('Ninguna reserva coincide con los filtros.')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Nueva reserva/ })).toBeInTheDocument();
  });
});
