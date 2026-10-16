import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ReservationSaleScreen } from './ReservationSaleScreen';
import { ReservationCommandError } from './reservations-client';
import { buildReservation, buildVehicle, renderAt } from './resolution-test-utils';

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
const canMock = vi.fn();
vi.mock('../shared/useRolePermissions', () => ({ useRolePermissions: () => ({ can: (...a: unknown[]) => canMock(...a) }) }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
const getReservationMock = vi.fn();
const flagMock = vi.fn();
const resolveMock = vi.fn();
vi.mock('./reservations-client', async () => ({
  ...(await vi.importActual<typeof import('./reservations-client')>('./reservations-client')),
  getReservation: (...a: unknown[]) => getReservationMock(...a),
  flagVehicleSale: (...a: unknown[]) => flagMock(...a),
  resolveVehicleSale: (...a: unknown[]) => resolveMock(...a),
}));
const listVehiclesMock = vi.fn();
vi.mock('../fleet/fleet-client', () => ({ listVehicles: (...a: unknown[]) => listVehiclesMock(...a) }));

const render = () => renderAt('/reservas/res-1/venta', '/reservas/:id/venta', <ReservationSaleScreen />);
const baseResolution = {
      id: 's1', status: 'PENDING', reason: 'VEHICLE_SOLD',
      offeredVehicle: { id: 'v-2', plate: 'ABC-111', label: 'Kia Rio - ABC-111' },
      offerNote: 'Mismo precio', flaggedAt: '2026-09-18T00:00:00Z', alternativeVehicleId: null,
      refundStatus: null, resolutionNote: null, resolvedAt: null,
};
const pending = (extra: Record<string, unknown> = {}) =>
  buildReservation({ status: 'PENDING_SALE_RESOLUTION', saleResolution: baseResolution, ...extra });

describe('ReservationSaleScreen (RES-07)', () => {
  beforeEach(() => {
    getReservationMock.mockReset().mockResolvedValue(buildReservation());
    flagMock.mockReset();
    resolveMock.mockReset();
    canMock.mockReset().mockReturnValue(true);
    listVehiclesMock.mockReset().mockResolvedValue({ items: [buildVehicle('v-2', 'ABC-111')], total: 1 });
  });

  it('CONFIRMED: registra la venta con alternativa y nota y refresca el detalle', async () => {
    flagMock.mockResolvedValue(buildReservation({ status: 'PENDING_SALE_RESOLUTION' }));
    getReservationMock
      .mockResolvedValueOnce(buildReservation())
      .mockResolvedValueOnce(pending());
    render();
    fireEvent.click(await screen.findByLabelText(/ABC-111/));
    fireEvent.change(screen.getByLabelText(/Nota para el cliente/), { target: { value: 'Mismo precio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar venta del vehículo' }));
    expect(await screen.findByText(/Alternativa ofrecida: Kia Rio - ABC-111/)).toBeInTheDocument();
    expect(flagMock).toHaveBeenCalledWith('tok', 'res-1', 'c1', 'b1', 3, { alternativeVehicleId: 'v-2', note: 'Mismo precio' });
    expect(getReservationMock).toHaveBeenCalledTimes(2);
  });

  it('CONFIRMED sin permiso FLAG_SALE no muestra la acción', async () => {
    canMock.mockReturnValue(false);
    render();
    expect(await screen.findByText(/Solo Gerencia o Administración pueden registrar/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar venta del vehículo' })).not.toBeInTheDocument();
  });

  it('409 VEHICLE_NOT_AVAILABLE al registrar muestra el aviso', async () => {
    flagMock.mockRejectedValue(new ReservationCommandError(409, { code: 'VEHICLE_NOT_AVAILABLE', detail: 'La alternativa está ocupada del 20 al 22.' }));
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar venta del vehículo' }));
    expect(await screen.findByText('La alternativa está ocupada del 20 al 22.')).toBeInTheDocument();
  });

  it('PENDING: aceptar alternativa ofrecida resuelve y vuelve a RES-04', async () => {
    getReservationMock.mockResolvedValueOnce(pending()).mockResolvedValueOnce(buildReservation({ status: 'DRAFT' }));
    resolveMock.mockResolvedValue(buildReservation({ status: 'DRAFT' }));
    render();
    const acceptButton = await screen.findByRole('button', { name: 'Aceptar alternativa' });
    // El botón nace deshabilitado hasta que carga la lista de alternativas.
    await waitFor(() => expect(acceptButton).toBeEnabled());
    fireEvent.click(acceptButton);
    expect(await screen.findByText('RES-04')).toBeInTheDocument();
    expect(resolveMock).toHaveBeenCalledWith('tok', 'res-1', 'c1', 'b1', 3, 'ACCEPT_ALTERNATIVE', { alternativeVehicleId: 'v-2', note: undefined });
  });

  it('PENDING: rechazar pide confirmación y muestra reembolso pendiente de transferencia', async () => {
    const cancelled = buildReservation({
      status: 'CANCELLED',
      saleResolution: { ...baseResolution, status: 'REJECTED', refundStatus: 'PENDING_TRANSFER' },
    });
    getReservationMock.mockResolvedValueOnce(pending()).mockResolvedValueOnce(cancelled);
    resolveMock.mockResolvedValue(cancelled);
    render();
    fireEvent.click(await screen.findByRole('button', { name: 'El cliente rechaza' }));
    expect(resolveMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación con reembolso' }));
    expect(await screen.findByText(/Reembolso pendiente de transferencia/)).toBeInTheDocument();
    expect(resolveMock).toHaveBeenCalledWith('tok', 'res-1', 'c1', 'b1', 3, 'REJECT', { note: undefined });
  });

  it('422 ALTERNATIVE_VEHICLE_REQUIRED muestra mensaje en español', async () => {
    getReservationMock.mockResolvedValue(pending({ saleResolution: { ...baseResolution, offeredVehicle: null } }));
    resolveMock.mockRejectedValue(new ReservationCommandError(422, { code: 'ALTERNATIVE_VEHICLE_REQUIRED' }));
    render();
    fireEvent.click(await screen.findByLabelText(/ABC-111/));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar alternativa' }));
    expect(await screen.findByText(/Elige un vehículo alternativo/)).toBeInTheDocument();
  });

  it('PENDING sin RESOLVE_SALE solo informa', async () => {
    canMock.mockReturnValue(false);
    getReservationMock.mockResolvedValue(pending());
    render();
    expect(await screen.findByText(/Solo Gerencia o Administración pueden resolver/)).toBeInTheDocument();
  });

  it('estado no aplicable (DRAFT) muestra aviso', async () => {
    getReservationMock.mockResolvedValue(buildReservation({ status: 'DRAFT' }));
    render();
    expect(await screen.findByText(/no admite el registro ni la resolución/)).toBeInTheDocument();
  });
});
