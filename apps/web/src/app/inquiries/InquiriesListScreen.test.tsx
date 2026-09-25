import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InquiriesListScreen } from './InquiriesListScreen';
import { InquiryApiError } from './inquiries-client';

const listInquiriesMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();

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
        customer: { id: 'cust-1', name: 'Maria Quispe' },
        touristUse: true,
        createdAt: '2026-09-16T00:00:00Z',
      },
    ]);
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(screen.getByText('Abierta')).toBeInTheDocument();
    expect(screen.getByText('Nueva Consulta')).toBeInTheDocument();
    expect(listInquiriesMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', {
      customerId: undefined,
      channel: undefined,
      status: undefined,
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
        customer: { id: 'cust-1', name: 'Maria Quispe' },
        touristUse: true,
        createdAt: '2026-09-16T00:00:00Z',
      },
    ]);
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

  // Finding "Filtro por cliente dispara una peticion por tecla": escribir
  // rapido no debe mandar una peticion HTTP por letra.
  it('el filtro de cliente hace debounce y no dispara una peticion por tecla', async () => {
    listInquiriesMock.mockResolvedValue([]);
    renderScreen();

    const input = screen.getByLabelText('Filtrar por cliente');
    fireEvent.change(input, { target: { value: 'M' } });
    fireEvent.change(input, { target: { value: 'Ma' } });
    fireEvent.change(input, { target: { value: 'Mar' } });
    fireEvent.change(input, { target: { value: 'Maria' } });

    await waitFor(() => {
      const lastCall = listInquiriesMock.mock.calls[listInquiriesMock.mock.calls.length - 1];
      expect(lastCall?.[3]).toMatchObject({ customerId: 'Maria' });
    });

    // Solo la carga inicial (filtros vacios) mas la busqueda final - nunca
    // una llamada por cada letra escrita.
    expect(listInquiriesMock.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
