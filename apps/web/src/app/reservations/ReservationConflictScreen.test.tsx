import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ReservationConflictScreen } from './ReservationConflictScreen';
import { buildReservation, buildVehicle, renderAt } from './resolution-test-utils';

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../shared/useRolePermissions', () => ({ useRolePermissions: () => ({ can: () => true }) }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
const getReservationMock = vi.fn();
vi.mock('./reservations-client', async () => ({
  ...(await vi.importActual<typeof import('./reservations-client')>('./reservations-client')),
  getReservation: (...a: unknown[]) => getReservationMock(...a),
}));
const listVehiclesMock = vi.fn();
vi.mock('../fleet/fleet-client', () => ({ listVehicles: (...a: unknown[]) => listVehiclesMock(...a) }));

const render = () => renderAt('/reservas/res-1/conflicto', '/reservas/:id/conflicto', <ReservationConflictScreen />);

describe('ReservationConflictScreen (RES-06)', () => {
  beforeEach(() => {
    getReservationMock.mockReset().mockResolvedValue(buildReservation({ status: 'DRAFT' }));
    listVehiclesMock.mockReset();
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

  it('Continuar vuelve a RES-04 con la alternativa elegida', async () => {
    listVehiclesMock.mockResolvedValue({ items: [buildVehicle('v-2', 'ABC-111')], total: 1 });
    render();
    fireEvent.click(await screen.findByLabelText(/ABC-111/));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con la alternativa' }));
    expect(await screen.findByText('RES-04')).toBeInTheDocument();
    expect(screen.getByTestId('state').textContent).toContain('"id":"v-2"');
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
