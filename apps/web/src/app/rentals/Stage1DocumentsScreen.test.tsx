import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

  async function upload(container: HTMLElement, rowLabel: RegExp, n: number) {
    const row = screen.getByText(rowLabel).closest('div') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Subir' }));
    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } });
    await waitFor(() => expect(recordRentalDocumentMock).toHaveBeenCalledTimes(n));
  }

  it('peruano: exige licencia, DNI y recibo (los tres obligatorios) y envia los booleanos por campo', async () => {
    getRentalMock.mockResolvedValue(baseRental);
    validateDocumentsMock.mockResolvedValue({ ...baseRental, status: 'VALIDATION', version: 2 });

    const { container } = renderScreen();

    expect(await screen.findByText(/Maria Quispe/)).toBeInTheDocument();
    expect(screen.getByText('Recibo de agua o luz')).toBeInTheDocument();
    expect(screen.queryByText(/opcional/i)).not.toBeInTheDocument();
    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    expect(continueButton).toBeDisabled();

    await upload(container, /Licencia de conducir/, 1);
    expect(requestUploadSessionMock).toHaveBeenCalledWith(
      'fake-id-token', 'rent-1', 'c1', 'b1', 'LICENSE', 'application/pdf', expect.any(Number),
    );
    await upload(container, /^DNI$/, 2);
    expect(requestUploadSessionMock).toHaveBeenCalledWith(
      'fake-id-token', 'rent-1', 'c1', 'b1', 'ID_DOCUMENT', 'application/pdf', expect.any(Number),
    );
    expect(continueButton).toBeDisabled(); // aun falta el comprobante de domicilio

    await upload(container, /Recibo de agua o luz/, 3);
    expect(requestUploadSessionMock).toHaveBeenCalledWith(
      'fake-id-token', 'rent-1', 'c1', 'b1', 'PROOF_OF_ADDRESS', 'application/pdf', expect.any(Number),
    );
    await waitFor(() => expect(continueButton).not.toBeDisabled());

    fireEvent.click(continueButton);

    expect(await screen.findByText('etapa 2')).toBeInTheDocument();
    expect(validateDocumentsMock).toHaveBeenCalledWith('fake-id-token', 'rent-1', 'c1', 'b1', 1, {
      identityDocumentValid: true,
      driverLicenseValid: true,
      addressOrStayProofValid: true,
    });
  });

  it('extranjero: pasaporte + CE + licencia + constancia de hospedaje, y la fecha de ingreso como dato informativo', async () => {
    const foreign = {
      ...baseRental,
      customerDocNumber: 'X1234567',
      customerNationality: 'EXTRANJERO',
      requiredDocuments: [
        { code: 'PASAPORTE', label: 'Pasaporte', kind: 'DOCUMENT', field: 'passportValid' },
        { code: 'CARNE_EXTRANJERIA', label: 'Carné de extranjería (CE)', kind: 'DOCUMENT', field: 'foreignerCardValid' },
        { code: 'LICENCIA_CONDUCIR', label: 'Licencia de conducir vigente', kind: 'DOCUMENT', field: 'driverLicenseValid' },
        { code: 'CONSTANCIA_HOSPEDAJE', label: 'Constancia de hospedaje', kind: 'DOCUMENT', field: 'addressOrStayProofValid' },
        { code: 'FECHA_INGRESO', label: 'Fecha de ingreso al país', kind: 'DATA', field: null },
      ],
    };
    getRentalMock.mockResolvedValue(foreign);
    validateDocumentsMock.mockResolvedValue({ ...foreign, status: 'VALIDATION', version: 2 });

    const { container } = renderScreen();
    expect(await screen.findByText(/Maria Quispe/)).toBeInTheDocument();
    expect(screen.getByTestId('doc-data-FECHA_INGRESO')).toBeInTheDocument();
    expect(screen.queryByText('DNI')).not.toBeInTheDocument();

    await upload(container, /Licencia de conducir/, 1);
    await upload(container, /^Pasaporte$/, 2);
    await upload(container, /Carné de extranjería/, 3);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    await upload(container, /Constancia de hospedaje/, 4);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await screen.findByText('etapa 2');
    expect(validateDocumentsMock.mock.calls[0][5]).toEqual({
      passportValid: true,
      foreignerCardValid: true,
      driverLicenseValid: true,
      addressOrStayProofValid: true,
    });
  });

  it('muestra los documentos faltantes cuando el back responde 422 DOCUMENTS_INCOMPLETE', async () => {
    const { RentalCommandError } = await import('./rentals-client');
    getRentalMock.mockResolvedValue(baseRental);
    validateDocumentsMock.mockRejectedValue(
      new RentalCommandError(422, { code: 'DOCUMENTS_INCOMPLETE', missingDocuments: ['RECIBO_AGUA_LUZ'] }),
    );
    const { container } = renderScreen();
    await screen.findByText(/Maria Quispe/);
    await upload(container, /Licencia de conducir/, 1);
    await upload(container, /^DNI$/, 2);
    await upload(container, /Recibo de agua o luz/, 3);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText(/Faltan documentos requeridos: Recibo de agua o luz/)).toBeInTheDocument();
  });
});
