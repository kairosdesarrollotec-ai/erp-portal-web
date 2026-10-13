import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ReservationDetailScreen } from './ReservationDetailScreen';
import { ReservationCommandError } from './reservations-client';
import { buildReservation, renderAt } from './resolution-test-utils';

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
const canMock = vi.fn();
vi.mock('../shared/useRolePermissions', () => ({ useRolePermissions: () => ({ can: (...a: unknown[]) => canMock(...a) }) }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
const getReservationMock = vi.fn();
const confirmMock = vi.fn();
vi.mock('./reservations-client', async () => ({
  ...(await vi.importActual<typeof import('./reservations-client')>('./reservations-client')),
  getReservation: (...a: unknown[]) => getReservationMock(...a),
  confirmReservation: (...a: unknown[]) => confirmMock(...a),
}));

const render = () => renderAt('/reservas/res-1', '/reservas/:id', <ReservationDetailScreen />);

describe('ReservationDetailScreen - enlaces a RES-06/07/08', () => {
  beforeEach(() => {
    getReservationMock.mockReset();
    confirmMock.mockReset();
    canMock.mockReset().mockReturnValue(true);
  });

  it('409 VEHICLE_NOT_AVAILABLE al confirmar ofrece "Ver alternativas" -> RES-06', async () => {
    getReservationMock.mockResolvedValue(buildReservation({ status: 'DRAFT' }));
    confirmMock.mockRejectedValue(new ReservationCommandError(409, { code: 'VEHICLE_NOT_AVAILABLE', detail: 'Ocupado del 20 al 22.' }));
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ver alternativas' }));
    expect(await screen.findByText('RES-06')).toBeInTheDocument();
    expect(screen.getByTestId('state').textContent).toContain('Ocupado del 20 al 22.');
  });

  it('CONFIRMED con startDatePassed muestra "Protocolo de no-show" -> RES-08', async () => {
    getReservationMock.mockResolvedValue(buildReservation({ startDatePassed: true }));
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'Protocolo de no-show' }));
    expect(await screen.findByText('RES-08')).toBeInTheDocument();
  });

  it('CONFIRMED antes de la fecha no muestra el enlace de no-show', async () => {
    getReservationMock.mockResolvedValue(buildReservation({ startDatePassed: false }));
    render();
    await screen.findByText('Continuar con alquiler');
    expect(screen.queryByRole('button', { name: 'Protocolo de no-show' })).not.toBeInTheDocument();
  });

  it('CONFIRMED con FLAG_SALE muestra "Registrar venta" -> RES-07; sin permiso se oculta', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    const { unmount } = render();
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar venta del vehículo' }));
    expect(await screen.findByText('RES-07')).toBeInTheDocument();
    unmount();
    canMock.mockImplementation((_m: string, a: string) => a !== 'FLAG_SALE');
    render();
    await screen.findByText('Continuar con alquiler');
    expect(screen.queryByRole('button', { name: 'Registrar venta del vehículo' })).not.toBeInTheDocument();
  });

  it('PENDING_SALE_RESOLUTION muestra "Resolver venta" -> RES-07', async () => {
    getReservationMock.mockResolvedValue(buildReservation({ status: 'PENDING_SALE_RESOLUTION' }));
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'Resolver venta' }));
    expect(await screen.findByText('RES-07')).toBeInTheDocument();
  });

  it('CANCELLED con reembolso pendiente lo indica', async () => {
    getReservationMock.mockResolvedValue(
      buildReservation({ status: 'CANCELLED', saleResolution: { refundStatus: 'PENDING_TRANSFER', status: 'REJECTED' } }),
    );
    render();
    expect(await screen.findByText(/Reembolso pendiente de transferencia/)).toBeInTheDocument();
  });
});
