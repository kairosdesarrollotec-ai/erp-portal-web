import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InquiryVehiclesScreen } from './InquiryVehiclesScreen';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));

const quoteInquiryMock = vi.fn();
const getInquiryMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();
const listVehiclesMock = vi.fn();

const FLEET_VEHICLE_1 = {
  id: 'f1a2b3c4-d5e6-4789-8a0b-c1d2e3f40001',
  organizationId: 'org-1',
  operatingCompanyId: 'c1',
  branchId: 'b1',
  plate: 'ABC-123',
  brand: 'Toyota',
  model: 'Hilux 4x4',
  year: 2023,
  color: 'Blanco',
  category: 'PICKUP',
  status: 'AVAILABLE',
  dailyRate: 220,
  photoUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=480&q=60',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const FLEET_VEHICLE_2 = {
  id: 'f1a2b3c4-d5e6-4789-8a0b-c1d2e3f40002',
  organizationId: 'org-1',
  operatingCompanyId: 'c1',
  branchId: 'b1',
  plate: 'DEF-456',
  brand: 'Hyundai',
  model: 'Tucson',
  year: 2022,
  color: 'Gris',
  category: 'SUV',
  status: 'AVAILABLE',
  dailyRate: 180,
  photoUrl: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=480&q=60',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

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
    getInquiry: (...args: unknown[]) => getInquiryMock(...args),
  };
});

vi.mock('../auth/work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
}));

vi.mock('../fleet/fleet-client', async () => {
  const actual = await vi.importActual<typeof import('../fleet/fleet-client')>('../fleet/fleet-client');
  return {
    ...actual,
    listVehicles: (...args: unknown[]) => listVehiclesMock(...args),
  };
});

const DEFAULT_NAV_STATE_SENTINEL = Symbol('default-nav-state');

function renderScreen(
  displayMode: 'PRESENCIAL' | 'VIRTUAL' = 'PRESENCIAL',
  state: Record<string, unknown> | null | typeof DEFAULT_NAV_STATE_SENTINEL = DEFAULT_NAV_STATE_SENTINEL,
) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/consultas/con-1/vehiculos',
          state:
            state === DEFAULT_NAV_STATE_SENTINEL
              ? {
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
                }
              : state,
        },
      ]}
    >
      <Routes>
        <Route path="/consultas/:id/vehiculos" element={<InquiryVehiclesScreen />} />
        <Route path="/reservas" element={<div>reservas</div>} />
        <Route path="/consultas/:id" element={<div>detalle</div>} />
        <Route path="/consultas" element={<div>bandeja</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InquiryVehiclesScreen (CON-03)', () => {
  beforeEach(() => {
    quoteInquiryMock.mockReset();
    getInquiryMock.mockReset();
    getWorkContextAssignmentsMock.mockReset();
    listVehiclesMock.mockReset();
    listVehiclesMock.mockResolvedValue({ items: [FLEET_VEHICLE_1, FLEET_VEHICLE_2], total: 2 });
  });

  it('muestra el catalogo real de Fleet con el boton "Cotizar este vehiculo"', async () => {
    renderScreen();

    expect(await screen.findByText('Toyota Hilux 4x4')).toBeInTheDocument();
    expect(screen.getAllByText('Cotizar este vehículo').length).toBeGreaterThan(0);
    expect(listVehiclesMock).toHaveBeenCalledWith(
      'fake-id-token',
      expect.objectContaining({ companyId: 'c1', branchId: 'b1', status: 'AVAILABLE' }),
    );
  });

  // Finding "Botones sin implementación": el boton de evidencia esta
  // deshabilitado con una explicacion, no ausente ni funcional a medias.
  it('el boton "Enviar evidencia" aparece deshabilitado en modalidad virtual', async () => {
    renderScreen('VIRTUAL');

    await screen.findByText('Toyota Hilux 4x4');
    const evidenceButtons = screen.getAllByText(/Enviar evidencia/);
    expect(evidenceButtons.length).toBeGreaterThan(0);
    evidenceButtons.forEach((button) => expect(button.closest('button')).toBeDisabled());
  });

  it('si Fleet no devuelve vehiculos, muestra el estado vacio', async () => {
    listVehiclesMock.mockResolvedValue({ items: [], total: 0 });
    renderScreen();

    expect(await screen.findByText('No hay vehículos elegibles para esta consulta.')).toBeInTheDocument();
  });

  // Finding Critico #4 (lado CON-03): ya no navega a /reservas como si
  // hubiera reservado - solo cotiza y va al detalle de la consulta.
  it('al cotizar, llama a quoteInquiry y navega al detalle de la consulta (no a /reservas)', async () => {
    quoteInquiryMock.mockResolvedValue({
      id: 'con-1',
      status: 'COTIZADA',
      channel: 'WHATSAPP',
      version: 2,
      companyId: 'c1',
      customerId: null,
      touristUse: true,
      createdAt: '2026-09-16T00:00:00Z',
    });
    renderScreen();

    fireEvent.click((await screen.findAllByText('Cotizar este vehículo'))[0]);

    expect(await screen.findByText('detalle')).toBeInTheDocument();
    expect(quoteInquiryMock).toHaveBeenCalledWith('fake-id-token', 'con-1', 1, 'c1', 'b1', 'f1a2b3c4-d5e6-4789-8a0b-c1d2e3f40001', 'Ayacucho', 3);
  });

  // Finding "Deep link roto en CON-03": sin location.state, se resuelve
  // el contexto real y la version autoritativa via getInquiry, nunca se
  // inventa version = 1.
  it('sin location.state, resuelve el contexto y la version reales con getInquiry (deep link)', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue([
      { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
    ]);
    getInquiryMock.mockResolvedValue({
      id: 'con-1',
      status: 'REGISTRADA',
      channel: 'WHATSAPP',
      version: 5,
      companyId: 'c1',
      customerId: 'cust-1',
      touristUse: true,
      createdAt: '2026-09-16T00:00:00Z',
      interactions: [],
      quotations: [],
    });
    quoteInquiryMock.mockResolvedValue({
      id: 'con-1',
      status: 'COTIZADA',
      channel: 'WHATSAPP',
      version: 6,
      companyId: 'c1',
      customerId: null,
      touristUse: true,
      createdAt: '2026-09-16T00:00:00Z',
    });

    renderScreen('PRESENCIAL', null);

    fireEvent.click((await screen.findAllByText('Cotizar este vehículo'))[0]);

    await waitFor(() =>
      expect(quoteInquiryMock).toHaveBeenCalledWith('fake-id-token', 'con-1', 5, 'c1', 'b1', 'f1a2b3c4-d5e6-4789-8a0b-c1d2e3f40001', '', 1),
    );
  });

  it('sin location.state ni asignaciones resolubles, muestra un error recuperable en vez de adivinar', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue([]);
    renderScreen('PRESENCIAL', null);

    expect(await screen.findByText(/No pudimos cargar esta consulta/)).toBeInTheDocument();
  });
});
