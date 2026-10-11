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
});
