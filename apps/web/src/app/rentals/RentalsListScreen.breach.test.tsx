import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RentalsListScreen } from './RentalsListScreen';
import { setPermissions, clearPermissions } from '../../test/permissions';

vi.mock('../shared/AppHeader', () => ({ AppHeader: () => <header>cabecera</header> }));

const listRentalsMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'gerente@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./rentals-client', () => ({
  listRentals: (...args: unknown[]) => listRentalsMock(...args),
  RentalCommandError: class RentalCommandError extends Error {
    constructor(public readonly status: number, public readonly problem: unknown) {
      super(`Error ${status}`);
    }
  },
}));

vi.mock('./SeriousBreachModal', () => ({
  SeriousBreachModal: ({ open, rental, onClose }: { open: boolean; rental: { vehiclePlate: string }; onClose: () => void }) =>
    open ? (
      <div role="dialog" aria-label="falta grave modal">
        modal para {rental.vehiclePlate}
        <button onClick={onClose}>cerrar modal</button>
      </div>
    ) : null,
}));

const baseRental = {
  id: 'rent-1',
  customerName: 'Maria Quispe',
  customerDocNumber: '12345678',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehiclePlate: 'D0Y-704',
  version: 1,
  deposit: { id: 'dep-1', originalAmount: '1000.00', currency: 'USD', status: 'HELD', createdAt: '' },
};

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/alquileres',
          state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
        },
      ]}
    >
      <Routes>
        <Route path="/alquileres" element={<RentalsListScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RentalsListScreen — Registrar falta grave (BR-ALQ-013)', () => {
  beforeEach(() => {
    listRentalsMock.mockReset();
    clearPermissions();
  });

  it('muestra el botón "Registrar falta grave" para EXTENSION_PENDING con permiso', async () => {
    setPermissions(['RENTAL.REPORT_EXTENSION_BREACH']);
    listRentalsMock.mockResolvedValue([{ ...baseRental, status: 'EXTENSION_PENDING' }]);
    renderScreen();

    expect(
      await screen.findByRole('button', { name: /Registrar falta grave de ampliación de D0Y-704/i }),
    ).toBeInTheDocument();
  });

  it('no muestra el botón sin el permiso RENTAL.REPORT_EXTENSION_BREACH', async () => {
    setPermissions([]);
    listRentalsMock.mockResolvedValue([{ ...baseRental, status: 'EXTENSION_PENDING' }]);
    renderScreen();

    await screen.findByText('Maria Quispe');
    expect(screen.queryByRole('button', { name: /Registrar falta grave/i })).not.toBeInTheDocument();
  });

  it('no muestra el botón para alquileres en estado ACTIVE (incluso con permiso)', async () => {
    setPermissions(['RENTAL.REPORT_EXTENSION_BREACH']);
    listRentalsMock.mockResolvedValue([{ ...baseRental, status: 'ACTIVE' }]);
    renderScreen();

    await screen.findByText('Maria Quispe');
    expect(screen.queryByRole('button', { name: /Registrar falta grave/i })).not.toBeInTheDocument();
  });

  it('abre el modal SeriousBreachModal al hacer clic en el botón', async () => {
    setPermissions(['RENTAL.REPORT_EXTENSION_BREACH']);
    listRentalsMock.mockResolvedValue([{ ...baseRental, status: 'EXTENSION_PENDING' }]);
    renderScreen();

    fireEvent.click(
      await screen.findByRole('button', { name: /Registrar falta grave de ampliación de D0Y-704/i }),
    );
    expect(screen.getByRole('dialog', { name: /falta grave modal/i })).toBeInTheDocument();
    expect(screen.getByText(/modal para D0Y-704/i)).toBeInTheDocument();
  });

  it('cierra el modal al invocar onClose desde el modal', async () => {
    setPermissions(['RENTAL.REPORT_EXTENSION_BREACH']);
    listRentalsMock.mockResolvedValue([{ ...baseRental, status: 'EXTENSION_PENDING' }]);
    renderScreen();

    fireEvent.click(
      await screen.findByRole('button', { name: /Registrar falta grave de ampliación de D0Y-704/i }),
    );
    expect(screen.getByRole('dialog', { name: /falta grave modal/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cerrar modal/i }));
    expect(screen.queryByRole('dialog', { name: /falta grave modal/i })).not.toBeInTheDocument();
  });
});
