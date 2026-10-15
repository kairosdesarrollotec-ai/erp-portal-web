import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ReservationNoShowScreen } from './ReservationNoShowScreen';
import { ReservationCommandError } from './reservations-client';
import { buildReservation, renderAt } from './resolution-test-utils';

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
const canMock = vi.fn();
vi.mock('../shared/useRolePermissions', () => ({ useRolePermissions: () => ({ can: (...a: unknown[]) => canMock(...a) }) }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
const getReservationMock = vi.fn();
const cancelMock = vi.fn();
vi.mock('./reservations-client', async () => ({
  ...(await vi.importActual<typeof import('./reservations-client')>('./reservations-client')),
  getReservation: (...a: unknown[]) => getReservationMock(...a),
  cancelReservation: (...a: unknown[]) => cancelMock(...a),
}));

const render = () => renderAt('/reservas/res-1/no-show', '/reservas/:id/no-show', <ReservationNoShowScreen />);

describe('ReservationNoShowScreen (RES-08)', () => {
  beforeEach(() => {
    getReservationMock.mockReset().mockResolvedValue(buildReservation({ startDatePassed: true }));
    cancelMock.mockReset();
    canMock.mockReset().mockReturnValue(true);
  });

  it('antes de la fecha pactada explica la causa y no ofrece acciones', async () => {
    getReservationMock.mockResolvedValue(buildReservation({ startDatePassed: false }));
    render();
    expect(await screen.findByText(/Disponible desde el/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Se presentó' })).not.toBeInTheDocument();
  });

  it('"Se presentó" lleva a ALQ-02 con el contexto heredado de la reserva', async () => {
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'Se presentó' }));
    expect(await screen.findByText('ALQ-02')).toBeInTheDocument();
    const st = screen.getByTestId('state').textContent ?? '';
    expect(st).toContain('"reservationId":"res-1"');
    expect(st).toContain('"vehicleId":"v-1"');
  });

  it('"No se presentó" exige confirmación explícita y cancela con NO_SHOW', async () => {
    cancelMock.mockResolvedValue(buildReservation({ status: 'CANCELLED' }));
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'No se presentó' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/pierde el monto/);
    expect(cancelMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar no-show/ }));
    expect(await screen.findByText(/No-show registrado/)).toBeInTheDocument();
    expect(cancelMock).toHaveBeenCalledWith('tok', 'res-1', 'c1', 'b1', 3, 'NO_SHOW', undefined);
  });

  it('sin permiso de Gerencia el no-show queda deshabilitado con explicación', async () => {
    canMock.mockImplementation((_m: string, a: string) => a !== 'CANCEL_NO_SHOW');
    render();
    expect(await screen.findByRole('button', { name: 'No se presentó' })).toBeDisabled();
    expect(screen.getByText('Solo Gerencia puede registrar el no-show.')).toBeInTheDocument();
  });

  it('muestra el error del back si el cancel falla (409)', async () => {
    cancelMock.mockRejectedValue(new ReservationCommandError(409, { code: 'RESERVATION_STATE_CONFLICT' }));
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'No se presentó' }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar no-show/ }));
    expect(await screen.findByText(/ya no está en un estado/)).toBeInTheDocument();
  });

  it('412 muestra el banner de conflicto de versión y recarga', async () => {
    cancelMock.mockRejectedValue(new ReservationCommandError(412, { code: 'RESERVATION_VERSION_CONFLICT' }));
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'No se presentó' }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar no-show/ }));
    expect(await screen.findByText(/cambió por otra operación/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }));
    await waitFor(() => expect(getReservationMock).toHaveBeenCalledTimes(2));
  });

  it('una reserva no confirmada no entra al protocolo', async () => {
    getReservationMock.mockResolvedValue(buildReservation({ status: 'CONVERTED', startDatePassed: true }));
    render();
    expect(await screen.findByText(/Solo una reserva confirmada/)).toBeInTheDocument();
  });
});
