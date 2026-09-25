import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReservationsListScreen } from './ReservationsListScreen';

const listReservationsMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./reservations-client', () => ({
  listReservations: (...args: unknown[]) => listReservationsMock(...args),
}));

vi.mock('../auth/work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
}));

function renderScreen(state?: Record<string, unknown>) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/reservas',
          state: state ?? { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
        },
      ]}
    >
      <Routes>
        <Route path="/reservas" element={<ReservationsListScreen />} />
        <Route path="/reservas/:id" element={<div>detalle</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const oneAssignment = [
  { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
];

const reservation = {
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
};

describe('ReservationsListScreen (RES-01)', () => {
  beforeEach(() => {
    listReservationsMock.mockReset();
    getWorkContextAssignmentsMock.mockReset().mockResolvedValue(oneAssignment);
  });

  it('muestra la bandeja con badges por estado y filtra por companyId+branchId (finding #1)', async () => {
    listReservationsMock.mockResolvedValue([reservation]);
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(screen.getByText('Borrador / No confirmada')).toBeInTheDocument();
    expect(screen.getByText('Continuar')).toBeInTheDocument();
    expect(listReservationsMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
  });

  // Finding #3: la fila debe ser alcanzable por teclado, no solo por click.
  it('cada fila tiene un link accesible con nombre propio (finding #3, teclado)', async () => {
    listReservationsMock.mockResolvedValue([reservation]);
    renderScreen();

    const rowLink = await screen.findByRole('link', { name: 'Ver detalle de la reserva de Maria Quispe' });
    expect(rowLink).toHaveAttribute('href', '/reservas/res-1');
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

  // Finding #8: location.state manipulado/desactualizado se ignora.
  it('si location.state no coincide con ninguna asignacion real, se ignora y se resuelve con la asignacion real', async () => {
    listReservationsMock.mockResolvedValue([reservation]);
    renderScreen({
      companyId: 'empresa-ajena',
      companyName: 'Otra Empresa',
      branchId: 'sede-ajena',
      branchName: 'Sede ajena',
    });

    await screen.findByText('Maria Quispe');
    expect(listReservationsMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
  });
});
