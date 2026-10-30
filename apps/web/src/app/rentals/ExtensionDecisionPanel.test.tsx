import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExtensionDecisionPanel } from './ExtensionDecisionPanel';
import { RentalCommandError } from './rentals-client';
import { clearPermissions, setPermissions } from '../../test/permissions';

const authorizeMock = vi.fn();
const rejectMock = vi.fn();
vi.mock('./rentals-extensions-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-extensions-client')>('./rentals-extensions-client');
  return {
    ...actual,
    authorizeExtension: (...a: unknown[]) => authorizeMock(...a),
    rejectExtension: (...a: unknown[]) => rejectMock(...a),
  };
});

const ctx = { companyId: 'c1', branchId: 'b1' };
const rental = {
  id: 'r1',
  status: 'EXTENSION_PENDING',
  version: 7,
  extensions: [{ id: 'e1', status: 'PENDING', requestedEndAt: '2026-10-25T13:00:00Z', requirements: {} }],
} as unknown as Parameters<typeof ExtensionDecisionPanel>[0]['rental'];

function renderPanel(onDone = vi.fn(), r = rental) {
  render(<ExtensionDecisionPanel rental={r} context={ctx} getIdToken={async () => 'tok'} onDone={onDone} />);
  return onDone;
}

describe('ExtensionDecisionPanel (ALQ-11)', () => {
  beforeEach(() => {
    authorizeMock.mockReset();
    rejectMock.mockReset();
    clearPermissions();
  });

  it('sin permisos de Gerencia solo informa que esta pendiente', () => {
    setPermissions(['RENTAL.READ']);
    renderPanel();
    expect(screen.getByTestId('extension-awaiting-manager')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Autorizar ampliación' })).not.toBeInTheDocument();
  });

  it('no se muestra si el alquiler no esta en EXTENSION_PENDING', () => {
    setPermissions(['RENTAL.AUTHORIZE_EXTENSION']);
    renderPanel(vi.fn(), { ...rental, status: 'ACTIVE' } as typeof rental);
    expect(screen.queryByTestId('extension-decision')).not.toBeInTheDocument();
  });

  it('autorizar exige la adenda y la referencia del pago previo (obligatoria) y envia ambas', async () => {
    setPermissions(['RENTAL.AUTHORIZE_EXTENSION', 'RENTAL.REJECT_EXTENSION']);
    authorizeMock.mockResolvedValue({});
    const onDone = renderPanel();
    const button = screen.getByRole('button', { name: 'Autorizar ampliación' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Referencia de la adenda/), { target: { value: 'ADE-001' } });
    expect(button).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/pago es previo/i);
    const pay = 'OP-889123';
    fireEvent.change(screen.getByLabelText(/Referencia del pago previo/), { target: { value: pay } });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(authorizeMock).toHaveBeenCalledWith('tok', 'r1', 'c1', 'b1', 7, pay, 'ADE-001'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('rechazar llama a reject-extension; muestra el error de dominio si el vehiculo ya no esta disponible', async () => {
    setPermissions(['RENTAL.AUTHORIZE_EXTENSION', 'RENTAL.REJECT_EXTENSION']);
    rejectMock.mockResolvedValue({});
    const onDone = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar ampliación' }));
    await waitFor(() => expect(rejectMock).toHaveBeenCalledWith('tok', 'r1', 'c1', 'b1', 7));
    await waitFor(() => expect(onDone).toHaveBeenCalled());

    authorizeMock.mockRejectedValue(new RentalCommandError(409, { code: 'VEHICLE_UNAVAILABLE_FOR_EXTENSION' }));
    fireEvent.change(screen.getByLabelText(/Referencia de la adenda/), { target: { value: 'ADE-002' } });
    fireEvent.change(screen.getByLabelText(/Referencia del pago previo/), { target: { value: 'OP-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar ampliación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/otro compromiso/);
  });
});
