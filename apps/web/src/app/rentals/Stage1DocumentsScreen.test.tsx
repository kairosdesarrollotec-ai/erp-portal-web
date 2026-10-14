import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Stage1DocumentsScreen } from './Stage1DocumentsScreen';

vi.mock('../shared/AppHeader', () => ({ AppHeader: () => <header>cabecera</header> }));

const getRentalMock = vi.fn();
const validateDocumentsMock = vi.fn();
const requestUploadSessionMock = vi.fn();
const uploadFileToGcsMock = vi.fn();
const recordRentalDocumentMock = vi.fn();

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
    requestRentalDocumentUploadSession: (...args: unknown[]) => requestUploadSessionMock(...args),
    uploadFileToGcs: (...args: unknown[]) => uploadFileToGcsMock(...args),
    recordRentalDocument: (...args: unknown[]) => recordRentalDocumentMock(...args),
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
    requestUploadSessionMock.mockReset();
    uploadFileToGcsMock.mockReset();
    recordRentalDocumentMock.mockReset();

    requestUploadSessionMock.mockResolvedValue({ uploadUrl: 'https://gcs.example/upload', objectUrl: 'https://gcs.example/obj' });
    uploadFileToGcsMock.mockResolvedValue(undefined);
    recordRentalDocumentMock.mockResolvedValue({});
  });

  it('muestra cliente y vehiculo heredados y habilita continuar solo tras subir licencia e identificacion', async () => {
    getRentalMock.mockResolvedValue(baseRental);
    validateDocumentsMock.mockResolvedValue({ ...baseRental, status: 'VALIDATION', version: 2 });

    const { container } = renderScreen();

    expect(await screen.findByText(/Maria Quispe/)).toBeInTheDocument();
    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    expect(continueButton).toBeDisabled();

    // Simular upload de licencia: encontrar el input[type=file] correspondiente
    const fileInputs = container.querySelectorAll('input[type="file"]');
    const licenseInput = fileInputs[0];
    const idDocInput = fileInputs[1];

    const fakeFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });

    // Upload licencia
    fireEvent.change(licenseInput, { target: { files: [fakeFile] } });
    await waitFor(() => expect(requestUploadSessionMock).toHaveBeenCalledWith(
      'fake-id-token', 'rent-1', 'c1', 'b1', 'LICENSE', 'application/pdf', expect.any(Number),
    ));
    await waitFor(() => expect(continueButton).toBeDisabled()); // aun falta ID

    // Upload identificacion
    fireEvent.change(idDocInput, { target: { files: [fakeFile] } });
    await waitFor(() => expect(requestUploadSessionMock).toHaveBeenCalledWith(
      'fake-id-token', 'rent-1', 'c1', 'b1', 'ID_DOCUMENT', 'application/pdf', expect.any(Number),
    ));
    await waitFor(() => expect(continueButton).not.toBeDisabled());

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
