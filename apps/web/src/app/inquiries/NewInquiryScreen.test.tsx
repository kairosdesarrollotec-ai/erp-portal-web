import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NewInquiryScreen } from './NewInquiryScreen';

const createInquiryMock = vi.fn();
const closeInquiryMock = vi.fn();

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

describe('NewInquiryScreen (CON-02)', () => {
  beforeEach(() => {
    createInquiryMock.mockReset();
    closeInquiryMock.mockReset();
  });

  it('revela el documento de hospedaje solo cuando la nacionalidad es Extranjero', () => {
    renderScreen();

    expect(screen.queryByText('Documento de hospedaje')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nacionalidad/) as HTMLSelectElement, {
      target: { value: 'EXTRANJERO' },
    });

    expect(screen.getByText('Documento de hospedaje')).toBeInTheDocument();
  });

  it('continua a CON-03 al crear la consulta con uso turistico afirmativo', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: 'Cerrar consulta' });
    fireEvent.click(closeButton);

    expect(await screen.findByText('bandeja')).toBeInTheDocument();
    expect(closeInquiryMock).toHaveBeenCalledWith('fake-id-token', 'con-2', 1, 'SIN_USO_TURISTICO', expect.any(String));
  });
});
