import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ReservationConflictScreen } from './ReservationConflictScreen';
import { buildReservation, buildVehicle, renderAt } from './resolution-test-utils';

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
let canChange = true;
vi.mock('../shared/useRolePermissions', () => ({ useRolePermissions: () => ({ can: () => canChange }) }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
const getReservationMock = vi.fn();
const changeVehicleMock = vi.fn();
vi.mock('./reservations-client', async () => ({
  ...(await vi.importActual<typeof import('./reservations-client')>('./reservations-client')),
  getReservation: (...a: unknown[]) => getReservationMock(...a),
  changeReservationVehicle: (...a: unknown[]) => changeVehicleMock(...a),
}));
const listVehiclesMock = vi.fn();
vi.mock('../fleet/fleet-client', () => ({ listVehicles: (...a: unknown[]) => listVehiclesMock(...a) }));

const render = () => renderAt('/reservas/res-1/conflicto', '/reservas/:id/conflicto', <ReservationConflictScreen />);

describe('ReservationConflictScreen (RES-06)', () => {
  beforeEach(() => {
    getReservationMock.mockReset().mockResolvedValue(buildReservation({ status: 'DRAFT' }));
    listVehiclesMock.mockReset();
    changeVehicleMock.mockReset();
    canChange = true;
  });

  it('lista alternativas libres excluyendo el vehículo original y consulta la ventana de la reserva', async () => {
    listVehiclesMock.mockResolvedValue({
      items: [
        buildVehicle('v-1', 'D0Y-704'),
        buildVehicle('v-2', 'ABC-111'),
        buildVehicle('v-3', 'OCU-999', { availability: { available: false } }),
      ],
      total: 3,
    });
    render();
    expect(await screen.findByLabelText(/ABC-111/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/D0Y-704/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/OCU-999/)).not.toBeInTheDocument();
    expect(listVehiclesMock).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({ availableFrom: '2026-09-20T14:00:00Z', availableTo: '2026-09-22T14:00:00Z' }),
    );
    expect(screen.getByRole('button', { name: 'Continuar con la alternativa' })).toBeDisabled();
  });

  it('Continuar llama a change-vehicle con la versión y navega a RES-04 sin sugerencias en el estado', async () => {
    listVehiclesMock.mockResolvedValue({ items: [buildVehicle('v-2', 'ABC-111')], total: 1 });
    changeVehicleMock.mockResolvedValue(buildReservation({ status: 'DRAFT', vehicle: { id: 'v-2', plate: 'ABC-111', label: 'Kia Rio' } }));
    render();
    fireEvent.click(await screen.findByLabelText(/ABC-111/));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con la alternativa' }));
    expect(await screen.findByText('RES-04')).toBeInTheDocument();
    expect(changeVehicleMock).toHaveBeenCalledWith('tok', 'res-1', 'c1', 'b1', 3, 'v-2');
    expect(screen.getByTestId('state').textContent).not.toContain('alternativeVehicle');
  });

  it.each([
    [409, 'RESERVATION_STATE_CONFLICT', /ya no está en un estado/],
    [409, 'VEHICLE_NOT_AVAILABLE', /ya está ocupado/],
    [422, 'ALTERNATIVE_VEHICLE_INVALID', /alternativo no es válido/],
  ])('error %i %s se muestra y no navega', async (status, code, text) => {
    const { ReservationCommandError } = await import('./reservations-client');
    listVehiclesMock.mockResolvedValue({ items: [buildVehicle('v-2', 'ABC-111')], total: 1 });
    changeVehicleMock.mockRejectedValue(new ReservationCommandError(status, { code }));
    render();
    fireEvent.click(await screen.findByLabelText(/ABC-111/));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con la alternativa' }));
    await vi.waitFor(() => expect(screen.getAllByRole('alert').map((n) => n.textContent).join(' ')).toMatch(text));
    expect(screen.queryByText('RES-04')).not.toBeInTheDocument();
  });

  it('412 muestra el aviso de conflicto de sincronización', async () => {
    const { ReservationCommandError } = await import('./reservations-client');
    listVehiclesMock.mockResolvedValue({ items: [buildVehicle('v-2', 'ABC-111')], total: 1 });
    changeVehicleMock.mockRejectedValue(new ReservationCommandError(412, { code: 'RESERVATION_VERSION_CONFLICT' }));
    render();
    fireEvent.click(await screen.findByLabelText(/ABC-111/));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con la alternativa' }));
    await vi.waitFor(() => expect(changeVehicleMock).toHaveBeenCalled());
    expect(screen.queryByText('RES-04')).not.toBeInTheDocument();
  });

  it('sin permiso CHANGE_VEHICLE el botón queda deshabilitado con aviso', async () => {
    canChange = false;
    listVehiclesMock.mockResolvedValue({ items: [buildVehicle('v-2', 'ABC-111')], total: 1 });
    render();
    fireEvent.click(await screen.findByLabelText(/ABC-111/));
    expect(screen.getByRole('button', { name: 'Continuar con la alternativa' })).toBeDisabled();
    expect(screen.getByText(/Tu rol no puede cambiar el vehículo/)).toBeInTheDocument();
  });

  it('Cancelar sale a la bandeja', async () => {
    listVehiclesMock.mockResolvedValue({ items: [], total: 0 });
    render();
    expect(await screen.findByText(/No hay otros vehículos libres/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByText('bandeja')).toBeInTheDocument();
  });

  it('error al consultar alternativas ofrece reintentar', async () => {
    listVehiclesMock.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ items: [buildVehicle('v-2', 'ABC-111')], total: 1 });
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByLabelText(/ABC-111/)).toBeInTheDocument();
  });

  it('si la reserva no es borrador no hay conflicto que resolver', async () => {
    getReservationMock.mockResolvedValue(buildReservation({ status: 'CONFIRMED' }));
    listVehiclesMock.mockResolvedValue({ items: [], total: 0 });
    render();
    expect(await screen.findByText(/ya no está en borrador/)).toBeInTheDocument();
  });

  it('error de carga muestra mensaje recuperable', async () => {
    getReservationMock.mockRejectedValue(new Error('boom'));
    render();
    expect(await screen.findByText(/No pudimos cargar esta reserva/)).toBeInTheDocument();
  });
});
