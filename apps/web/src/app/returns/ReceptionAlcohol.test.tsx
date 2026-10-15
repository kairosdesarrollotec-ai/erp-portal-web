import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReceptionScreen } from './ReceptionScreen';
import { AlcoholTestScreen } from './AlcoholTestScreen';
import { baseContext, makeFlow, makeReturn, problem } from './test-utils';
import { ReturnCommandError } from './returns-client';
import { useWorkSession } from '../shared/useWorkSession';
import { roleRef, setPermissions } from '../../test/permissions';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));

const RETURN_RECEPTION = [
  'RETURN.READ', 'RETURN.RECEIVE_PROVISIONAL',
  'RETURN.REGISTER_ALCOHOL_TEST', 'RETURN.RESOLVE_ALCOHOL_ESCALATION',
] as const;

const getRentalMock = vi.fn();
const receiveProvisionalMock = vi.fn();
const registerAlcoholMock = vi.fn();
const flowMock = vi.fn();
const resolveEscalationMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./useReturnFlow', () => ({ useReturnFlow: () => flowMock() }));
vi.mock('../rentals/rentals-client', async () => {
  const actual = await vi.importActual<typeof import('../rentals/rentals-client')>('../rentals/rentals-client');
  return { ...actual, getRental: (...args: unknown[]) => getRentalMock(...args) };
});
vi.mock('./returns-client', async () => {
  const actual = await vi.importActual<typeof import('./returns-client')>('./returns-client');
  return {
    ...actual,
    receiveProvisional: (...args: unknown[]) => receiveProvisionalMock(...args),
    registerReturnAlcoholTest: (...args: unknown[]) => registerAlcoholMock(...args),
    resolveAlcoholEscalation: (...args: unknown[]) => resolveEscalationMock(...args),
  };
});

const rental = {
  id: 'rent-1',
  branchId: 'b1',
  status: 'ACTIVE',
  customerName: 'Maria Quispe',
  customerDocNumber: '12345678',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehiclePlate: 'D0Y-704',
  expectedEndAt: '2026-10-06T10:00:00Z',
};

function renderReception() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/devoluciones/recepcion/rent-1', state: baseContext }]}>
      <Routes>
        <Route path="/devoluciones/recepcion/:rentalId" element={<ReceptionScreen />} />
        <Route path="/devoluciones/:id/alcoholimetro" element={<div>pantalla alcoholimetro</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderAlcohol() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/devoluciones/ret-1/alcoholimetro', state: baseContext }]}>
      <Routes>
        <Route path="/devoluciones/:id/alcoholimetro" element={<AlcoholTestScreen />} />
        <Route path="/devoluciones/:id/checklist" element={<div>pantalla checklist</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReceptionScreen (DEV-02)', () => {
  beforeEach(() => {
    getRentalMock.mockReset();
    receiveProvisionalMock.mockReset();
    getRentalMock.mockResolvedValue(rental);
    setPermissions(RETURN_RECEPTION);
  });

  it('hereda cliente y vehiculo del alquiler y deshabilita "Recibir vehículo" hasta completar', async () => {
    renderReception();
    expect(await screen.findByText(/Cliente titular: Maria Quispe/)).toBeInTheDocument();
    expect(screen.getByText(/Toyota Hilux - D0Y-704/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recibir vehículo' })).toBeDisabled();
  });

  it('consulta el alquiler con el contexto de sede', async () => {
    renderReception();
    await screen.findByText(/Cliente titular/);
    expect(getRentalMock).toHaveBeenCalledWith('fake-id-token', 'rent-1', 'c1', 'b1');
  });

  it('un alquiler de otra sede se trata como no disponible', async () => {
    getRentalMock.mockResolvedValue({ ...rental, branchId: 'b-otra' });
    renderReception();
    expect(await screen.findByText(/No pudimos cargar el alquiler a devolver/)).toBeInTheDocument();
  });

  it('recibe el vehiculo (titular presente) y navega al alcolimetro', async () => {
    receiveProvisionalMock.mockResolvedValue(makeReturn({ id: 'ret-77' }));
    renderReception();
    await screen.findByText(/Cliente titular/);

    fireEvent.change(screen.getByLabelText('Kilometraje al recibir'), { target: { value: '15000' } });
    fireEvent.change(screen.getByLabelText('Nivel de combustible'), { target: { value: 'HALF' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recibir vehículo' }));

    await waitFor(() =>
      expect(receiveProvisionalMock).toHaveBeenCalledWith(
        'fake-id-token',
        'c1',
        'b1',
        'rent-1',
        expect.objectContaining({ mileageAtReturn: 15000, fuelLevelAtReturn: 'HALF', customerPresent: true }),
      ),
    );
    expect(await screen.findByText('pantalla alcoholimetro')).toBeInTheDocument();
  });

  it('titular ausente exige nombre, relacion y responsable antes de habilitar la recepcion', async () => {
    receiveProvisionalMock.mockResolvedValue(makeReturn());
    renderReception();
    await screen.findByText(/Cliente titular/);

    fireEvent.change(screen.getByLabelText('Kilometraje al recibir'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Nivel de combustible'), { target: { value: 'FULL' } });
    fireEvent.click(screen.getByLabelText('Otra persona'));
    expect(screen.getByRole('button', { name: 'Recibir vehículo' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nombre de quien devuelve'), { target: { value: 'Pedro Soto' } });
    fireEvent.change(screen.getByLabelText('Relación con el titular'), { target: { value: 'Hermano' } });
    fireEvent.change(screen.getByLabelText('¿Quién asume la responsabilidad?'), { target: { value: 'Pedro Soto' } });
    expect(screen.getByRole('button', { name: 'Recibir vehículo' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Recibir vehículo' }));
    await waitFor(() =>
      expect(receiveProvisionalMock).toHaveBeenCalledWith(
        'fake-id-token',
        'c1',
        'b1',
        'rent-1',
        expect.objectContaining({ customerPresent: false, notes: expect.stringContaining('Pedro Soto') }),
      ),
    );
  });

  it('muestra el error de dominio en lenguaje de negocio', async () => {
    receiveProvisionalMock.mockRejectedValue(
      new ReturnCommandError(409, { code: 'RENTAL_ALREADY_HAS_ACTIVE_RETURN', detail: 'x' }),
    );
    renderReception();
    await screen.findByText(/Cliente titular/);
    fireEvent.change(screen.getByLabelText('Kilometraje al recibir'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Nivel de combustible'), { target: { value: 'FULL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recibir vehículo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ya tiene una devolución en curso');
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    const { container } = renderReception();
    await screen.findByText(/Cliente titular/);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('AlcoholTestScreen (DEV-03)', () => {
  beforeEach(() => {
    registerAlcoholMock.mockReset();
    resolveEscalationMock.mockReset();
    flowMock.mockReset();
    useWorkSession.getState().setRole(null);
    setPermissions(RETURN_RECEPTION);
  });

  it('favorable pasa a INSPECCION y navega al checklist', async () => {
    const setRet = vi.fn();
    flowMock.mockReturnValue(makeFlow({ setRet }));
    registerAlcoholMock.mockResolvedValue(makeReturn({ status: 'INSPECCION', alcoholTestResult: 'FAVORABLE' }));
    renderAlcohol();

    fireEvent.click(screen.getByLabelText('Favorable — puede continuar'));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar al checklist' }));

    await waitFor(() =>
      expect(registerAlcoholMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, 'FAVORABLE', undefined),
    );
    expect(await screen.findByText('pantalla checklist')).toBeInTheDocument();
    expect(setRet).toHaveBeenCalled();
  });

  it('desfavorable muestra el banner de custodia/Gerencia y "Derivar a Gerencia", sin continuar al checklist', async () => {
    flowMock.mockReturnValue(makeFlow());
    registerAlcoholMock.mockResolvedValue(
      makeReturn({ status: 'RECEPCION_PROVISIONAL', alcoholTestResult: 'DESFAVORABLE' }),
    );
    renderAlcohol();

    fireEvent.click(screen.getByLabelText('Desfavorable — no puede continuar normalmente'));
    expect(screen.getByRole('alert')).toHaveTextContent('custodia');
    fireEvent.click(screen.getByRole('button', { name: 'Derivar a Gerencia' }));

    await waitFor(() => expect(registerAlcoholMock).toHaveBeenCalled());
    expect(screen.queryByText('pantalla checklist')).not.toBeInTheDocument();
  });

  it('desfavorable no ofrece "Continuar al checklist" (nunca llega a Resultado) y favorable si', () => {
    flowMock.mockReturnValue(makeFlow());
    renderAlcohol();
    fireEvent.click(screen.getByLabelText('Desfavorable — no puede continuar normalmente'));
    expect(screen.queryByRole('button', { name: 'Continuar al checklist' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Derivar a Gerencia' })).toBeEnabled();
    fireEvent.click(screen.getByLabelText('Favorable — puede continuar'));
    expect(screen.getByRole('button', { name: 'Continuar al checklist' })).toBeEnabled();
  });

  it('un 200 desfavorable no es un error: el expediente queda en custodia y la pantalla pasa a la decision de Gerencia', async () => {
    const setRet = vi.fn();
    flowMock.mockReturnValue(makeFlow({ setRet }));
    registerAlcoholMock.mockResolvedValue(makeReturn({ status: 'RECEPCION_PROVISIONAL', alcoholTestResult: 'RECHAZADO' }));
    renderAlcohol();
    fireEvent.click(screen.getByLabelText('Se negó a realizar la prueba'));
    fireEvent.click(screen.getByRole('button', { name: 'Derivar a Gerencia' }));
    await waitFor(() => expect(setRet).toHaveBeenCalled());
    expect(screen.queryByText(/No pudimos registrar la prueba/)).not.toBeInTheDocument();
  });

  it('un conflicto de version recarga el expediente y avisa en lenguaje de negocio', async () => {
    const reload = vi.fn().mockResolvedValue(undefined);
    flowMock.mockReturnValue(makeFlow({ reload }));
    registerAlcoholMock.mockRejectedValue(new ReturnCommandError(412, { code: 'RETURN_VERSION_CONFLICT' }));
    renderAlcohol();

    fireEvent.click(screen.getByLabelText('Favorable — puede continuar'));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar al checklist' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Otra persona modificó');
    expect(reload).toHaveBeenCalled();
  });

  it('expediente de otra sede / inexistente muestra NOT_FOUND', () => {
    flowMock.mockReturnValue(makeFlow({ state: 'NOT_FOUND', ret: null }));
    renderAlcohol();
    expect(screen.getByText(/No encontramos esta devolución en tu empresa y sede/)).toBeInTheDocument();
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    flowMock.mockReturnValue(makeFlow());
    const { container } = renderAlcohol();
    expect(await axe(container)).toHaveNoViolations();
  });
});

const escalated = (over = {}) =>
  makeReturn({ status: 'RECEPCION_PROVISIONAL', alcoholTestResult: 'DESFAVORABLE', ...over });

describe('AlcoholTestScreen (DEV-03) - decision de Gerencia', () => {
  beforeEach(() => {
    registerAlcoholMock.mockReset();
    resolveEscalationMock.mockReset();
    flowMock.mockReset();
    useWorkSession.getState().setRole(null);
    setPermissions(RETURN_RECEPTION);
  });

  it('quien no es Gerencia ve "Pendiente de decisión de Gerencia" y no ve el formulario ni el boton de decision', () => {
    setPermissions(['RETURN.READ', 'RETURN.REGISTER_ALCOHOL_TEST']); // sin RESOLVE_ALCOHOL_ESCALATION
    useWorkSession.getState().setRole(roleRef('ADMINISTRACION'));
    flowMock.mockReturnValue(makeFlow({ ret: escalated() }));
    renderAlcohol();
    expect(screen.getByRole('status')).toHaveTextContent('Pendiente de decisión de Gerencia');
    expect(screen.queryByLabelText('Marcar cliente como rojo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar decisión de Gerencia' })).not.toBeInTheDocument();
  });

  it('quien no es Gerencia ve tambien la decision previa KEEP_IN_CUSTODY', () => {
    setPermissions(['RETURN.READ', 'RETURN.REGISTER_ALCOHOL_TEST']); // sin RESOLVE_ALCOHOL_ESCALATION
    useWorkSession.getState().setRole(roleRef('CAMPO'));
    flowMock.mockReturnValue(
      makeFlow({
        ret: escalated({
          alcoholEscalation: {
            decision: 'KEEP_IN_CUSTODY',
            markCustomerRed: true,
            notes: 'Esperar segunda prueba',
            decidedById: 'uid-g',
            decidedAt: '2026-10-05T12:00:00Z',
          },
        }),
      }),
    );
    renderAlcohol();
    expect(screen.getByText(/Decisión previa: Mantener el vehículo en custodia/)).toBeInTheDocument();
    expect(screen.getByText(/Esperar segunda prueba/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Pendiente de decisión de Gerencia');
  });

  it('Gerencia ve el formulario: casilla de cliente rojo sugerida activada, notas obligatorias (min 5) y confirmacion reforzada', async () => {
    useWorkSession.getState().setRole(roleRef('GERENCIA'));
    const setRet = vi.fn();
    flowMock.mockReturnValue(makeFlow({ ret: escalated(), setRet }));
    resolveEscalationMock.mockResolvedValue(
      escalated({
        alcoholEscalation: { decision: 'KEEP_IN_CUSTODY', markCustomerRed: true, notes: 'Cliente se negó', decidedById: 'u', decidedAt: '2026-10-05T12:00:00Z' },
      }),
    );
    renderAlcohol();

    expect(screen.queryByText('Pendiente de decisión de Gerencia')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Marcar cliente como rojo')).toBeChecked();
    const submit = screen.getByRole('button', { name: 'Registrar decisión de Gerencia' });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Mantener el vehículo en custodia de VeloxRent'));
    fireEvent.change(screen.getByLabelText(/Motivo de la decisión/), { target: { value: 'abc' } });
    expect(submit).toBeDisabled(); // notas < 5
    fireEvent.change(screen.getByLabelText(/Motivo de la decisión/), { target: { value: 'Cliente se negó' } });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('será marcado en rojo');
    expect(resolveEscalationMock).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar decisión' }));

    await waitFor(() =>
      expect(resolveEscalationMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, {
        decision: 'KEEP_IN_CUSTODY',
        markCustomerRed: true,
        notes: 'Cliente se negó',
      }),
    );
    expect(setRet).toHaveBeenCalled();
    expect(screen.queryByText('pantalla checklist')).not.toBeInTheDocument();
  });

  it('CONTINUE_TO_INSPECTION (sin marcar rojo) pasa a INSPECCION y lleva al checklist', async () => {
    useWorkSession.getState().setRole(roleRef('GERENCIA'));
    flowMock.mockReturnValue(makeFlow({ ret: escalated() }));
    resolveEscalationMock.mockResolvedValue(makeReturn({ status: 'INSPECCION', alcoholTestResult: 'DESFAVORABLE' }));
    renderAlcohol();

    fireEvent.click(screen.getByLabelText('Continuar a la inspección'));
    fireEvent.click(screen.getByLabelText('Marcar cliente como rojo'));
    fireEvent.change(screen.getByLabelText(/Motivo de la decisión/), { target: { value: 'Segunda prueba favorable' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión de Gerencia' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar decisión' }));

    await waitFor(() =>
      expect(resolveEscalationMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, {
        decision: 'CONTINUE_TO_INSPECTION',
        markCustomerRed: false,
        notes: 'Segunda prueba favorable',
      }),
    );
    expect(await screen.findByText('pantalla checklist')).toBeInTheDocument();
  });

  it('un 412 en la decision recarga el expediente y avisa en lenguaje de negocio', async () => {
    useWorkSession.getState().setRole(roleRef('GERENCIA'));
    const reload = vi.fn().mockResolvedValue(undefined);
    flowMock.mockReturnValue(makeFlow({ ret: escalated(), reload }));
    resolveEscalationMock.mockRejectedValueOnce(new ReturnCommandError(412, { code: 'RETURN_VERSION_CONFLICT' }));
    renderAlcohol();
    fireEvent.click(screen.getByLabelText('Mantener el vehículo en custodia de VeloxRent'));
    fireEvent.change(screen.getByLabelText(/Motivo de la decisión/), { target: { value: 'Motivo valido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar decisión de Gerencia' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar decisión' }));
    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(screen.getAllByRole('alert').some((a) => /Otra persona modificó/.test(a.textContent ?? ''))).toBe(true);
  });

  it('no tiene violaciones de accesibilidad (axe) en la vista de Gerencia ni en la pendiente', async () => {
    useWorkSession.getState().setRole(roleRef('GERENCIA'));
    flowMock.mockReturnValue(makeFlow({ ret: escalated() }));
    const first = renderAlcohol();
    expect(await axe(first.container)).toHaveNoViolations();
    first.unmount();
    useWorkSession.getState().setRole(roleRef('FRONT_OFFICE'));
    const second = renderAlcohol();
    expect(await axe(second.container)).toHaveNoViolations();
  });
});

void problem;
