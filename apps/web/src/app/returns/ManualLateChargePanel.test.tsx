import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualLateChargePanel } from './ManualLateChargePanel';
import { baseContext, makeReturn } from './test-utils';
import { ReturnCommandError } from './returns-client';
import { setPermissions } from '../../test/permissions';

const registerMock = vi.fn();
vi.mock('./returns-client', async () => {
  const actual = await vi.importActual<typeof import('./returns-client')>('./returns-client');
  return { ...actual, registerReturnLateCharge: (...args: unknown[]) => registerMock(...args) };
});

const LATE = { lateToleranceMinutes: 30, lateMinutes: 90, isLate: true, basis: 'RECEIVED' as const };

function mount(ret = makeReturn({ lateness: LATE })) {
  const props = {
    ret,
    context: baseContext,
    getIdToken: vi.fn().mockResolvedValue('tok'),
    setRet: vi.fn(),
    reload: vi.fn().mockResolvedValue(undefined),
  };
  render(<ManualLateChargePanel {...props} />);
  return props;
}

describe('ManualLateChargePanel (DEC-DEV-LATE-CHARGE-002)', () => {
  beforeEach(() => {
    registerMock.mockReset();
    setPermissions(['RETURN.READ', 'RETURN.CHARGE_IMMOBILIZATION']);
  });

  it('no aparece si no hay retraso sobre la tolerancia ni cargo registrado', () => {
    mount(makeReturn({ lateness: { ...LATE, isLate: false, lateMinutes: 10 } }));
    expect(screen.queryByTestId('manual-late-charge')).not.toBeInTheDocument();
  });

  it('registra el monto digitado (sin calculo) con la version del expediente', async () => {
    registerMock.mockResolvedValue(makeReturn({ manualLateCharge: { amount: 40, notes: null, registeredById: 'u', registeredAt: '2026-10-04T12:00:00Z' } }));
    const props = mount();
    const button = screen.getByRole('button', { name: 'Registrar cargo por retraso' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Monto del cargo por retraso/), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText(/Observaciones/), { target: { value: 'avisó tarde' } });
    fireEvent.click(button);
    await waitFor(() => expect(registerMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, 40, 'avisó tarde'));
    expect(props.setRet).toHaveBeenCalled();
  });

  it('rechaza montos cero o con mas de 2 decimales', () => {
    mount();
    const button = screen.getByRole('button', { name: 'Registrar cargo por retraso' });
    for (const bad of ['0', '-3', '10.555']) {
      fireEvent.change(screen.getByLabelText(/Monto del cargo por retraso/), { target: { value: bad } });
      expect(button).toBeDisabled();
    }
  });

  it('muestra el cargo ya registrado y permite corregirlo', () => {
    mount(
      makeReturn({
        lateness: LATE,
        manualLateCharge: { amount: 40, notes: 'avisó tarde', registeredById: 'u', registeredAt: '2026-10-04T12:00:00Z' },
      }),
    );
    expect(screen.getByTestId('manual-late-charge-registered')).toHaveTextContent('40.00');
    expect(screen.getByRole('button', { name: 'Corregir cargo por retraso' })).toBeInTheDocument();
  });

  it('sin permiso solo informa; no ofrece el formulario', () => {
    setPermissions(['RETURN.READ']);
    mount();
    expect(screen.getByText(/Pendiente de registro por un usuario autorizado/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Monto del cargo por retraso/)).not.toBeInTheDocument();
  });

  it('error de dominio en lenguaje de negocio y recarga si hay conflicto de version', async () => {
    registerMock.mockRejectedValue(new ReturnCommandError(412, { code: 'RETURN_VERSION_CONFLICT' }));
    const props = mount();
    fireEvent.change(screen.getByLabelText(/Monto del cargo por retraso/), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cargo por retraso' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Otra persona modificó');
    expect(props.reload).toHaveBeenCalled();
  });
});
