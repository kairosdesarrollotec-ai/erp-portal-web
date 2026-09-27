import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InquiryVehiclesScreen } from './InquiryVehiclesScreen';

const quoteInquiryMock = vi.fn();
const getInquiryMock = vi.fn();
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
    quoteInquiry: (...args: unknown[]) => quoteInquiryMock(...args),
    getInquiry: (...args: unknown[]) => getInquiryMock(...args),
  };
});

vi.mock('../auth/work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
}));

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
  });

  it('muestra el catalogo de vehiculos con el boton "Cotizar este vehiculo" y el banner de demo', () => {
    renderScreen();

    expect(screen.getByText('Toyota Hilux 4x4')).toBeInTheDocument();
    expect(screen.getAllByText('Cotizar este vehículo').length).toBeGreaterThan(0);
    expect(screen.getByText(/Catálogo de demostración/)).toBeInTheDocument();
    expect(screen.queryByText(/Enviar evidencia/)).not.toBeInTheDocument();
  });

  // Finding "Botones sin implementación": el boton de evidencia esta
  // deshabilitado con una explicacion, no ausente ni funcional a medias.
  it('el boton "Enviar evidencia" aparece deshabilitado en modalidad virtual', () => {
    renderScreen('VIRTUAL');

    const evidenceButtons = screen.getAllByText(/Enviar evidencia/);
    expect(evidenceButtons.length).toBeGreaterThan(0);
    evidenceButtons.forEach((button) => expect(button.closest('button')).toBeDisabled());
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
      customer: null,
      touristUse: true,
      createdAt: '2026-09-16T00:00:00Z',
    });
    renderScreen();

    fireEvent.click(screen.getAllByText('Cotizar este vehículo')[0]);

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
      customer: { id: 'cust-1', name: 'Maria Quispe' },
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
      customer: null,
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
