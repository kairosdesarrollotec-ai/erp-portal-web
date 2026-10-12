import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
import { RentalsListScreen } from './RentalsListScreen';
import { setPermissions, INCIDENT_ALL } from '../../test/permissions';

vi.mock('../shared/AppHeader', () => ({ AppHeader: () => <header>cabecera</header> }));

const listRentalsMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
vi.mock('./rentals-client', () => ({
  listRentals: (...args: unknown[]) => listRentalsMock(...args),
}));

const baseRental = {
  customerName: 'Maria Quispe',
  customerDocNumber: '12345678',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehiclePlate: 'D0Y-704',
  version: 1,
};

function IncidentsProbe() {
  const [params] = useSearchParams();
  const location = useLocation();
  const state = location.state as { companyId?: string } | null;
  return <div>bandeja de incidencias rentalId={params.get('rentalId')} ctx={state?.companyId}</div>;
}

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/alquileres', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } }]}
    >
      <Routes>
        <Route path="/alquileres" element={<RentalsListScreen />} />
        <Route path="/incidencias" element={<IncidentsProbe />} />
        <Route path="/devoluciones/recepcion/:rentalId" element={<div>recepcion</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RentalsListScreen - acceso a Incidencias (ALQ-10 -> INC-01)', () => {
  beforeEach(() => {
    listRentalsMock.mockReset();
    setPermissions(INCIDENT_ALL);
  });

  it('un alquiler ACTIVE ofrece "Ver/Registrar incidencias" que lleva a /incidencias?rentalId= conservando el contexto', async () => {
    listRentalsMock.mockResolvedValue([{ ...baseRental, id: 'rent-1', status: 'ACTIVE' }]);
    renderScreen();

    fireEvent.click(await screen.findByRole('link', { name: /Ver o registrar incidencias de D0Y-704/ }));
    expect(await screen.findByText('bandeja de incidencias rentalId=rent-1 ctx=c1')).toBeInTheDocument();
  });

  it('un alquiler en borrador no ofrece el enlace, ni quien no tiene INCIDENT.VIEW', async () => {
    listRentalsMock.mockResolvedValue([{ ...baseRental, id: 'rent-2', status: 'DRAFT' }]);
    const { unmount } = renderScreen();
    await screen.findByText('Maria Quispe');
    expect(screen.queryByRole('link', { name: /incidencias/i })).toBeNull();
    unmount();

    setPermissions([]);
    listRentalsMock.mockResolvedValue([{ ...baseRental, id: 'rent-3', status: 'ACTIVE' }]);
    renderScreen();
    await screen.findByText('Maria Quispe');
    expect(screen.queryByRole('link', { name: /incidencias/i })).toBeNull();
  });
});
