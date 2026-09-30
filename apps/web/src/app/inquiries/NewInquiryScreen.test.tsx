import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NewInquiryScreen } from './NewInquiryScreen';

const createInquiryMock = vi.fn();
const closeInquiryMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();
const listCustomersMock = vi.fn();
const createCustomerMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./inquiries-client', async () => {
  const actual = await vi.importActual<typeof import('./inquiries-client')>('./inquiries-client');
  return {
    ...actual,
    createInquiry: (...args: unknown[]) => createInquiryMock(...args),
    closeInquiry: (...args: unknown[]) => closeInquiryMock(...args),
  };
});

vi.mock('../customers/customers-client', async () => {
  const actual = await vi.importActual<typeof import('../customers/customers-client')>('../customers/customers-client');
  return {
    ...actual,
    listCustomers: (...args: unknown[]) => listCustomersMock(...args),
    createCustomer: (...args: unknown[]) => createCustomerMock(...args),
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
        { pathname: '/consultas/nueva', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path="/consultas/nueva" element={<NewInquiryScreen />} />
        <Route path="/consultas/:id/vehiculos" element={<div>vehiculos</div>} />
        <Route path="/consultas" element={<div>bandeja</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function waitForContext() {
  await waitFor(() => expect(getWorkContextAssignmentsMock).toHaveBeenCalled());
  // Deja que la promesa de getWorkContextAssignments resuelva y el estado
  // `context` se actualice antes de interactuar - la resolucion del
  // contexto es asincrona (useWorkContextForInquiries.ts).
  await waitFor(() => expect(getWorkContextAssignmentsMock).toHaveResolvedTimes(1));
}

/**
 * Rediseño CON-02: ya no hay campos manuales de nombre/documento - vincular
 * un cliente (buscado aqui) es obligatorio para continuar. `listCustomersMock`
 * debe estar configurado para devolver `maria-quispe-customer` antes de llamar
 * a este helper.
 */
async function linkExistingCustomer(name = 'Maria Quispe') {
  fireEvent.change(screen.getByLabelText('Buscar cliente existente'), {
    target: { value: name },
  });
  fireEvent.click(await screen.findByText(name));
  await screen.findByText('Cliente vinculado');
}

async function fillRequiredFields() {
  await linkExistingCustomer();
  fireEvent.change(screen.getByText('Destino').closest('label')!.querySelector('input')!, {
    target: { value: 'Ayacucho' },
  });
  fireEvent.change(screen.getByText('Fecha').closest('label')!.querySelector('input')!, {
    target: { value: '2099-01-01' },
  });
}

const mariaQuispeCustomer = {
  id: 'cust-maria',
  organizationId: 'org-1',
  operatingCompanyId: 'c1',
  fullName: 'Maria Quispe',
  documentType: 'DNI',
  documentNumber: '12345678',
  nationality: 'PERUANO' as const,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

describe('NewInquiryScreen (CON-02)', () => {
  beforeEach(() => {
    createInquiryMock.mockReset();
    closeInquiryMock.mockReset();
    getWorkContextAssignmentsMock.mockReset().mockResolvedValue(oneAssignment);
    listCustomersMock.mockReset().mockResolvedValue({ items: [mariaQuispeCustomer], total: 1 });
    createCustomerMock.mockReset();
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  // Rediseño CON-02: la nacionalidad ya no se elige a mano - viene del
  // cliente vinculado (buscado o recien creado via el modal).
  // Rediseño CON-02: "canal de contacto" (WhatsApp/Redes/etc) solo tiene
  // sentido cuando la modalidad es VIRTUAL - en PRESENCIAL el cliente ya
  // esta frente al asesor.
  it('oculta el canal de contacto en modalidad Presencial y lo muestra en Virtual', () => {
    renderScreen();

    expect(screen.queryByLabelText('Canal de contacto')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Virtual' }));

    expect(screen.getByText('Canal de contacto')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Presencial' }));

    expect(screen.queryByText('Canal de contacto')).not.toBeInTheDocument();
  });

  it('revela el documento de hospedaje solo cuando el cliente vinculado es Extranjero', async () => {
    listCustomersMock.mockResolvedValue({
      items: [{ ...mariaQuispeCustomer, id: 'cust-ext', fullName: 'John Smith', nationality: 'EXTRANJERO' }],
      total: 1,
    });
    renderScreen();
    await waitForContext();

    expect(screen.queryByText('Documento de hospedaje')).not.toBeInTheDocument();

    await linkExistingCustomer('John Smith');

    expect(screen.getByText('Documento de hospedaje')).toBeInTheDocument();
  });

  // Finding "Sin validacion funcional" + rediseño CON-02: no se puede
  // continuar sin cliente vinculado, destino o fecha.
  it('bloquea "Continuar" si no hay cliente vinculado, o faltan destino/fecha', async () => {
    renderScreen();
    await waitForContext();

    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText('Busca y selecciona un cliente registrado, o registra uno nuevo, antes de continuar.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ingresa el destino del viaje.')).toBeInTheDocument();
    expect(createInquiryMock).not.toHaveBeenCalled();
  });

  it('continua a CON-03 al crear la consulta con uso turistico afirmativo y el formulario completo', async () => {
    createInquiryMock.mockResolvedValue({
      id: 'con-1',
      status: 'REGISTRADA',
      channel: 'WHATSAPP',
      version: 1,
      companyId: 'c1',
      customerId: null,
      touristUse: true,
      createdAt: '2026-09-16T00:00:00Z',
    });
    renderScreen();
    await waitForContext();

    await fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('vehiculos')).toBeInTheDocument();
    expect(createInquiryMock).toHaveBeenCalledWith('fake-id-token', {
      companyId: 'c1',
      branchId: 'b1',
      channel: 'WHATSAPP',
      touristUse: true,
      customerId: 'cust-maria',
      destination: 'Ayacucho',
      estimatedDays: 1,
      travelStartDate: '2099-01-01',
      partySize: 1,
    });
  });

  it('cuando el cliente rechaza el uso turistico, ofrece cierre inmediato en vez de Continuar', async () => {
    createInquiryMock.mockResolvedValue({
      id: 'con-2',
      status: 'REGISTRADA',
      channel: 'WHATSAPP',
      version: 1,
      companyId: 'c1',
      customerId: null,
      touristUse: false,
      createdAt: '2026-09-16T00:00:00Z',
    });
    closeInquiryMock.mockResolvedValue({
      id: 'con-2',
      status: 'CERRADA_SIN_CONVERSION',
      channel: 'WHATSAPP',
      version: 2,
      companyId: 'c1',
      customerId: null,
      touristUse: false,
      createdAt: '2026-09-16T00:00:00Z',
    });
    renderScreen();
    await waitForContext();
    await fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: 'Cerrar consulta' });
    fireEvent.click(closeButton);

    expect(await screen.findByText('bandeja')).toBeInTheDocument();
    expect(closeInquiryMock).toHaveBeenCalledWith('fake-id-token', 'con-2', 1, 'c1', 'b1', 'SIN_USO_TURISTICO', expect.any(String));
  });

  // Hallazgo propio (revision de PR#7 backend): closeWithoutTouristUse
  // llamaba a createInquiry sin los campos que el backend ahora exige
  // (nationality/destination/estimatedDays/prospectName) - un destination
  // vacio habria sido rechazado con 400. Ahora valida antes, igual que
  // submit().
  it('bloquea "Cerrar consulta" si el formulario no tiene los campos obligatorios del backend', async () => {
    renderScreen();
    await waitForContext();

    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar consulta' }));

    expect(
      await screen.findByText('Busca y selecciona un cliente registrado, o registra uno nuevo, antes de continuar.'),
    ).toBeInTheDocument();
    expect(createInquiryMock).not.toHaveBeenCalled();
    expect(closeInquiryMock).not.toHaveBeenCalled();
  });

  // Findings Critico #1/#2: el autoguardado ya no dice "Guardado" a secas
  // (podia leerse como guardado en servidor) y persiste de verdad en este
  // dispositivo, sobreviviendo a un remount de la pantalla (equivalente a
  // un refresh).
  it('el indicador de autoguardado es honesto y el borrador sobrevive a un refresh', async () => {
    const { unmount } = renderScreen();

    fireEvent.change(screen.getByText('Destino').closest('label')!.querySelector('input')!, {
      target: { value: 'Ayacucho' },
    });

    expect(await screen.findByText('Guardado en este dispositivo')).toBeInTheDocument();
    expect(screen.queryByText('Guardado', { exact: true })).not.toBeInTheDocument();

    unmount();
    renderScreen();

    expect((screen.getByText('Destino').closest('label')!.querySelector('input') as HTMLInputElement).value).toBe(
      'Ayacucho',
    );
  });

  // Integración Módulo de Clientes (PR 4): buscar y vincular un cliente
  // existente debe rellenar el formulario y enviar customerId (no prospect).
  it('busca clientes existentes, vincula el seleccionado y envia customerId en vez de prospect', async () => {
    listCustomersMock.mockResolvedValue({
      items: [
        {
          id: 'cust-1',
          organizationId: 'org-1',
          operatingCompanyId: 'c1',
          fullName: 'Juan Perez',
          documentType: 'DNI',
          documentNumber: '87654321',
          nationality: 'PERUANO',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      total: 1,
    });
    createInquiryMock.mockResolvedValue({
      id: 'con-3',
      status: 'REGISTRADA',
      channel: 'WHATSAPP',
      version: 1,
      companyId: 'c1',
      customerId: null,
      touristUse: true,
      createdAt: '2026-09-16T00:00:00Z',
    });
    renderScreen();
    await waitForContext();

    fireEvent.change(screen.getByLabelText('Buscar cliente existente'), {
      target: { value: 'Juan' },
    });

    const result = await screen.findByText('Juan Perez');
    fireEvent.click(result);

    expect(await screen.findByText('Cliente vinculado')).toBeInTheDocument();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();

    fireEvent.change(screen.getByText('Destino').closest('label')!.querySelector('input')!, {
      target: { value: 'Ayacucho' },
    });
    fireEvent.change(screen.getByText('Fecha').closest('label')!.querySelector('input')!, {
      target: { value: '2099-01-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('vehiculos')).toBeInTheDocument();
    expect(createInquiryMock).toHaveBeenCalledWith(
      'fake-id-token',
      expect.objectContaining({
        customerId: 'cust-1',
      }),
    );
    expect(createInquiryMock.mock.calls[0][1]).not.toHaveProperty('prospect');
  });

  it('permite desvincular un cliente seleccionado y volver a buscar', async () => {
    listCustomersMock.mockResolvedValue({
      items: [
        {
          id: 'cust-1',
          organizationId: 'org-1',
          operatingCompanyId: 'c1',
          fullName: 'Juan Perez',
          documentType: 'DNI',
          documentNumber: '87654321',
          nationality: 'PERUANO',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      ],
      total: 1,
    });
    renderScreen();
    await waitForContext();

    fireEvent.change(screen.getByLabelText('Buscar cliente existente'), {
      target: { value: 'Juan' },
    });
    fireEvent.click(await screen.findByText('Juan Perez'));
    expect(await screen.findByText('Cliente vinculado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Desvincular cliente' }));

    expect(screen.queryByText('Cliente vinculado')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Buscar cliente existente')).toBeInTheDocument();
  });

  // Registrar un cliente nuevo desde el modal debe vincularlo automaticamente
  // y usar customerId al enviar la consulta.
  it('registra un cliente nuevo desde el modal, lo vincula y envia customerId', async () => {
    createCustomerMock.mockResolvedValue({
      id: 'cust-2',
      organizationId: 'org-1',
      operatingCompanyId: 'c1',
      fullName: 'Ana Torres',
      documentType: 'DNI',
      documentNumber: '11223344',
      nationality: 'PERUANO',
      createdAt: '2026-09-20T00:00:00Z',
      updatedAt: '2026-09-20T00:00:00Z',
    });
    createInquiryMock.mockResolvedValue({
      id: 'con-4',
      status: 'REGISTRADA',
      channel: 'WHATSAPP',
      version: 1,
      companyId: 'c1',
      customerId: null,
      touristUse: true,
      createdAt: '2026-09-16T00:00:00Z',
    });
    renderScreen();
    await waitForContext();

    fireEvent.click(screen.getByRole('button', { name: '+ Registrar nuevo cliente' }));

    const modal = within(await screen.findByRole('dialog'));
    fireEvent.change(modal.getByLabelText(/Nombre completo/i), { target: { value: 'Ana Torres' } });
    fireEvent.change(modal.getByLabelText(/Número de documento/i), { target: { value: '11223344' } });

    fireEvent.click(modal.getByRole('button', { name: /Registrar cliente/i }));

    expect(await screen.findByText('Cliente vinculado')).toBeInTheDocument();
    expect(createCustomerMock).toHaveBeenCalledWith(
      'fake-id-token',
      expect.objectContaining({ companyId: 'c1', branchId: 'b1', fullName: 'Ana Torres', documentNumber: '11223344' }),
    );

    fireEvent.change(screen.getByText('Destino').closest('label')!.querySelector('input')!, {
      target: { value: 'Ayacucho' },
    });
    fireEvent.change(screen.getByText('Fecha').closest('label')!.querySelector('input')!, {
      target: { value: '2099-01-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('vehiculos')).toBeInTheDocument();
    expect(createInquiryMock).toHaveBeenCalledWith(
      'fake-id-token',
      expect.objectContaining({ customerId: 'cust-2' }),
    );
    expect(createInquiryMock.mock.calls[0][1]).not.toHaveProperty('prospect');
  });

  it('muestra el error del modal si createCustomer falla y no cierra el modal', async () => {
    const { CustomerCommandError } = await import('../customers/customers-client');
    createCustomerMock.mockRejectedValue(new CustomerCommandError(409, { code: 'CUSTOMER_DOCUMENT_ALREADY_EXISTS', detail: 'Ya existe un cliente con ese documento.' }));
    renderScreen();
    await waitForContext();

    fireEvent.click(screen.getByRole('button', { name: '+ Registrar nuevo cliente' }));
    const modal = within(await screen.findByRole('dialog'));
    fireEvent.change(modal.getByLabelText(/Nombre completo/i), { target: { value: 'Ana Torres' } });
    fireEvent.change(modal.getByLabelText(/Número de documento/i), { target: { value: '11223344' } });
    fireEvent.click(modal.getByRole('button', { name: /Registrar cliente/i }));

    expect(await screen.findByText('Ya existe un cliente con ese documento.')).toBeInTheDocument();
    expect(screen.queryByText('Cliente vinculado')).not.toBeInTheDocument();
  });
});
