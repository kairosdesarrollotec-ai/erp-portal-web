import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AbsenceScreen } from './AbsenceScreen';
import { HrCommandError } from './hr-client';
import { baseContext, makeDetail, makeRecord } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getEmployeeMock = vi.fn();
const getAttendanceMock = vi.fn();
const summaryMock = vi.fn();
const logMock = vi.fn();
const applyMock = vi.fn();
const reclassifyMock = vi.fn();

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
    reclassifyAttendance: (...a: unknown[]) => reclassifyMock(...a),
    getEmployee: (...a: unknown[]) => getEmployeeMock(...a),
    getEmployeeAttendance: (...a: unknown[]) => getAttendanceMock(...a),
    getAttendanceSummary: (...a: unknown[]) => summaryMock(...a),
    logAttendance: (...a: unknown[]) => logMock(...a),
    applyMonthDeductions: (...a: unknown[]) => applyMock(...a),
  };
});

const item = { employeeId: 'emp-1', employeeName: 'Carlos Pérez', areaName: 'Operaciones', totalLates: 0, totalUnjustified: 1, calculatedDeduction: 45, isApplied: false };

function renderScreen(date: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/emp-1/asistencia/falta', search: `?fecha=${date}`, state: baseContext }]}>
      <Routes>
        <Route path="/personal/:id/asistencia/falta" element={<AbsenceScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AbsenceScreen (ADP-03)', () => {
  beforeEach(() => {
    getEmployeeMock.mockReset().mockResolvedValue(makeDetail());
    getAttendanceMock.mockReset().mockResolvedValue([]);
    summaryMock.mockReset().mockResolvedValue({ companyId: 'c1', month: '2026-09', totalEmployees: 1, totalDeductionsAmount: 45, items: [item] });
    logMock.mockReset();
    applyMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES', 'HR_ADMINISTRATION.LOG_ATTENDANCE', 'HR_ADMINISTRATION.MANAGE_EMPLOYEES']);
  });

  it('el foco inicial esta en el campo de justificacion', async () => {
    renderScreen('2026-09-06');
    const field = await screen.findByLabelText(/^Justificación/);
    await waitFor(() => expect(field).toHaveFocus());
  });

  it('el monto del descuento no es editable: no hay campo de monto', async () => {
    renderScreen('2026-09-06');
    await screen.findByLabelText(/^Justificación/);
    expect(screen.queryByLabelText(/monto/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.getByTestId('descuento-solo-lectura')).toHaveTextContent(/lo calcula el sistema|calculado por el sistema/);
  });

  it('exige elegir si se justifica y la justificacion cuando es justificada', async () => {
    renderScreen('2026-09-06');
    await screen.findByLabelText(/^Justificación/);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Elige si la falta se justifica o no.')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/^Justificada/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText(/Escribe la justificación/)).toBeInTheDocument();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('registra la falta injustificada sin enviar monto', async () => {
    logMock.mockResolvedValue(makeRecord({ date: '2026-09-06', status: 'FALTA_INJUSTIFICADA', deductionAmount: 50 }));
    renderScreen('2026-09-06');
    await screen.findByLabelText(/^Justificación/);
    fireEvent.click(screen.getByLabelText(/^Injustificada/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(logMock).toHaveBeenCalledTimes(1));
    expect(logMock).toHaveBeenCalledWith('tok', 'emp-1', expect.objectContaining({ date: '2026-09-06', status: 'FALTA_INJUSTIFICADA' }));
    expect(logMock.mock.calls[0][2]).not.toHaveProperty('deductionAmount');
    expect(await screen.findByText(/Falta injustificada registrada/)).toBeInTheDocument();
  });

  it('avisa la reincidencia: 2ª falta del mes', async () => {
    getAttendanceMock.mockResolvedValue([makeRecord({ date: '2026-09-02', status: 'FALTA_INJUSTIFICADA' })]);
    renderScreen('2026-09-06');
    expect(await screen.findByText(/Esta es la 2ª falta del mes/)).toBeInTheDocument();
  });

  it('muestra el descuento de una falta ya registrada de solo lectura, a fin de mes', async () => {
    getAttendanceMock.mockResolvedValue([makeRecord({ date: '2026-09-06', status: 'FALTA_INJUSTIFICADA', deductionAmount: 45 })]);
    renderScreen('2026-09-06');
    expect(await screen.findByText(/Se descuenta S\/ 45.00 de la quincena, aplicado en el pago de fin de mes/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
  });

  it('aplicar descuento pide confirmacion con el monto exacto (mes cerrado)', async () => {
    applyMock.mockResolvedValue({ month: '2026-09', affectedEmployeesCount: 1, totalDeductionsApplied: 45 });
    renderScreen('2026-09-06');
    fireEvent.click(await screen.findByRole('button', { name: 'Aplicar descuento' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Monto exacto a descontar: S/ 45.00')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText(/confirmo que es correcto/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar descuento de S/ 45.00' }));
    await waitFor(() => expect(applyMock).toHaveBeenCalledWith('tok', { companyId: 'c1', branchId: 'b1' }, '2026-09', ['emp-1']));
  });

  it('con el mes abierto el descuento no se puede aplicar todavia', async () => {
    summaryMock.mockResolvedValue({ companyId: 'c1', month: '2099-01', totalEmployees: 1, totalDeductionsAmount: 45, items: [item] });
    renderScreen('2099-01-06');
    const button = await screen.findByRole('button', { name: 'Aplicar descuento' });
    expect(button).toBeDisabled();
  });

  it('sin LOG_ATTENDANCE ni MANAGE_EMPLOYEES no hay formulario ni aplicar', async () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    renderScreen('2026-09-06');
    await screen.findByText(/Historial de faltas/);
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aplicar descuento' })).not.toBeInTheDocument();
  });

  describe('reclasificar una falta ya registrada', () => {
    const recorded = (over = {}) => makeRecord({ id: 'att-9', date: '2026-09-06', status: 'FALTA_INJUSTIFICADA', deductionAmount: 45, ...over });

    it('una falta injustificada se puede justificar con su justificacion', async () => {
      getAttendanceMock.mockResolvedValue([recorded()]);
      reclassifyMock.mockResolvedValue(recorded({ status: 'FALTA_JUSTIFICADA', deductionAmount: 0, justification: 'Certificado médico' }));
      renderScreen('2026-09-06');
      fireEvent.click(await screen.findByRole('button', { name: 'Justificar esta falta' }));
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambio' }));
      expect(await screen.findByText(/Escribe la justificación \(al menos 5 caracteres\)/)).toBeInTheDocument();
      expect(reclassifyMock).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText('Justificación de la falta'), { target: { value: 'Certificado médico' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambio' }));
      await waitFor(() => expect(reclassifyMock).toHaveBeenCalledWith('tok', 'att-9', 'FALTA_JUSTIFICADA', 'Certificado médico'));
      expect(await screen.findByText(/ya no genera descuento/)).toBeInTheDocument();
    });

    it('una falta justificada se puede dejar injustificada y avisa el memo generado por el sistema', async () => {
      getAttendanceMock.mockResolvedValue([recorded({ status: 'FALTA_JUSTIFICADA', deductionAmount: 0 })]);
      reclassifyMock.mockResolvedValue({ ...recorded(), memo: { id: 'm1', reason: 'Segunda falta injustificada del mes' } });
      renderScreen('2026-09-06');
      fireEvent.click(await screen.findByRole('button', { name: 'Marcar como injustificada' }));
      fireEvent.change(screen.getByLabelText('Motivo para dejarla injustificada'), { target: { value: 'No presentó sustento' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambio' }));
      await waitFor(() => expect(reclassifyMock).toHaveBeenCalledWith('tok', 'att-9', 'FALTA_INJUSTIFICADA', 'No presentó sustento'));
      expect(await screen.findByText(/Memo de advertencia generado automáticamente: Segunda falta/)).toBeInTheDocument();
    });

    it('si el descuento ya se aplico no se puede reclasificar', async () => {
      getAttendanceMock.mockResolvedValue([recorded({ isDeductionApplied: true })]);
      renderScreen('2026-09-06');
      expect(await screen.findByText(/ya no se puede cambiar/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Justificar esta falta' })).not.toBeInTheDocument();
    });

    it('sin LOG_ATTENDANCE no se ofrece reclasificar', async () => {
      setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
      getAttendanceMock.mockResolvedValue([recorded()]);
      renderScreen('2026-09-06');
      await screen.findByText(/Resultado: Falta injustificada/);
      expect(screen.queryByRole('button', { name: 'Justificar esta falta' })).not.toBeInTheDocument();
    });

    it('un conflicto (descuento liquidado mientras tanto) se explica en lenguaje de negocio', async () => {
      getAttendanceMock.mockResolvedValue([recorded()]);
      reclassifyMock.mockRejectedValue(new HrCommandError(409, { code: 'ATTENDANCE_NOT_RECLASSIFIABLE' }));
      renderScreen('2026-09-06');
      fireEvent.click(await screen.findByRole('button', { name: 'Justificar esta falta' }));
      fireEvent.change(screen.getByLabelText('Justificación de la falta'), { target: { value: 'Certificado médico' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambio' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/ya no se puede reclasificar/);
    });
  });
});
