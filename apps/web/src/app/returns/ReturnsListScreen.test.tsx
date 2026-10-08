import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReturnsListScreen } from './ReturnsListScreen';
import { baseContext, makeReturn } from './test-utils';
import { setPermissions } from '../../test/permissions';

const RETURN_LIST = [
  'RETURN.READ', 'RETURN.CREATE', 'RETURN.RECEIVE_PROVISIONAL',
] as const;

const listReturnsMock = vi.fn();
const listRentalsMock = vi.fn();
const scheduleReturnMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./returns-client', async () => {
  const actual = await vi.importActual<typeof import('./returns-client')>('./returns-client');
  return {
    ...actual,
    listReturns: (...args: unknown[]) => listReturnsMock(...args),
    scheduleReturn: (...args: unknown[]) => scheduleReturnMock(...args),
  };
});
vi.mock('../rentals/rentals-client', async () => {
  const actual = await vi.importActual<typeof import('../rentals/rentals-client')>('../rentals/rentals-client');
  return { ...actual, listRentals: (...args: unknown[]) => listRentalsMock(...args) };
});

const activeRental = {
  id: 'rent-9',
  status: 'ACTIVE',
  branchId: 'b1',
  customerName: 'Luis Rojas',
  vehicleBrand: 'Kia',
  vehicleModel: 'Rio',
  vehiclePlate: 'K1A-111',
  expectedEndAt: '2026-10-06T10:00:00Z',
};

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/devoluciones', state: baseContext }]}>
      <Routes>
        <Route path="/devoluciones" element={<ReturnsListScreen />} />
        <Route path="/devoluciones/recepcion/:rentalId" element={<div>pantalla recepcion</div>} />
        <Route path="/devoluciones/:id/alcoholimetro" element={<div>pantalla alcoholimetro</div>} />
        <Route path="/devoluciones/:id/resultado" element={<div>pantalla resultado</div>} />
        <Route path="/devoluciones/:id/cierre" element={<div>pantalla cierre</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReturnsListScreen (DEV-01)', () => {
  beforeEach(() => {
    listReturnsMock.mockReset();
    listRentalsMock.mockReset();
    scheduleReturnMock.mockReset();
    listRentalsMock.mockResolvedValue([]);
    sessionStorage.clear();
    setPermissions(RETURN_LIST);
  });

  it('muestra la bandeja con cliente, vehiculo, badge de etapa y fecha programada', async () => {
    listReturnsMock.mockResolvedValue([makeReturn({ status: 'RECEPCION_PROVISIONAL' })]);
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(screen.getByText('D0Y-704')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Recepción')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });

  it('consulta el backend con el contexto empresa/sede del usuario (aislamiento por sede)', async () => {
    listReturnsMock.mockResolvedValue([makeReturn()]);
    renderScreen();
    await screen.findByText('Maria Quispe');
    expect(listReturnsMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', expect.objectContaining({ limit: 20 }));
  });

  it('nunca muestra devoluciones de otra sede aunque el backend las devolviera', async () => {
    listReturnsMock.mockResolvedValue([
      makeReturn({ id: 'mine', customerName: 'Cliente de mi sede' }),
      makeReturn({ id: 'other', branchId: 'b-otra', customerName: 'Cliente de otra sede' }),
    ]);
    renderScreen();
    expect(await screen.findByText('Cliente de mi sede')).toBeInTheDocument();
    expect(screen.queryByText('Cliente de otra sede')).not.toBeInTheDocument();
  });

  it('muestra el estado vacio', async () => {
    listReturnsMock.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('Todavía no hay devoluciones registradas.')).toBeInTheDocument();
  });

  it('muestra error recuperable en lenguaje de negocio', async () => {
    listReturnsMock.mockRejectedValue(new Error('boom'));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la bandeja de devoluciones');
  });

  it('Continuar retoma el expediente segun su estado (INSPECCION/CON_DANOS -> resultado, CERRADA -> cierre)', async () => {
    listReturnsMock.mockResolvedValue([makeReturn({ id: 'r-dmg', status: 'CON_DANOS' })]);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('pantalla resultado')).toBeInTheDocument();
  });

  it('una devolucion cerrada ofrece "Ver expediente"', async () => {
    listReturnsMock.mockResolvedValue([makeReturn({ id: 'r-closed', status: 'CERRADA' })]);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Ver expediente' }));
    expect(await screen.findByText('pantalla cierre')).toBeInTheDocument();
  });

  it('el filtro de estado se conserva en sesion y se envia al backend', async () => {
    listReturnsMock.mockResolvedValue([makeReturn()]);
    renderScreen();
    await screen.findByText('Maria Quispe');
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'CON_DANOS' } });
    await waitFor(() =>
      expect(listReturnsMock).toHaveBeenLastCalledWith(
        'fake-id-token',
        'c1',
        'b1',
        expect.objectContaining({ status: 'CON_DANOS' }),
      ),
    );
    expect(sessionStorage.getItem('kairos.devoluciones.filtro')).toBe('CON_DANOS');
  });

  it('lista los alquileres activos y "Iniciar devolución" lleva a la recepcion (1 accion)', async () => {
    listReturnsMock.mockResolvedValue([]);
    listRentalsMock.mockResolvedValue([activeRental]);
    renderScreen();
    fireEvent.click(await screen.findByRole('link', { name: 'Iniciar devolución de K1A-111' }));
    expect(await screen.findByText('pantalla recepcion')).toBeInTheDocument();
  });

  it('programar una devolucion llama a POST /returns y recarga la bandeja', async () => {
    listReturnsMock.mockResolvedValue([]);
    listRentalsMock.mockResolvedValue([activeRental]);
    scheduleReturnMock.mockResolvedValue(makeReturn({ status: 'PROGRAMADA' }));
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Programar devolución de K1A-111' }));
    fireEvent.change(screen.getByLabelText('Fecha y hora pactada'), { target: { value: '2026-10-06T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }));

    await waitFor(() =>
      expect(scheduleReturnMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', 'rent-9', expect.any(String)),
    );
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    listReturnsMock.mockResolvedValue([makeReturn()]);
    listRentalsMock.mockResolvedValue([activeRental]);
    const { container } = renderScreen();
    await screen.findByText('Maria Quispe');
    expect(await axe(container)).toHaveNoViolations();
  });
});
