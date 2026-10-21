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
const registerCompanionMock = vi.fn();
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
    registerCompanion: (...args: unknown[]) => registerCompanionMock(...args),
  };
});

vi.mock('../customers/customers-client', async () => {
  const actual = await vi.importActual<typeof import('../customers/customers-client')>('../customers/customers-client');
  return { ...actual, listCustomers: (...args: unknown[]) => listCustomersMock(...args) };
});

const naturalRental = {
  id: 'rent-1',
  status: 'DRAFT',
  customerName: 'Maria Quispe',
  customerDocNumber: '12345678',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehiclePlate: 'D0Y-704',
  version: 1,
};
const legalRental = { ...naturalRental, customerName: 'Transportes SAC', customerDocNumber: '20123456789' };

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

async function uploadRequiredDocs(container: HTMLElement) {
  const inputs = container.querySelectorAll('input[type="file"]');
  const file = new File(['c'], 'doc.pdf', { type: 'application/pdf' });
  fireEvent.change(inputs[0], { target: { files: [file] } });
  await waitFor(() => expect(recordRentalDocumentMock).toHaveBeenCalledTimes(1));
  fireEvent.change(inputs[1], { target: { files: [file] } });
  await waitFor(() => expect(recordRentalDocumentMock).toHaveBeenCalledTimes(2));
}

async function fillCompanionForm() {
  fireEvent.change(screen.getByLabelText(/Buscar acompañante/), { target: { value: 'Rosa' } });
  fireEvent.click(await screen.findByRole('button', { name: /Rosa Diaz/ }));
  fireEvent.change(screen.getByLabelText(/Motivo por el que el titular no firma/), { target: { value: 'Licencia extranjera no valida' } });
  fireEvent.change(screen.getByLabelText(/Buscar conductor real/), { target: { value: 'Luis' } });
  fireEvent.click(await screen.findByRole('button', { name: /Luis Rojas/ }));
}

describe('Stage1DocumentsScreen - acompanante autorizado (DEC-ALQ-COMPANION-006)', () => {
  beforeEach(() => {
    [getRentalMock, validateDocumentsMock, registerCompanionMock, listCustomersMock, recordRentalDocumentMock].forEach((m) => m.mockReset());
    requestUploadSessionMock.mockResolvedValue({ uploadUrl: 'https://gcs.example/upload', objectUrl: 'https://gcs.example/obj' });
    uploadFileToGcsMock.mockResolvedValue(undefined);
    recordRentalDocumentMock.mockResolvedValue({});
  });

  it('persona juridica: el chip Acompanante esta deshabilitado', async () => {
    getRentalMock.mockResolvedValue(legalRental);
    renderScreen();
    await screen.findByText(/Transportes SAC/);
    expect(screen.getByRole('button', { name: 'Acompañante' })).toBeDisabled();
  });

  it('persona natural: pide acompanante y motivo, lo registra y luego valida con la version nueva', async () => {
    getRentalMock.mockResolvedValue(naturalRental);
    listCustomersMock.mockImplementation(async (...args: unknown[]) => {
      const q = JSON.stringify(args);
      return { items: q.includes('Luis') ? [{ id: 'cust-6', fullName: 'Luis Rojas', documentNumber: '40404040' }] : [{ id: 'cust-5', fullName: 'Rosa Diaz', documentNumber: '30303030' }] };
    });
    registerCompanionMock.mockResolvedValue({ ...naturalRental, version: 2, parties: [{ id: 'p1', customerId: 'cust-5', role: 'RESPONSIBLE', addendumDocumentRef: null, createdAt: '' }] });
    validateDocumentsMock.mockResolvedValue({ ...naturalRental, version: 3 });
    const { container } = renderScreen();
    await screen.findByText(/Maria Quispe/);
    fireEvent.click(screen.getByRole('button', { name: 'Acompañante' }));
    await uploadRequiredDocs(container);
    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    expect(continueButton).toBeDisabled();

    await fillCompanionForm();
    expect(continueButton).toBeDisabled(); // faltan los checks de licencia verificada
    fireEvent.click(screen.getByLabelText(/Licencia vigente del acompañante verificada/));
    expect(continueButton).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Licencia vigente del conductor real verificada/));
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);

    expect(await screen.findByText('etapa 2')).toBeInTheDocument();
    expect(registerCompanionMock).toHaveBeenCalledWith('fake-id-token', 'rent-1', 'c1', 'b1', 1, 'cust-5', 'cust-6', true, true, 'Licencia extranjera no valida', undefined, 'NATURAL');
    expect(validateDocumentsMock.mock.calls[0][4]).toBe(2);
  });

  it('muestra el mensaje traducido si el backend rechaza y no valida', async () => {
    getRentalMock.mockResolvedValue(naturalRental);
    listCustomersMock.mockImplementation(async (...args: unknown[]) => {
      const q = JSON.stringify(args);
      return { items: q.includes('Luis') ? [{ id: 'cust-6', fullName: 'Luis Rojas', documentNumber: '40404040' }] : [{ id: 'cust-5', fullName: 'Rosa Diaz', documentNumber: '30303030' }] };
    });
    const { RentalCommandError } = await import('./rentals-client');
    registerCompanionMock.mockRejectedValue(new RentalCommandError(422, { code: 'COMPANION_CUSTOMER_NOT_FOUND', detail: 'x' }));
    const { container } = renderScreen();
    await screen.findByText(/Maria Quispe/);
    fireEvent.click(screen.getByRole('button', { name: 'Acompañante' }));
    await uploadRequiredDocs(container);
    await fillCompanionForm();
    fireEvent.click(screen.getByLabelText(/Licencia vigente del acompañante verificada/));
    fireEvent.click(screen.getByLabelText(/Licencia vigente del conductor real verificada/));
    const continueButton = screen.getByRole('button', { name: 'Continuar' });
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    expect(await screen.findByRole('alert')).toHaveTextContent(/No encontramos al acompañante/);
    expect(validateDocumentsMock).not.toHaveBeenCalled();
  });

  it('si ya hay acompanante registrado no vuelve a pedirlo', async () => {
    getRentalMock.mockResolvedValue({ ...naturalRental, parties: [{ id: 'p1', customerId: 'c', role: 'RESPONSIBLE', addendumDocumentRef: null, createdAt: '' }] });
    renderScreen();
    await screen.findByText(/Maria Quispe/);
    fireEvent.click(screen.getByRole('button', { name: 'Acompañante' }));
    expect(screen.getByTestId('registered-companion')).toBeInTheDocument();
    expect(screen.queryByTestId('companion-form')).not.toBeInTheDocument();
  });
});
