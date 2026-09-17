import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InquiriesListScreen } from './InquiriesListScreen';

const listInquiriesMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./inquiries-client', () => ({
  listInquiries: (...args: unknown[]) => listInquiriesMock(...args),
}));

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
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  it('muestra la bandeja con badges por grupo de estado', async () => {
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
    listInquiriesMock.mockRejectedValue(new Error('No se pudo obtener la bandeja de consultas (403)'));
    renderScreen();

    expect(
      await screen.findByText(/No tienes permisos para ver la bandeja de consultas/),
    ).toBeInTheDocument();
  });
});
