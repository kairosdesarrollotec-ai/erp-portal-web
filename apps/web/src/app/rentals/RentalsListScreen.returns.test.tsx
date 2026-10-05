import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RentalsListScreen } from './RentalsListScreen';

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

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/alquileres', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } }]}
    >
      <Routes>
        <Route path="/alquileres" element={<RentalsListScreen />} />
        <Route path="/devoluciones/recepcion/:rentalId" element={<div>recepcion de devolucion</div>} />
        <Route path="/devoluciones" element={<div>bandeja de devoluciones</div>} />
        <Route path="/alquileres/:id/entrega-05" element={<div>entrega 5</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RentalsListScreen - acceso a Devolucion (ALQ-10 -> DEV-02)', () => {
  beforeEach(() => {
    listRentalsMock.mockReset();
  });

  it('un alquiler ACTIVE muestra "Iniciar devolución" y lleva a la recepcion (1 accion)', async () => {
    listRentalsMock.mockResolvedValue([{ ...baseRental, id: 'rent-1', status: 'ACTIVE' }]);
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(screen.queryByText('Continuar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar devolución de D0Y-704/ }));
    expect(await screen.findByText('recepcion de devolucion')).toBeInTheDocument();
  });

  it('un alquiler RETURN_IN_PROGRESS lleva a la bandeja de devoluciones', async () => {
    listRentalsMock.mockResolvedValue([{ ...baseRental, id: 'rent-2', status: 'RETURN_IN_PROGRESS' }]);
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: /Continuar devolución de D0Y-704/ }));
    expect(await screen.findByText('bandeja de devoluciones')).toBeInTheDocument();
  });

  it('un alquiler cerrado no ofrece acciones', async () => {
    listRentalsMock.mockResolvedValue([{ ...baseRental, id: 'rent-3', status: 'CLOSED' }]);
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).queryByRole('button')).not.toBeInTheDocument();
  });
});
