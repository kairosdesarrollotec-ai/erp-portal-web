import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InquiryDetailScreen } from './InquiryDetailScreen';

const getInquiryMock = vi.fn();
const closeInquiryMock = vi.fn();
const convertInquiryToReservationMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./inquiries-client', async () => {
  const actual = await vi.importActual<typeof import('./inquiries-client')>('./inquiries-client');
  return {
    ...actual,
    getInquiry: (...args: unknown[]) => getInquiryMock(...args),
    closeInquiry: (...args: unknown[]) => closeInquiryMock(...args),
    convertInquiryToReservation: (...args: unknown[]) => convertInquiryToReservationMock(...args),
  };
});

function buildInquiry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'con-1',
    status: 'COTIZADA',
    channel: 'WHATSAPP',
    version: 1,
    companyId: 'c1',
    customer: { id: 'cust-1', name: 'Maria Quispe' },
    touristUse: true,
    createdAt: '2026-09-16T00:00:00Z',
    interactions: [],
    quotations: [
      { id: 'quo-1', vehicleId: 'veh-mock-hilux', destination: 'Ayacucho', estimatedDays: 3, createdAt: '2026-09-16T01:00:00Z' },
    ],
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/consultas/con-1', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path="/consultas/:id" element={<InquiryDetailScreen />} />
        <Route path="/consultas" element={<div>bandeja</div>} />
        <Route path="/reservas" element={<div>reservas</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InquiryDetailScreen (CON-04)', () => {
  beforeEach(() => {
    getInquiryMock.mockReset();
    closeInquiryMock.mockReset();
    convertInquiryToReservationMock.mockReset();
  });

  it('muestra el resumen y el boton "Reservar este vehiculo" cuando hay cotizacion', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(screen.getByText('Reservar este vehículo')).toBeInTheDocument();
    expect(screen.getByText('veh-mock-hilux')).toBeInTheDocument();
  });

  it('no permite confirmar el cierre sin motivo', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    renderScreen();

    await screen.findByText('Maria Quispe');
    fireEvent.click(screen.getByText('Cerrar sin conversión'));

    const confirmButton = screen.getByText('Confirmar cierre');
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Motivo del cierre (obligatorio)'), {
      target: { value: 'El cliente ya no requiere el vehículo.' },
    });
    expect(confirmButton).not.toBeDisabled();

    closeInquiryMock.mockResolvedValue(buildInquiry({ status: 'CERRADA_SIN_CONVERSION', version: 2 }));
    fireEvent.click(confirmButton);

    expect(await screen.findByText('Esta consulta fue cerrada sin conversión.')).toBeInTheDocument();
    expect(closeInquiryMock).toHaveBeenCalledWith(
      'fake-id-token',
      'con-1',
      1,
      'CIERRE_MANUAL',
      'El cliente ya no requiere el vehículo.',
    );
  });

  it('al reservar, convierte la consulta y navega a /reservas', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    convertInquiryToReservationMock.mockResolvedValue(buildInquiry({ status: 'CONVERTIDA', version: 2 }));
    renderScreen();

    await screen.findByText('Maria Quispe');
    fireEvent.click(screen.getByText('Reservar este vehículo'));

    expect(await screen.findByText('reservas')).toBeInTheDocument();
    expect(convertInquiryToReservationMock).toHaveBeenCalledWith('fake-id-token', 'con-1', 1);
  });
});
