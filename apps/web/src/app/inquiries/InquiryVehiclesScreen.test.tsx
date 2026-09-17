import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InquiryVehiclesScreen } from './InquiryVehiclesScreen';

const quoteInquiryMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./inquiries-client', async () => {
  const actual = await vi.importActual<typeof import('./inquiries-client')>('./inquiries-client');
  return {
    ...actual,
    quoteInquiry: (...args: unknown[]) => quoteInquiryMock(...args),
  };
});

function renderScreen(displayMode: 'PRESENCIAL' | 'VIRTUAL' = 'PRESENCIAL') {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/consultas/con-1/vehiculos',
          state: {
            companyId: 'c1',
            companyName: 'VeloxRent',
            branchId: 'b1',
            branchName: 'Sede Central',
            customerName: 'Maria Quispe',
            destination: 'Ayacucho',
            travelDate: '2026-09-20',
            travelers: 2,
            travelDays: 3,
            displayMode,
            channel: 'WHATSAPP',
            touristUse: true,
            version: 1,
          },
        },
      ]}
    >
      <Routes>
        <Route path="/consultas/:id/vehiculos" element={<InquiryVehiclesScreen />} />
        <Route path="/reservas" element={<div>reservas</div>} />
        <Route path="/consultas/:id" element={<div>detalle</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InquiryVehiclesScreen (CON-03)', () => {
  beforeEach(() => {
    quoteInquiryMock.mockReset();
  });

  it('muestra el catalogo de vehiculos con el boton "Reservar este vehiculo"', () => {
    renderScreen();

    expect(screen.getByText('Toyota Hilux 4x4')).toBeInTheDocument();
    expect(screen.getAllByText('Reservar este vehículo').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Enviar evidencia/)).not.toBeInTheDocument();
  });

  it('muestra "Enviar evidencia" solo en modalidad virtual', () => {
    renderScreen('VIRTUAL');

    expect(screen.getAllByText(/Enviar evidencia/).length).toBeGreaterThan(0);
  });

  it('al reservar, cotiza el vehiculo y navega hacia /reservas', async () => {
    quoteInquiryMock.mockResolvedValue({
      id: 'con-1',
      status: 'COTIZADA',
      channel: 'WHATSAPP',
      version: 2,
      companyId: 'c1',
      customer: null,
      touristUse: true,
      createdAt: '2026-09-16T00:00:00Z',
    });
    renderScreen();

    fireEvent.click(screen.getAllByText('Reservar este vehículo')[0]);

    expect(await screen.findByText('reservas')).toBeInTheDocument();
    expect(quoteInquiryMock).toHaveBeenCalledWith('fake-id-token', 'con-1', 1, 'veh-mock-hilux', 'Ayacucho', 3);
  });
});
