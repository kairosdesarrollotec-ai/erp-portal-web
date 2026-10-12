import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AttendanceTeamScreen } from './AttendanceTeamScreen';
import { baseContext } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const summaryMock = vi.fn();
const applyMock = vi.fn();

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
    getAttendanceSummary: (...a: unknown[]) => summaryMock(...a),
    applyMonthDeductions: (...a: unknown[]) => applyMock(...a),
  };
});

function summary(month: string) {
  return {
    companyId: 'c1',
    month,
    totalEmployees: 2,
    totalDeductionsAmount: 95,
    items: [
      { employeeId: 'emp-1', employeeName: 'Carlos Pérez', areaName: 'Operaciones', totalLates: 1, totalUnjustified: 1, calculatedDeduction: 45, isApplied: false },
      { employeeId: 'emp-2', employeeName: 'Rosa Díaz', areaName: 'Ventas', totalLates: 0, totalUnjustified: 1, calculatedDeduction: 50, isApplied: false },
    ],
  };
}

function renderScreen(month: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/asistencia', search: `?mes=${month}`, state: baseContext }]}>
      <Routes>
        <Route path="/personal/asistencia" element={<AttendanceTeamScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AttendanceTeamScreen (ADP-02 resumen)', () => {
  beforeEach(() => {
    summaryMock.mockReset();
    applyMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES', 'HR_ADMINISTRATION.MANAGE_EMPLOYEES']);
  });

  it('lista tardanzas, faltas y el descuento calculado por persona', async () => {
    summaryMock.mockImplementation((_t: string, _s: unknown, month: string) => Promise.resolve(summary(month)));
    renderScreen('2026-09');
    const table = await screen.findByRole('table', { name: /Resumen de asistencia/ });
    expect(within(table).getByText('Carlos Pérez')).toBeInTheDocument();
    expect(within(table).getByText('S/ 45.00')).toBeInTheDocument();
    expect(summaryMock).toHaveBeenCalledWith('tok', { companyId: 'c1', branchId: 'b1' }, '2026-09');
  });

  it('antes de cerrar el mes no se puede aplicar el descuento (BR-ADP-001)', async () => {
    summaryMock.mockImplementation((_t: string, _s: unknown, month: string) => Promise.resolve(summary(month)));
    renderScreen('2099-01');
    const button = await screen.findByRole('button', { name: 'Aplicar descuentos de fin de mes' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/Los descuentos se aplican al cerrar el mes/)).toBeInTheDocument();
  });

  it('al cerrar el mes confirma con el monto exacto y aplica', async () => {
    summaryMock.mockImplementation((_t: string, _s: unknown, month: string) => Promise.resolve(summary(month)));
    applyMock.mockResolvedValue({ month: '2026-09', affectedEmployeesCount: 2, totalDeductionsApplied: 95 });
    renderScreen('2026-09');
    fireEvent.click(await screen.findByRole('button', { name: 'Aplicar descuentos de fin de mes' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Monto exacto a descontar: S/ 95.00')).toBeInTheDocument();
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar descuento de S/ 95.00' });
    expect(confirm).toBeDisabled();
    fireEvent.click(within(dialog).getByLabelText(/confirmo que es correcto/));
    fireEvent.click(confirm);
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith('tok', { companyId: 'c1', branchId: 'b1' }, '2026-09', ['emp-1', 'emp-2']));
    expect(await screen.findByText(/Descuentos aplicados: S\/ 95.00 a 2 persona/)).toBeInTheDocument();
  });

  it('sin MANAGE_EMPLOYEES no hay boton de aplicar', async () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    summaryMock.mockResolvedValue(summary('2026-09'));
    renderScreen('2026-09');
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'Aplicar descuentos de fin de mes' })).not.toBeInTheDocument();
  });

  it('quien solo registra asistencia (LOG_ATTENDANCE) tambien ve el resumen', async () => {
    setPermissions(['HR_ADMINISTRATION.LOG_ATTENDANCE']);
    summaryMock.mockResolvedValue(summary('2026-09'));
    renderScreen('2026-09');
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('sin VIEW_EMPLOYEES ni LOG_ATTENDANCE: acceso denegado', () => {
    setPermissions([]);
    renderScreen('2026-09');
    expect(screen.getByText(/No tienes acceso/)).toBeInTheDocument();
  });

  it('estado vacio', async () => {
    summaryMock.mockResolvedValue({ ...summary('2026-09'), items: [], totalDeductionsAmount: 0 });
    renderScreen('2026-09');
    expect(await screen.findByText(/No hay tardanzas ni faltas injustificadas con descuento/)).toBeInTheDocument();
  });
});
