import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CancelRentalControl } from './CancelRentalControl';
import { RentalCommandError } from './rentals-client';

const cancelRentalMock = vi.fn();
const canMock = vi.fn();

vi.mock('./rentals-cancel-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-cancel-client')>('./rentals-cancel-client');
  return { ...actual, cancelRental: (...a: unknown[]) => cancelRentalMock(...a) };
});
vi.mock('../shared/usePermissions', () => ({ usePermissions: () => ({ can: canMock }) }));

const ctx = { companyId: 'c1', branchId: 'b1' };
type R = React.ComponentProps<typeof CancelRentalControl>['rental'];
const rental = { id: 'r1', status: 'VALIDATION', version: 3 } as R;

function renderControl(r = rental) {
  return render(
    <MemoryRouter initialEntries={['/alquileres/r1/entrega-02']}>
      <Routes>
        <Route
          path="/alquileres/r1/entrega-02"
          element={<CancelRentalControl rental={r} context={ctx} getIdToken={async () => 'tok'} />}
        />
        <Route path="/alquileres/:id" element={<div>expediente</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CancelRentalControl (DEC-ALQ-CANCEL-001)', () => {
  beforeEach(() => {
    cancelRentalMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
  });

  it('no se muestra sin el permiso RENTAL.CANCEL ni en estados posteriores a la entrega', () => {
    canMock.mockReturnValue(false);
    const { unmount } = renderControl();
    expect(screen.queryByRole('button', { name: 'Cancelar alquiler' })).not.toBeInTheDocument();
    unmount();
    canMock.mockReturnValue(true);
    renderControl({ ...rental, status: 'ACTIVE' } as R);
    expect(screen.queryByRole('button', { name: 'Cancelar alquiler' })).not.toBeInTheDocument();
  });

  it('exige motivo; con "Otro motivo" exige nota de 10 caracteres y envia el comando', async () => {
    cancelRentalMock.mockResolvedValue({ ...rental, status: 'CANCELLED' });
    renderControl();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar alquiler' }));
    const confirm = screen.getByRole('button', { name: 'Confirmar cancelación' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Motivo de la cancelación/), { target: { value: 'OTHER' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: 'corta' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: 'El cliente desistió por viaje' } });
    expect(confirm).not.toBeDisabled();

    fireEvent.click(confirm);
    await waitFor(() =>
      expect(cancelRentalMock).toHaveBeenCalledWith('tok', 'r1', 'c1', 'b1', 3, 'OTHER', 'El cliente desistió por viaje'),
    );
    expect(await screen.findByText('expediente')).toBeInTheDocument();
  });

  it('con "Documentos inválidos" no pide nota y muestra el error del back si la transición no es válida', async () => {
    cancelRentalMock.mockRejectedValue(new RentalCommandError(409, { code: 'INVALID_RENTAL_STATE_TRANSITION' }));
    renderControl();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar alquiler' }));
    fireEvent.change(screen.getByLabelText(/Motivo de la cancelación/), { target: { value: 'DOCUMENTS_INVALID' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ya no está en una etapa/);
    expect(cancelRentalMock).toHaveBeenCalledWith('tok', 'r1', 'c1', 'b1', 3, 'DOCUMENTS_INVALID', '');
  });
});
