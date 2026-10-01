import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerDetailScreen } from './CustomerDetailScreen';
import { CustomerApiError, CustomerCommandError } from './customers-client';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

const getCustomerMock = vi.fn();
const updateCustomerMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();

vi.mock('../shared/useRolePermissions', () => ({
  useRolePermissions: () => ({ can: () => true }),
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      email: 'operaciones@veloxrent.pe',
      getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
    },
  }),
}));

vi.mock('./customers-client', async () => {
  const actual = await vi.importActual<typeof import('./customers-client')>('./customers-client');
  return {
    ...actual,
    getCustomer: (...args: unknown[]) => getCustomerMock(...args),
    updateCustomer: (...args: unknown[]) => updateCustomerMock(...args),
  };
});

vi.mock('../auth/work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
}));

const oneAssignment = [
  { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
];

const sampleCustomer = {
  id: 'cust-1',
  organizationId: 'org-1',
  operatingCompanyId: 'c1',
  fullName: 'María Quispe Huamán',
  documentType: 'DNI',
  documentNumber: '45920184',
  nationality: 'PERUANO',
  countryEntryDate: null,
  email: 'm.quispe@gmail.com',
  phone: '966123456',
  address: 'Av. Lima 123, Ayacucho',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

function renderScreen(customerId = 'cust-1') {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: `/clientes/${customerId}`,
            state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
          },
        ]}
      >
        <Routes>
          <Route path="/clientes/:id" element={<CustomerDetailScreen />} />
          <Route path="/clientes" element={<div>Lista clientes</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getWorkContextAssignmentsMock.mockResolvedValue(oneAssignment);
  getCustomerMock.mockResolvedValue(sampleCustomer);
  updateCustomerMock.mockResolvedValue(sampleCustomer);
});

describe('CustomerDetailScreen', () => {
  it('muestra estado LOADING mientras carga', () => {
    getCustomerMock.mockReturnValue(new Promise(() => { /* never resolves */ }));
    renderScreen();
    expect(screen.getByText(/cargando ficha del cliente/i)).toBeInTheDocument();
  });

  it('muestra el nombre del cliente en estado READY', async () => {
    renderScreen();
    expect(await screen.findByRole('heading', { name: 'María Quispe Huamán' })).toBeInTheDocument();
  });

  it('muestra el documento del cliente', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getAllByText('45920184').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/DNI/i).length).toBeGreaterThan(0);
  });

  it('muestra teléfono y correo del cliente', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('966123456')).toBeInTheDocument());
    expect(screen.getByText('m.quispe@gmail.com')).toBeInTheDocument();
  });

  it('muestra el botón de edición', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'María Quispe Huamán' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /editar datos/i })).toBeInTheDocument();
  });

  it('muestra el botón para volver a clientes', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'María Quispe Huamán' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /volver a la bandeja de clientes/i })).toBeInTheDocument();
  });

  it('abre el modal de edición al hacer clic en Editar datos', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByRole('button', { name: /editar datos/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /editar datos/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Editar Cliente' })).toBeInTheDocument();
  });

  it('muestra RECOVERABLE_ERROR cuando getCustomer falla', async () => {
    getCustomerMock.mockRejectedValue(new Error('Network error'));
    renderScreen();
    await waitFor(() =>
      expect(screen.getByText(/no pudimos cargar la ficha/i)).toBeInTheDocument(),
    );
  });

  it('muestra FORBIDDEN cuando el servidor devuelve 403', async () => {
    getCustomerMock.mockRejectedValue(new CustomerApiError('Forbidden', 403));
    renderScreen();
    await waitFor(() =>
      expect(screen.getByText(/no tienes permisos para ver este cliente/i)).toBeInTheDocument(),
    );
  });

  it('muestra error en modal si updateCustomer falla', async () => {
    updateCustomerMock.mockRejectedValue(
      new CustomerCommandError(422, { code: 'INVALID_DATA', detail: 'Datos inválidos.' }),
    );
    renderScreen();
    await waitFor(() => expect(screen.getByRole('button', { name: /editar datos/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /editar datos/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    );
  });
});
