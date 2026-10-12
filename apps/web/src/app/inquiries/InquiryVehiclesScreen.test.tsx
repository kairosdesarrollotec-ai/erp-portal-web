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

  describe('disponibilidad por fechas del viaje', () => {
    const BUSY = {
      ...FLEET_VEHICLE_1,
      availability: {
        available: false,
        conflictFrom: '2026-09-21T15:00:00Z',
        conflictTo: '2026-09-24T15:00:00Z',
        conflictSource: 'RESERVATION',
      },
    };
    const FREE = { ...FLEET_VEHICLE_2, availability: { available: true } };

    it('pide la ventana de viaje (fecha 00:00 UTC + dias estimados) a Fleet', async () => {
      renderScreen();
      await screen.findByText('Toyota Hilux 4x4');
      expect(listVehiclesMock).toHaveBeenCalledWith(
        'fake-id-token',
        expect.objectContaining({
          availableFrom: '2026-09-20T00:00:00.000Z',
          availableTo: '2026-09-23T00:00:00.000Z',
        }),
      );
    });

    it('sin fecha de viaje no envia la ventana', async () => {
      renderScreen('PRESENCIAL', {
        companyId: 'c1', companyName: 'V', branchId: 'b1', branchName: 'S', customerName: 'M',
        destination: 'Ayacucho', travelDate: '', travelers: 1, travelDays: 3, displayMode: 'PRESENCIAL',
        channel: 'WHATSAPP', touristUse: true, version: 1,
      });
      await screen.findByText('Toyota Hilux 4x4');
      const params = listVehiclesMock.mock.calls[0][1];
      expect(params.availableFrom).toBeUndefined();
      expect(params.availableTo).toBeUndefined();
    });

    it('deep link: usa fecha y dias de la consulta cargada', async () => {
      getWorkContextAssignmentsMock.mockResolvedValue([
        { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
      ]);
      getInquiryMock.mockResolvedValue({
        id: 'con-1', status: 'REGISTRADA', channel: 'WHATSAPP', version: 5, companyId: 'c1', customerId: 'c',
        touristUse: true, createdAt: '2026-09-16T00:00:00Z', interactions: [], quotations: [],
        travelStartDate: '2026-10-01', estimatedDays: 2, destination: 'Cusco',
      });
      renderScreen('PRESENCIAL', null);
      await screen.findByText('Toyota Hilux 4x4');
      expect(listVehiclesMock).toHaveBeenCalledWith(
        'fake-id-token',
        expect.objectContaining({ availableFrom: '2026-10-01T00:00:00.000Z', availableTo: '2026-10-03T00:00:00.000Z' }),
      );
    });

    it('el vehiculo ocupado va al final, deshabilitado y con motivo asociado', async () => {
      listVehiclesMock.mockResolvedValue({ items: [BUSY, FREE], total: 2 });
      renderScreen();

      await screen.findByText('Toyota Hilux 4x4');
      const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
      expect(headings).toEqual(['Hyundai Tucson', 'Toyota Hilux 4x4']);

      const buttons = screen.getAllByRole('button', { name: 'Cotizar este vehículo' });
      expect(buttons[0]).toBeEnabled();
      expect(buttons[1]).toBeDisabled();
      expect(screen.getByText('No disponible en estas fechas')).toBeInTheDocument();
      expect(screen.getByText('Ocupado del 21/09 al 24/09')).toBeInTheDocument();
      const reasonId = buttons[1].getAttribute('aria-describedby');
      expect(reasonId).toBeTruthy();
      expect(document.getElementById(reasonId!)).toHaveTextContent('No disponible en estas fechas');
      expect(buttons[0]).not.toHaveAttribute('aria-describedby');

      fireEvent.click(buttons[1]);
      expect(quoteInquiryMock).not.toHaveBeenCalled();
    });

    it('muestra el motivo aunque no vengan fechas de conflicto', async () => {
      listVehiclesMock.mockResolvedValue({
        items: [{ ...FLEET_VEHICLE_1, availability: { available: false } }, FREE],
        total: 2,
      });
      renderScreen();
      await screen.findByText('Toyota Hilux 4x4');
      expect(screen.getByText('No disponible en estas fechas')).toBeInTheDocument();
      expect(screen.queryByText(/Ocupado del/)).not.toBeInTheDocument();
    });

    it('si todos estan ocupados, muestra un mensaje de estado y ningun boton habilitado', async () => {
      listVehiclesMock.mockResolvedValue({
        items: [BUSY, { ...FLEET_VEHICLE_2, availability: { available: false } }],
        total: 2,
      });
      renderScreen();
      expect(await screen.findByText(/Todos los vehículos están ocupados en las fechas de este viaje/)).toBeInTheDocument();
      screen.getAllByRole('button', { name: 'Cotizar este vehículo' }).forEach((b) => expect(b).toBeDisabled());
    });

    it('sin campo availability (sin ventana) los vehiculos se consideran disponibles', async () => {
      renderScreen();
      await screen.findByText('Toyota Hilux 4x4');
      expect(screen.queryByText('No disponible en estas fechas')).not.toBeInTheDocument();
      screen.getAllByRole('button', { name: 'Cotizar este vehículo' }).forEach((b) => expect(b).toBeEnabled());
    });
  });
});
