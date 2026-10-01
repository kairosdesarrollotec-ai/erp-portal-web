import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CustomersListScreen } from './CustomersListScreen';
import { CustomerApiError, CustomerCommandError } from './customers-client';

const listCustomersMock = vi.fn();
const createCustomerMock = vi.fn();
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
    listCustomers: (...args: unknown[]) => listCustomersMock(...args),
    createCustomer: (...args: unknown[]) => createCustomerMock(...args),
    updateCustomer: (...args: unknown[]) => updateCustomerMock(...args),
  };
});

vi.mock('../auth/work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
}));

const oneAssignment = [
  { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
];

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/clientes',
          state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
        },
      ]}
    >
      <Routes>
        <Route path="/clientes" element={<CustomersListScreen />} />
        <Route path="/clientes/:id" element={<div data-testid="ficha-screen">Ficha</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CustomersListScreen', () => {
  beforeEach(() => {
    listCustomersMock.mockReset();
    createCustomerMock.mockReset();
    updateCustomerMock.mockReset();
    getWorkContextAssignmentsMock.mockReset().mockResolvedValue(oneAssignment);
  });

  it('muestra la tabla de clientes con sus datos y badge de documento', async () => {
    listCustomersMock.mockResolvedValue({
      items: [
        {
          id: 'cust-1',
          fullName: 'Juan Perez',
          documentType: 'DNI',
          documentNumber: '12345678',
          nationality: 'PERUANO',
          countryEntryDate: null,
          email: 'juan@test.com',
          phone: '999888777',
          address: 'Av. El Sol 123',
          createdAt: '2026-09-28T12:00:00.000Z',
          updatedAt: '2026-09-28T12:00:00.000Z',
        },
      ],
      total: 1,
    });

    renderScreen();

    expect(await screen.findByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('DNI')).toBeInTheDocument();
    expect(screen.getByText('12345678')).toBeInTheDocument();
    expect(screen.getByText('999888777')).toBeInTheDocument();
    expect(screen.getByText('juan@test.com')).toBeInTheDocument();
    expect(screen.getByText('Peruano')).toBeInTheDocument();
    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay clientes', async () => {
    listCustomersMock.mockResolvedValue({ items: [], total: 0 });
    renderScreen();

    expect(
      await screen.findByText('Todavía no hay clientes registrados en esta empresa.'),
    ).toBeInTheDocument();
  });

  it('muestra error recuperable si la API falla', async () => {
    listCustomersMock.mockRejectedValue(new Error('Network error'));
    renderScreen();

    expect(
      await screen.findByText(/No pudimos cargar la lista de clientes/),
    ).toBeInTheDocument();
  });

  it('muestra estado FORBIDDEN si la API devuelve 403', async () => {
    listCustomersMock.mockRejectedValue(new CustomerApiError('Forbidden', 403));
    renderScreen();

    expect(
      await screen.findByText(/No tienes permisos para ver el directorio de clientes/),
    ).toBeInTheDocument();
  });

  it('aplica debounce al escribir en el buscador', async () => {
    listCustomersMock.mockResolvedValue({ items: [], total: 0 });
    renderScreen();

    const searchInput = screen.getByLabelText('Buscar clientes');
    fireEvent.change(searchInput, { target: { value: 'J' } });
    fireEvent.change(searchInput, { target: { value: 'Ju' } });
    fireEvent.change(searchInput, { target: { value: 'Juan' } });

    await waitFor(() => {
      const lastCall = listCustomersMock.mock.calls[listCustomersMock.mock.calls.length - 1];
      expect(lastCall?.[1]).toMatchObject({ search: 'Juan' });
    });

    expect(listCustomersMock.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('abre el modal de nuevo cliente y permite registrar uno nuevo', async () => {
    listCustomersMock.mockResolvedValue({ items: [], total: 0 });
    createCustomerMock.mockResolvedValue({ id: 'new-id', fullName: 'Carlos Sanchez' });

    renderScreen();

    const newBtn = await screen.findByText('Nuevo Cliente');
    fireEvent.click(newBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nuevo Cliente' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ej. 12345678'), {
      target: { value: '77665544' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ej. Juan Pérez o Inversiones SAC'), {
      target: { value: 'Carlos Sanchez' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Registrar cliente' }));

    await waitFor(() => {
      expect(createCustomerMock).toHaveBeenCalledWith(
        'fake-id-token',
        expect.objectContaining({
          companyId: 'c1',
          branchId: 'b1',
          fullName: 'Carlos Sanchez',
          documentNumber: '77665544',
          documentType: 'DNI',
        }),
        expect.any(String),
      );
    });
  });


  it('abre el modal de edición con los datos precargados y guarda los cambios', async () => {
    listCustomersMock.mockResolvedValue({
      items: [
        {
          id: 'cust-1',
          fullName: 'Juan Perez',
          documentType: 'DNI',
          documentNumber: '12345678',
          nationality: 'PERUANO',
          countryEntryDate: null,
          email: 'juan@test.com',
          phone: '999888777',
          address: 'Av. El Sol 123',
          createdAt: '2026-09-28T12:00:00.000Z',
          updatedAt: '2026-09-28T12:00:00.000Z',
        },
      ],
      total: 1,
    });
    updateCustomerMock.mockResolvedValue({ id: 'cust-1', fullName: 'Juan Perez Actualizado' });

    renderScreen();

    const editBtn = await screen.findByRole('button', { name: 'Editar cliente Juan Perez' });
    fireEvent.click(editBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Editar Cliente' })).toBeInTheDocument();

    const fullNameInput = screen.getByPlaceholderText(
      'Ej. Juan Pérez o Inversiones SAC',
    ) as HTMLInputElement;
    expect(fullNameInput.value).toBe('Juan Perez');

    fireEvent.change(fullNameInput, { target: { value: 'Juan Perez Actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(updateCustomerMock).toHaveBeenCalledWith(
        'fake-id-token',
        'cust-1',
        expect.objectContaining({
          companyId: 'c1',
          branchId: 'b1',
          fullName: 'Juan Perez Actualizado',
          documentNumber: '12345678',
          documentType: 'DNI',
        }),
      );
    });
  });

  it('muestra el panel de coincidencia cuando al crear el servidor devuelve 409', async () => {
    listCustomersMock.mockImplementation((_token: unknown, params: { search?: string }) => {
      if (params.search === '12345678') {
        return Promise.resolve({
          items: [
            {
              id: 'cust-existing',
              fullName: 'María García',
              documentType: 'DNI',
              documentNumber: '12345678',
              nationality: 'PERUANO',
              countryEntryDate: null,
              email: 'maria@test.com',
              phone: '987654321',
              address: null,
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            },
          ],
          total: 1,
        });
      }
      return Promise.resolve({ items: [], total: 0 });
    });
    createCustomerMock.mockRejectedValue(
      new CustomerCommandError(409, {
        code: 'CUSTOMER_DOCUMENT_ALREADY_EXISTS',
        detail: 'Ya existe un cliente con ese documento en esta empresa.',
      }),
    );

    renderScreen();

    const newBtn = await screen.findByText('Nuevo Cliente');
    fireEvent.click(newBtn);

    fireEvent.change(screen.getByPlaceholderText('Ej. 12345678'), {
      target: { value: '12345678' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ej. Juan Pérez o Inversiones SAC'), {
      target: { value: 'María García' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cliente' }));

    expect(await screen.findByText('Cliente ya registrado')).toBeInTheDocument();
    expect(screen.getByText('María García')).toBeInTheDocument();
    expect(screen.getByText('DNI 12345678')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver ficha del cliente' })).toBeInTheDocument();
  });

  it('navega a la ficha del cliente al hacer clic en "Ver ficha del cliente"', async () => {
    listCustomersMock.mockImplementation((_token: unknown, params: { search?: string }) => {
      if (params.search === '12345678') {
        return Promise.resolve({
          items: [
            {
              id: 'cust-existing',
              fullName: 'María García',
              documentType: 'DNI',
              documentNumber: '12345678',
              nationality: 'PERUANO',
              countryEntryDate: null,
              email: null,
              phone: null,
              address: null,
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            },
          ],
          total: 1,
        });
      }
      return Promise.resolve({ items: [], total: 0 });
    });
    createCustomerMock.mockRejectedValue(
      new CustomerCommandError(409, {
        code: 'CUSTOMER_DOCUMENT_ALREADY_EXISTS',
        detail: 'Ya existe un cliente con ese documento en esta empresa.',
      }),
    );

    renderScreen();

    const newBtn = await screen.findByText('Nuevo Cliente');
    fireEvent.click(newBtn);
    fireEvent.change(screen.getByPlaceholderText('Ej. 12345678'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('Ej. Juan Pérez o Inversiones SAC'), {
      target: { value: 'María García' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cliente' }));

    await screen.findByText('Cliente ya registrado');
    fireEvent.click(screen.getByRole('button', { name: 'Ver ficha del cliente' }));

    expect(await screen.findByTestId('ficha-screen')).toBeInTheDocument();
  });

  it('muestra el error de documento duplicado al editar un cliente', async () => {
    listCustomersMock.mockResolvedValue({
      items: [
        {
          id: 'cust-1',
          fullName: 'Juan Perez',
          documentType: 'DNI',
          documentNumber: '12345678',
          nationality: 'PERUANO',
          countryEntryDate: null,
          email: 'juan@test.com',
          phone: '999888777',
          address: 'Av. El Sol 123',
          createdAt: '2026-09-28T12:00:00.000Z',
          updatedAt: '2026-09-28T12:00:00.000Z',
        },
      ],
      total: 1,
    });
    updateCustomerMock.mockRejectedValue(
      new CustomerCommandError(409, {
        code: 'CUSTOMER_DOCUMENT_ALREADY_EXISTS',
        detail: 'Ya existe un cliente con DNI número 99999999 en esta empresa.',
      }),
    );

    renderScreen();

    const editBtn = await screen.findByRole('button', { name: 'Editar cliente Juan Perez' });
    fireEvent.click(editBtn);

    fireEvent.change(screen.getByPlaceholderText('Ej. 12345678'), {
      target: { value: '99999999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('Ya existe un cliente con DNI número 99999999 en esta empresa.'),
    ).toBeInTheDocument();
  });
});
