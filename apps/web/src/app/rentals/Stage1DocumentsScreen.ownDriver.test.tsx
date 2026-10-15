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
const registerDriverMock = vi.fn();
const listCustomersMock = vi.fn();

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
    registerAuthorizedDriver: (...args: unknown[]) => registerDriverMock(...args),
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

vi.mock('../customers/customers-client', async () => {
  const actual = await vi.importActual<typeof import('../customers/customers-client')>('../customers/customers-client');
  return { ...actual, listCustomers: (...args: unknown[]) => listCustomersMock(...args) };
});

const legalRental = { ...baseRental, customerName: 'Transportes SAC', customerDocNumber: '20123456789' };

async function uploadRequiredDocs(container: HTMLElement) {
  const inputs = container.querySelectorAll('input[type="file"]');
  const file = new File(['c'], 'doc.pdf', { type: 'application/pdf' });
  fireEvent.change(inputs[0], { target: { files: [file] } });
  await waitFor(() => expect(recordRentalDocumentMock).toHaveBeenCalledTimes(1));
  fireEvent.change(inputs[1], { target: { files: [file] } });
  await waitFor(() => expect(recordRentalDocumentMock).toHaveBeenCalledTimes(2));
}

describe('Stage1DocumentsScreen - conductor propio (DEC-ALQ-OWN-DRIVER-005)', () => {
  beforeEach(() => {
    getRentalMock.mockReset();
    validateDocumentsMock.mockReset();
    registerDriverMock.mockReset();
    listCustomersMock.mockReset();
    requestUploadSessionMock.mockResolvedValue({ uploadUrl: 'https://gcs.example/upload', objectUrl: 'https://gcs.example/obj' });
    uploadFileToGcsMock.mockResolvedValue(undefined);
    recordRentalDocumentMock.mockReset();
    recordRentalDocumentMock.mockResolvedValue({});
  });

  it('titular persona natural: no ofrece conductor propio', async () => {
    getRentalMock.mockResolvedValue(baseRental);
    renderScreen();
    await screen.findByText(/Maria Quispe/);
    expect(screen.getByRole('button', { name: 'Persona jurídica' })).toBeDisabled();
    expect(screen.getByTestId('natural-no-own-driver')).toBeInTheDocument();
    expect(screen.queryByTestId('own-driver-form')).not.toBeInTheDocument();
  });

  it('titular juridico: pide cliente-conductor y adenda, registra el conductor y luego valida con la version nueva', async () => {
    getRentalMock.mockResolvedValue(legalRental);
    listCustomersMock.mockResolvedValue({ items: [{ id: 'cust-9', fullName: 'Juan Perez', documentNumber: '40404040' }] });
    registerDriverMock.mockResolvedValue({ ...legalRental, version: 2, parties: [{ id: 'p1', customerId: 'cust-9', role: 'DRIVER', addendumDocumentRef: 'ADENDA-1', createdAt: '' }] });
    validateDocumentsMock.mockResolvedValue({ ...legalRental, version: 3 });
    const { container } = renderScreen();
    await screen.findByText(/Transportes SAC/);
    fireEvent.click(screen.getByRole('button', { name: 'Persona jurídica' }));
    await uploadRequiredDocs(container);
    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    expect(continueButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Buscar cliente-conductor/), { target: { value: 'Juan' } });
    fireEvent.click(await screen.findByRole('button', { name: /Juan Perez/ }));
    expect(continueButton).toBeDisabled(); // falta la adenda
    fireEvent.change(screen.getByLabelText(/Referencia de la adenda/), { target: { value: 'ADENDA-1' } });
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);

    expect(await screen.findByText('etapa 2')).toBeInTheDocument();
    expect(registerDriverMock).toHaveBeenCalledWith('fake-id-token', 'rent-1', 'c1', 'b1', 1, 'cust-9', 'ADENDA-1', 'LEGAL');
    expect(validateDocumentsMock.mock.calls[0][4]).toBe(2);
  });

  it('muestra el mensaje traducido de NATURAL_PERSON_OWN_DRIVER_NOT_ALLOWED', async () => {
    getRentalMock.mockResolvedValue(legalRental);
    listCustomersMock.mockResolvedValue({ items: [{ id: 'cust-9', fullName: 'Juan Perez', documentNumber: '40404040' }] });
    const { RentalCommandError } = await import('./rentals-client');
    registerDriverMock.mockRejectedValue(new RentalCommandError(422, { code: 'NATURAL_PERSON_OWN_DRIVER_NOT_ALLOWED', detail: 'x' }));
    const { container } = renderScreen();
    await screen.findByText(/Transportes SAC/);
    fireEvent.click(screen.getByRole('button', { name: 'Persona jurídica' }));
    await uploadRequiredDocs(container);
    fireEvent.change(screen.getByLabelText(/Buscar cliente-conductor/), { target: { value: 'Juan' } });
    fireEvent.click(await screen.findByRole('button', { name: /Juan Perez/ }));
    fireEvent.change(screen.getByLabelText(/Referencia de la adenda/), { target: { value: 'A-1' } });
    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    expect(await screen.findByRole('alert')).toHaveTextContent(/persona natural no puede tener un conductor propio/i);
    expect(validateDocumentsMock).not.toHaveBeenCalled();
  });

  it('si ya hay conductor registrado no vuelve a pedirlo', async () => {
    getRentalMock.mockResolvedValue({ ...legalRental, parties: [{ id: 'p1', customerId: 'c', role: 'DRIVER', addendumDocumentRef: 'ADENDA-7', createdAt: '' }] });
    renderScreen();
    await screen.findByText(/Transportes SAC/);
    fireEvent.click(screen.getByRole('button', { name: 'Persona jurídica' }));
    expect(screen.getByTestId('registered-driver')).toHaveTextContent('ADENDA-7');
    expect(screen.queryByTestId('own-driver-form')).not.toBeInTheDocument();
  });
});
