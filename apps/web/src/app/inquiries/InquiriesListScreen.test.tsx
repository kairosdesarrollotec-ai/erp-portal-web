import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InquiriesListScreen } from './InquiriesListScreen';
import { InquiryApiError } from './inquiries-client';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));

const listInquiriesMock = vi.fn();
const getCustomerMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();

vi.mock('../shared/useRolePermissions', () => ({
  useRolePermissions: () => ({ can: () => true }),
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./inquiries-client', async () => {
  const actual = await vi.importActual<typeof import('./inquiries-client')>('./inquiries-client');
  return {
    ...actual,
    listInquiries: (...args: unknown[]) => listInquiriesMock(...args),
  };
});

vi.mock('../customers/customers-client', async () => {
  const actual = await vi.importActual<typeof import('../customers/customers-client')>('../customers/customers-client');
  return {
    ...actual,
    getCustomer: (...args: unknown[]) => getCustomerMock(...args),
  };
});

vi.mock('../auth/work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
}));

const oneAssignment = [{ companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' }];

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/consultas', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path="/consultas" element={<InquiriesListScreen />} />
        <Route path="/consultas/nueva" element={<div>nueva</div>} />
        <Route path="/consultas/:id" element={<div>detalle</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InquiriesListScreen (CON-01)', () => {
  beforeEach(() => {
    listInquiriesMock.mockReset();
    getCustomerMock.mockReset();
    getWorkContextAssignmentsMock.mockReset().mockResolvedValue(oneAssignment);
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  it('muestra la bandeja con badges por grupo de estado y filtra por companyId+branchId (finding "Contexto incompleto")', async () => {
    listInquiriesMock.mockResolvedValue([
      {
        id: 'con-1',
        status: 'REGISTRADA',
        channel: 'WHATSAPP',
        version: 1,
        companyId: 'c1',
        customerId: 'cust-1',
        touristUse: true,
        createdAt: '2026-09-16T00:00:00Z',
      },
    ]);
    getCustomerMock.mockResolvedValue({ id: 'cust-1', fullName: 'Maria Quispe' });
    renderScreen();

    // Bug fix regresion: una consulta con `customerId` vinculado debe
    // mostrar el nombre real del cliente (resuelto via GET /customers/{id}),
    // nunca "Sin cliente registrado".
    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(getCustomerMock).toHaveBeenCalledWith('fake-id-token', 'cust-1', 'c1', 'b1');
    expect(screen.queryByText('Sin cliente registrado')).not.toBeInTheDocument();
    expect(screen.getByText('Abierta')).toBeInTheDocument();
    expect(screen.getByText('Nueva Consulta')).toBeInTheDocument();
    expect(listInquiriesMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', {
      channel: undefined,
      status: undefined,
      limit: 50,
    });
  });

  // Finding "filas clicables inaccesibles": la fila debe ser alcanzable por teclado.
  it('cada fila tiene un link accesible con nombre propio (teclado)', async () => {
    listInquiriesMock.mockResolvedValue([
      {
        id: 'con-1',
        status: 'REGISTRADA',
        channel: 'WHATSAPP',
        version: 1,
        companyId: 'c1',
        customerId: 'cust-1',
        touristUse: true,
        createdAt: '2026-09-16T00:00:00Z',
      },
    ]);
    getCustomerMock.mockResolvedValue({ id: 'cust-1', fullName: 'Maria Quispe' });
    renderScreen();

    const rowLink = await screen.findByRole('link', { name: 'Ver detalle de la consulta de Maria Quispe' });
    expect(rowLink).toHaveAttribute('href', '/consultas/con-1');
  });

  it('muestra el estado vacio cuando no hay consultas', async () => {
    listInquiriesMock.mockResolvedValue([]);
    renderScreen();

    expect(await screen.findByText('Todavía no hay consultas registradas.')).toBeInTheDocument();
  });

  it('muestra el error recuperable si la carga falla', async () => {
    listInquiriesMock.mockRejectedValue(new Error('network'));
    renderScreen();

    expect(
      await screen.findByText(/No pudimos cargar la bandeja de consultas/),
    ).toBeInTheDocument();
  });

  it('muestra el estado FORBIDDEN si el backend responde 403', async () => {
    listInquiriesMock.mockRejectedValue(
      new InquiryApiError('No se pudo obtener la bandeja de consultas (403)', 403),
    );
    renderScreen();

    expect(
      await screen.findByText(/No tienes permisos para ver la bandeja de consultas/),
    ).toBeInTheDocument();
  });

  it('muestra "Sin cliente registrado" cuando la consulta no tiene customerId (prospecto)', async () => {
    listInquiriesMock.mockResolvedValue([
      {
        id: 'con-2',
        status: 'REGISTRADA',
        channel: 'WHATSAPP',
        version: 1,
        companyId: 'c1',
        customerId: null,
        touristUse: true,
        createdAt: '2026-09-16T00:00:00Z',
      },
    ]);
    renderScreen();

    expect(await screen.findByText('Sin cliente registrado')).toBeInTheDocument();
    expect(getCustomerMock).not.toHaveBeenCalled();
  });

  // Decision 22-oct: "Buscar por cliente" no manda texto como `customerId`; filtra por nombre ya resuelto.
  it('el filtro de cliente no envia el texto como customerId y filtra por nombre', async () => {
    listInquiriesMock.mockResolvedValue([
      { id: 'con-1', status: 'REGISTRADA', channel: 'LLAMADA', version: 1, companyId: 'c1', branchId: 'b1', customerId: 'cust-1', touristUse: true, createdAt: '2026-10-01T10:00:00Z' },
      { id: 'con-2', status: 'REGISTRADA', channel: 'PRESENCIAL', version: 1, companyId: 'c1', branchId: 'b1', customerId: 'cust-2', touristUse: true, createdAt: '2026-10-01T11:00:00Z' },
    ]);
    getCustomerMock.mockImplementation(async (_t: string, id: string) => ({ id, fullName: id === 'cust-1' ? 'Maria Quispe' : 'Juan Perez' }));
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(await screen.findByText('Juan Perez')).toBeInTheDocument();
    // Etiquetas legibles de canal.
    // (una vez en el selector de canal y otra en la fila)
    expect(screen.getAllByText('Llamada')).toHaveLength(2);
    expect(screen.getAllByText('Presencial')).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('Filtrar por cliente'), { target: { value: 'maria' } });

    await waitFor(() => expect(screen.queryByText('Juan Perez')).not.toBeInTheDocument());
    expect(screen.getByText('Maria Quispe')).toBeInTheDocument();
    for (const call of listInquiriesMock.mock.calls) {
      expect(call[3]).not.toHaveProperty('customerId');
    }
  });

  it('pagina por cursor: "Cargar más" envia cursorCreatedAt/cursorId de la ultima fila', async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => ({
      id: `con-${i}`, status: 'REGISTRADA', channel: 'WEB', version: 1, companyId: 'c1', branchId: 'b1',
      customerId: null, touristUse: true, createdAt: `2026-10-01T10:${String(59 - (i % 60)).padStart(2, '0')}:00Z`,
    }));
    listInquiriesMock.mockResolvedValueOnce(page1).mockResolvedValueOnce([
      { id: 'con-x', status: 'REGISTRADA', channel: 'WEB', version: 1, companyId: 'c1', branchId: 'b1', customerId: null, touristUse: true, createdAt: '2026-09-01T10:00:00Z' },
    ]);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más consultas' }));
    await waitFor(() => expect(listInquiriesMock).toHaveBeenCalledTimes(2));
    const filters = listInquiriesMock.mock.calls[1][3];
    expect(filters).toMatchObject({ cursorId: 'con-49', cursorCreatedAt: page1[49].createdAt });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cargar más consultas' })).not.toBeInTheDocument());
  });
});
