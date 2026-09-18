import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NewInquiryScreen } from './NewInquiryScreen';

const createInquiryMock = vi.fn();
const closeInquiryMock = vi.fn();
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
    createInquiry: (...args: unknown[]) => createInquiryMock(...args),
    closeInquiry: (...args: unknown[]) => closeInquiryMock(...args),
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

function fillRequiredFields() {
  fireEvent.change(screen.getByText('Nombre').closest('label')!.querySelector('input')!, {
    target: { value: 'Maria Quispe' },
  });
  fireEvent.change(screen.getByText('Documento').closest('label')!.querySelector('input')!, {
    target: { value: '12345678' },
  });
  fireEvent.change(screen.getByText('Destino').closest('label')!.querySelector('input')!, {
    target: { value: 'Ayacucho' },
  });
  fireEvent.change(screen.getByText('Fecha').closest('label')!.querySelector('input')!, {
    target: { value: '2099-01-01' },
  });
}

describe('NewInquiryScreen (CON-02)', () => {
  beforeEach(() => {
    createInquiryMock.mockReset();
    closeInquiryMock.mockReset();
    getWorkContextAssignmentsMock.mockReset().mockResolvedValue(oneAssignment);
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  it('revela el documento de hospedaje solo cuando la nacionalidad es Extranjero', () => {
    renderScreen();

    expect(screen.queryByText('Documento de hospedaje')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nacionalidad/) as HTMLSelectElement, {
      target: { value: 'EXTRANJERO' },
    });

    expect(screen.getByText('Documento de hospedaje')).toBeInTheDocument();
  });

  // Finding "Sin validacion funcional": no se puede continuar con campos vacios.
  it('bloquea "Continuar" si nombre, documento, destino o fecha estan vacios', async () => {
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Ingresa el nombre del cliente.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa el documento del cliente.')).toBeInTheDocument();
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
      customer: null,
      touristUse: true,
      createdAt: '2026-09-16T00:00:00Z',
    });
    renderScreen();
    await waitForContext();

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('vehiculos')).toBeInTheDocument();
    expect(createInquiryMock).toHaveBeenCalledWith('fake-id-token', { channel: 'WHATSAPP', touristUse: true });
  });

  it('cuando el cliente rechaza el uso turistico, ofrece cierre inmediato en vez de Continuar', async () => {
    createInquiryMock.mockResolvedValue({
      id: 'con-2',
      status: 'REGISTRADA',
      channel: 'WHATSAPP',
      version: 1,
      companyId: 'c1',
      customer: null,
      touristUse: false,
      createdAt: '2026-09-16T00:00:00Z',
    });
    closeInquiryMock.mockResolvedValue({
      id: 'con-2',
      status: 'CERRADA_SIN_CONVERSION',
      channel: 'WHATSAPP',
      version: 2,
      companyId: 'c1',
      customer: null,
      touristUse: false,
      createdAt: '2026-09-16T00:00:00Z',
    });
    renderScreen();
    await waitForContext();

    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: 'Cerrar consulta' });
    fireEvent.click(closeButton);

    expect(await screen.findByText('bandeja')).toBeInTheDocument();
    expect(closeInquiryMock).toHaveBeenCalledWith('fake-id-token', 'con-2', 1, 'SIN_USO_TURISTICO', expect.any(String));
  });

  // Findings Critico #1/#2: el autoguardado ya no dice "Guardado" a secas
  // (podia leerse como guardado en servidor) y persiste de verdad en este
  // dispositivo, sobreviviendo a un remount de la pantalla (equivalente a
  // un refresh).
  it('el indicador de autoguardado es honesto y el borrador sobrevive a un refresh', async () => {
    const { unmount } = renderScreen();

    fireEvent.change(screen.getByText('Nombre').closest('label')!.querySelector('input')!, {
      target: { value: 'Maria Quispe' },
    });

    expect(await screen.findByText('Guardado en este dispositivo')).toBeInTheDocument();
    expect(screen.queryByText('Guardado', { exact: true })).not.toBeInTheDocument();

    unmount();
    renderScreen();

    expect((screen.getByText('Nombre').closest('label')!.querySelector('input') as HTMLInputElement).value).toBe(
      'Maria Quispe',
    );
  });
});
