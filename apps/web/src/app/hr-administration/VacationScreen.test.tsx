import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VacationScreen } from './VacationScreen';
import { HrApiError, HrCommandError } from './hr-client';
import { VACATION_CONFLICT_MESSAGE } from './hr-errors';
import { baseContext, makeDetail, makeVacation } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getEmployeeMock = vi.fn();
const getVacationsMock = vi.fn();
const calendarMock = vi.fn();
const scheduleMock = vi.fn();
const rescheduleMock = vi.fn();
const cancelMock = vi.fn();

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./hr-client', async () => {
  const actual = await vi.importActual<typeof import('./hr-client')>('./hr-client');
  return {
    ...actual,
    getEmployee: (...a: unknown[]) => getEmployeeMock(...a),
    getEmployeeVacations: (...a: unknown[]) => getVacationsMock(...a),
    getVacationsCalendar: (...a: unknown[]) => calendarMock(...a),
    scheduleVacation: (...a: unknown[]) => scheduleMock(...a),
    rescheduleVacation: (...a: unknown[]) => rescheduleMock(...a),
    cancelVacation: (...a: unknown[]) => cancelMock(...a),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/emp-1/vacaciones', state: baseContext }]}>
      <Routes>
        <Route path="/personal/:id/vacaciones" element={<VacationScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

function pick(start: string, end: string) {
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: start } });
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: end } });
}

describe('VacationScreen (ADP-05)', () => {
  beforeEach(() => {
    getEmployeeMock.mockReset().mockResolvedValue(makeDetail());
    getVacationsMock.mockReset().mockResolvedValue([]);
    calendarMock.mockReset().mockResolvedValue([makeVacation()]);
    scheduleMock.mockReset();
    rescheduleMock.mockReset().mockResolvedValue(makeVacation());
    cancelMock.mockReset().mockResolvedValue(makeVacation());
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES', 'HR_ADMINISTRATION.SCHEDULE_VACATION']);
  });

  it('foco inicial en el campo de fecha y sin calendario completo visible', async () => {
    renderScreen();
    const from = await screen.findByLabelText('Desde');
    await waitFor(() => expect(from).toHaveFocus());
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('Rosa Díaz')).not.toBeInTheDocument();
  });

  it('valida el conflicto ANTES de enviar y muestra solo el conflicto puntual con el mensaje de la doc', async () => {
    renderScreen();
    await screen.findByLabelText('Desde');
    pick('2026-11-12', '2026-11-20');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(VACATION_CONFLICT_MESSAGE);
    expect(alert).toHaveTextContent('fechas ocupadas');
    expect(screen.queryByText('Rosa Díaz')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar' })).toBeDisabled();
    expect(calendarMock).toHaveBeenCalledWith('tok', { companyId: 'c1', branchId: 'b1' }, 'OPERACIONES', 2026, expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar' }));
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('sin superposicion permite solicitar', async () => {
    scheduleMock.mockResolvedValue(makeVacation({ employeeId: 'emp-1' }));
    renderScreen();
    await screen.findByLabelText('Desde');
    pick('2026-12-01', '2026-12-10');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Solicitar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar' }));
    await waitFor(() => expect(scheduleMock).toHaveBeenCalledWith('tok', 'emp-1', { startDate: '2026-12-01', endDate: '2026-12-10' }));
    expect(await screen.findByText('Vacaciones programadas.')).toBeInTheDocument();
  });

  it('las vacaciones canceladas y las propias no cuentan como conflicto', async () => {
    calendarMock.mockResolvedValue([
      makeVacation({ status: 'CANCELADA' }),
      makeVacation({ id: 'v2', employeeId: 'emp-1', startDate: '2026-11-12', endDate: '2026-11-20' }),
    ]);
    renderScreen();
    await screen.findByLabelText('Desde');
    pick('2026-11-12', '2026-11-14');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Solicitar' })).toBeEnabled());
    expect(screen.queryByText(VACATION_CONFLICT_MESSAGE, { exact: false })).not.toBeInTheDocument();
  });

  it('si el servidor responde conflicto al enviar (carrera) muestra el mismo mensaje', async () => {
    calendarMock.mockResolvedValue([]);
    scheduleMock.mockRejectedValue(new HrCommandError(409, { code: 'VACATION_OVERLAP' }));
    renderScreen();
    await screen.findByLabelText('Desde');
    pick('2026-12-01', '2026-12-10');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Solicitar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(VACATION_CONFLICT_MESSAGE);
  });

  it('si el calendario no se puede consultar, el servidor decide al enviar', async () => {
    calendarMock.mockRejectedValue(new HrApiError(403));
    renderScreen();
    await screen.findByLabelText('Desde');
    pick('2026-12-01', '2026-12-10');
    expect(await screen.findByText(/No pudimos verificar la disponibilidad/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar' })).toBeEnabled();
  });

  it('valida el rango de fechas', async () => {
    renderScreen();
    await screen.findByLabelText('Desde');
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar' }));
    expect(await screen.findByText('Indica desde cuándo.')).toBeInTheDocument();
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('sin SCHEDULE_VACATION no hay formulario', async () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    renderScreen();
    expect(await screen.findByText('No tienes permiso para solicitar vacaciones.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar' })).not.toBeInTheDocument();
  });

  describe('reprogramar y cancelar (22-oct #10)', () => {
    const own = () => makeVacation({ id: 'vac-own', employeeId: 'emp-1', employeeName: 'Yo', startDate: '2026-11-12', endDate: '2026-11-14' });

    it('ante el conflicto ofrece elegir otra fecha libre: los dias ocupados salen con texto y no se pueden elegir', async () => {
      renderScreen();
      await screen.findByLabelText('Desde');
      pick('2026-11-12', '2026-11-20');
      fireEvent.click(await screen.findByRole('button', { name: 'Elegir otra fecha libre' }));
      const busy = await screen.findByRole('button', { name: /12 de .*: ocupado/ });
      expect(busy).toBeDisabled();
      expect(busy).toHaveTextContent('Ocupado');
      expect(screen.queryByText('Rosa Díaz')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Proponer el primer rango libre' }));
      await waitFor(() => expect(screen.getByLabelText('Desde')).not.toHaveValue('2026-11-12'));
    });

    it('reprograma a otra fecha con motivo', async () => {
      getVacationsMock.mockResolvedValue([own()]);
      renderScreen();
      fireEvent.click(await screen.findByRole('button', { name: 'Reprogramar' }));
      await screen.findAllByRole("button", { name: /2[3-9] de .*: libre/ });
      fireEvent.change(screen.getByLabelText('Nueva fecha de inicio'), { target: { value: '2026-11-20' } });
      fireEvent.change(screen.getByLabelText('Nueva fecha final'), { target: { value: '2026-11-22' } });
      fireEvent.click(screen.getByRole('button', { name: 'Reprogramar', hidden: false, description: undefined }));
      expect(await screen.findByText(/al menos 3 caracteres/)).toBeInTheDocument();
      expect(rescheduleMock).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText('Motivo (obligatorio)'), { target: { value: 'Cruce con otra persona' } });
      fireEvent.click(screen.getAllByRole('button', { name: 'Reprogramar' }).at(-1)!);
      await waitFor(() =>
        expect(rescheduleMock).toHaveBeenCalledWith('tok', 'vac-own', { startDate: '2026-11-20', endDate: '2026-11-22', reason: 'Cruce con otra persona' }),
      );
    });

    it('muestra el 409 VACATION_OVERLAP del servidor dentro del dialogo', async () => {
      getVacationsMock.mockResolvedValue([own()]);
      rescheduleMock.mockRejectedValue(new HrCommandError(409, { code: 'VACATION_OVERLAP' } as never));
      renderScreen();
      fireEvent.click(await screen.findByRole('button', { name: 'Reprogramar' }));
      fireEvent.change(screen.getByLabelText('Nueva fecha de inicio'), { target: { value: '2026-12-20' } });
      fireEvent.change(screen.getByLabelText('Nueva fecha final'), { target: { value: '2026-12-22' } });
      fireEvent.change(screen.getByLabelText('Motivo (obligatorio)'), { target: { value: 'Cambio de plan' } });
      fireEvent.click(screen.getAllByRole('button', { name: 'Reprogramar' }).at(-1)!);
      expect(await screen.findByText(VACATION_CONFLICT_MESSAGE)).toBeInTheDocument();
    });

    it('cancela con motivo obligatorio', async () => {
      getVacationsMock.mockResolvedValue([own()]);
      renderScreen();
      fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar vacaciones' }));
      expect(await screen.findByText(/al menos 3 caracteres/)).toBeInTheDocument();
      expect(cancelMock).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText('Motivo (obligatorio)'), { target: { value: 'Ya no viajo' } });
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar vacaciones' }));
      await waitFor(() => expect(cancelMock).toHaveBeenCalledWith('tok', 'vac-own', { reason: 'Ya no viajo' }));
    });

    it('muestra los estados REPROGRAMADA y CANCELADA con fechas originales y motivo, sin acciones para las canceladas', async () => {
      getVacationsMock.mockResolvedValue([
        makeVacation({ id: 'a', employeeId: 'emp-1', status: 'REPROGRAMADA', startDate: '2026-12-01', endDate: '2026-12-05', originalStartDate: '2026-11-01', originalEndDate: '2026-11-05', statusReason: 'Cruce' }),
        makeVacation({ id: 'b', employeeId: 'emp-1', status: 'CANCELADA', startDate: '2027-01-01', endDate: '2027-01-05', statusReason: 'Ya no viajo' }),
      ]);
      renderScreen();
      expect(await screen.findByTestId('vacation-rescheduled-note')).toHaveTextContent('motivo: Cruce');
      expect(screen.getByTestId('vacation-cancelled-note')).toHaveTextContent('Ya no viajo');
      expect(screen.getAllByRole('button', { name: 'Reprogramar' })).toHaveLength(1);
    });
  });
});
