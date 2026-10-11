import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonAttendanceScreen } from './PersonAttendanceScreen';
import { HrApiError } from './hr-client';
import { baseContext, makeDetail, makeRecord } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getEmployeeMock = vi.fn();
const getAttendanceMock = vi.fn();
const logAttendanceMock = vi.fn();

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
    getEmployeeAttendance: (...a: unknown[]) => getAttendanceMock(...a),
    logAttendance: (...a: unknown[]) => logAttendanceMock(...a),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/emp-1/asistencia', search: '?mes=2026-09', state: baseContext }]}>
      <Routes>
        <Route path="/personal/:id/asistencia" element={<PersonAttendanceScreen />} />
        <Route path="/personal/:id/asistencia/falta" element={<div>pantalla de falta</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const RECORDS = [
  makeRecord({ id: 'a1', date: '2026-09-01', status: 'PRESENTE' }),
  makeRecord({ id: 'a2', date: '2026-09-02', status: 'TARDANZA', minutesLate: 20, deductionAmount: 3.5 }),
  makeRecord({ id: 'a3', date: '2026-09-03', status: 'FALTA_INJUSTIFICADA', deductionAmount: 50 }),
];

describe('PersonAttendanceScreen (ADP-02)', () => {
  beforeEach(() => {
    getEmployeeMock.mockReset().mockResolvedValue(makeDetail());
    getAttendanceMock.mockReset().mockResolvedValue(RECORDS);
    logAttendanceMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES', 'HR_ADMINISTRATION.LOG_ATTENDANCE']);
  });

  it('el calendario muestra icono y texto: presente, tardanza y falta', async () => {
    renderScreen();
    const table = await screen.findByRole('table', { name: /Asistencia de septiembre de 2026/ });
    expect(within(table).getByText('Presente')).toBeInTheDocument();
    expect(within(table).getByText('Tardanza')).toBeInTheDocument();
    expect(within(table).getByText('Falta injustificada')).toBeInTheDocument();
    expect(getAttendanceMock).toHaveBeenCalledWith('tok', 'emp-1', '2026-09');
  });

  it('no ofrece importar marcaciones (el contrato no lo tiene)', async () => {
    renderScreen();
    await screen.findByRole('table');
    expect(screen.queryByText(/Importar/)).not.toBeInTheDocument();
  });

  it('sin LOG_ATTENDANCE no hay botones de registrar', async () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    renderScreen();
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'Registrar marcación' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar marcación del/ })).not.toBeInTheDocument();
  });

  it('registra una marcacion manual sin enviar monto de descuento', async () => {
    logAttendanceMock.mockResolvedValue(makeRecord({ date: '2026-09-04' }));
    renderScreen();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar marcación del 4' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByLabelText(/descuento|monto/i)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('Tardanza'));
    // La tardanza exige los minutos (el servidor responde 422 si faltan).
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
    expect(await within(dialog).findByText('Indica cuántos minutos llegó tarde.')).toBeInTheDocument();
    expect(logAttendanceMock).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Minutos de tardanza'), { target: { value: '15' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
    await waitFor(() => expect(logAttendanceMock).toHaveBeenCalledTimes(1));
    expect(logAttendanceMock).toHaveBeenCalledWith('tok', 'emp-1', expect.objectContaining({ date: '2026-09-04', status: 'TARDANZA', minutesLate: 15 }));
    expect(logAttendanceMock.mock.calls[0][2]).not.toHaveProperty('deductionAmount');
    expect(await screen.findByText('Marcación registrada.')).toBeInTheDocument();
  });

  it('elegir Falta continua en ADP-03 sin guardar', async () => {
    renderScreen();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar marcación del 4' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/^Falta/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('pantalla de falta')).toBeInTheDocument();
    expect(logAttendanceMock).not.toHaveBeenCalled();
  });

  it('"Ver falta" lleva a la falta registrada', async () => {
    renderScreen();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Ver falta del 3' }));
    expect(await screen.findByText('pantalla de falta')).toBeInTheDocument();
  });

  it('muestra el error de negocio si ya existe la marcacion', async () => {
    const { HrCommandError } = await import('./hr-client');
    logAttendanceMock.mockRejectedValue(new HrCommandError(409, { code: 'ATTENDANCE_ALREADY_LOGGED' }));
    renderScreen();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar marcación del 4' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Ya existe un registro de asistencia/);
  });

  it('estado de carga y error recuperable', async () => {
    getEmployeeMock.mockReset().mockReturnValue(new Promise(() => {}));
    const { unmount } = renderScreen();
    expect(await screen.findByText(/Cargando la asistencia/)).toBeInTheDocument();
    unmount();
    getEmployeeMock.mockReset().mockRejectedValue(new HrApiError(500));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar la asistencia/);
  });
});
