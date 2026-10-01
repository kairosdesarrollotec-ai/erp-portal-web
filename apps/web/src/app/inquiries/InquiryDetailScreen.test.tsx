import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InquiryDetailScreen } from './InquiryDetailScreen';

const getInquiryMock = vi.fn();
const closeInquiryMock = vi.fn();
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
    getInquiry: (...args: unknown[]) => getInquiryMock(...args),
    closeInquiry: (...args: unknown[]) => closeInquiryMock(...args),
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

function buildInquiry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'con-1',
    status: 'COTIZADA',
    channel: 'WHATSAPP',
    version: 1,
    companyId: 'c1',
    customerId: 'cust-1',
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
    getCustomerMock.mockReset().mockResolvedValue({ id: 'cust-1', fullName: 'Maria Quispe' });
    getWorkContextAssignmentsMock.mockReset().mockResolvedValue(oneAssignment);
  });

  it('muestra el resumen y la cotizacion', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(screen.getByText('veh-mock-hilux')).toBeInTheDocument();
  });

  // Hallazgo Critico #4: ya no existe un boton que "reserve" de verdad -
  // se muestra deshabilitado con una explicacion honesta, y la consulta
  // permanece Cotizada (nunca se llama a convert-to-reservation).
  it('cuando hay cotizacion, muestra "Crear reserva" deshabilitado con una explicacion, sin convertir la consulta', async () => {
    getInquiryMock.mockResolvedValue(buildInquiry());
    renderScreen();

    await screen.findByText('Maria Quispe');
    const createButton = screen.getByText('Crear reserva — no disponible todavía');
    expect(createButton.closest('button')).toBeDisabled();
    expect(screen.getByText(/requiere datos que esta pantalla todavía no captura/)).toBeInTheDocument();
    expect(screen.getByText('Cotizada')).toBeInTheDocument();
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
      'c1',
      'b1',
      'CIERRE_MANUAL',
      'El cliente ya no requiere el vehículo.',
    );
  });
});
