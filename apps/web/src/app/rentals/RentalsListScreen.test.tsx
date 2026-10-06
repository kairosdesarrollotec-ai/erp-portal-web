import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/alquileres', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } }]}
    >
      <Routes>
        <Route path="/alquileres" element={<RentalsListScreen />} />
        <Route path="/alquileres/:id/entrega-01" element={<div>etapa 1</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RentalsListScreen (ALQ-01)', () => {
  beforeEach(() => {
    listRentalsMock.mockReset();
  });

  it('muestra la bandeja con etapa y boton continuar', async () => {
    listRentalsMock.mockResolvedValue([
      {
        id: 'rent-1',
        status: 'DRAFT',
        customerName: 'Maria Quispe',
        customerDocNumber: '12345678',
        vehicleBrand: 'Toyota',
        vehicleModel: 'Hilux',
        vehiclePlate: 'D0Y-704',
        version: 1,
      },
    ]);
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(screen.getByText('Continuar')).toBeInTheDocument();
  });

  it('muestra el estado vacio cuando no hay alquileres', async () => {
    listRentalsMock.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('Todavía no hay alquileres registrados.')).toBeInTheDocument();
  });

  it('no ofrece "Nuevo alquiler": todo alquiler nace de una Consulta', async () => {
    listRentalsMock.mockResolvedValue([]);
    renderScreen();
    await screen.findByText('Todavía no hay alquileres registrados.');
    expect(screen.queryByText(/nuevo alquiler/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /nuevo alquiler/i })).not.toBeInTheDocument();
  });
});
