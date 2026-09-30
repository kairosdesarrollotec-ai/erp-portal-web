import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Stage1DocumentsScreen } from './Stage1DocumentsScreen';

const getRentalMock = vi.fn();
const validateDocumentsMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    getRental: (...args: unknown[]) => getRentalMock(...args),
    validateDocuments: (...args: unknown[]) => validateDocumentsMock(...args),
  };
});

const baseRental = {
  id: 'rent-1',
  status: 'DRAFT',
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
      initialEntries={[
        { pathname: '/alquileres/rent-1/entrega-01', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path="/alquileres/:id/entrega-01" element={<Stage1DocumentsScreen />} />
        <Route path="/alquileres/:id/entrega-02" element={<div>etapa 2</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Stage1DocumentsScreen (ENTREGA-01)', () => {
  beforeEach(() => {
    getRentalMock.mockReset();
    validateDocumentsMock.mockReset();
  });

  it('muestra cliente y vehiculo heredados y habilita continuar al marcar documentos', async () => {
    getRentalMock.mockResolvedValue(baseRental);
    validateDocumentsMock.mockResolvedValue({ ...baseRental, status: 'VALIDATION', version: 2 });

    renderScreen();

    expect(await screen.findByText(/Maria Quispe/)).toBeInTheDocument();
    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    expect(continueButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/Licencia de conducir/));
    fireEvent.click(screen.getByLabelText(/^DNI válido$/));

    expect(continueButton).not.toBeDisabled();
    fireEvent.click(continueButton);

    expect(await screen.findByText('etapa 2')).toBeInTheDocument();
    expect(validateDocumentsMock).toHaveBeenCalledWith(
      'fake-id-token',
      'rent-1',
      'c1',
      'b1',
      1,
      expect.objectContaining({ identityDocumentValid: true, driverLicenseValid: true }),
    );
  });
});
