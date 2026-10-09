import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LeavesScreen } from './LeavesScreen';
import { HrCommandError } from './hr-client';
import { baseContext, makeDetail, makeLeave } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getEmployeeMock = vi.fn();
const getLeavesMock = vi.fn();
const requestMock = vi.fn();
const resolveMock = vi.fn();

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
    getEmployeeLeaves: (...a: unknown[]) => getLeavesMock(...a),
    requestLeave: (...a: unknown[]) => requestMock(...a),
    resolveLeave: (...a: unknown[]) => resolveMock(...a),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/emp-1/permisos', state: baseContext }]}>
      <Routes>
        <Route path="/personal/:id/permisos" element={<LeavesScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LeavesScreen (ADP-04)', () => {
  beforeEach(() => {
    getEmployeeMock.mockReset().mockResolvedValue(makeDetail());
    getLeavesMock.mockReset().mockResolvedValue([makeLeave()]);
    requestMock.mockReset();
    resolveMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
  });

  it('quien no tiene AUTHORIZE_LEAVE ve la solicitud de solo lectura (sin Aprobar ni Denegar)', async () => {
    renderScreen();
    expect(await screen.findByText(/Motivo: Trámite personal/)).toBeInTheDocument();
    expect(screen.getByText('Solicitado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Denegar/ })).not.toBeInTheDocument();
  });

  it('quien tiene AUTHORIZE_LEAVE aprueba y deniega', async () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES', 'HR_ADMINISTRATION.AUTHORIZE_LEAVE']);
    resolveMock.mockResolvedValue(makeLeave({ status: 'AUTORIZADO' }));
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Aprobar permiso/ }));
    await waitFor(() => expect(resolveMock).toHaveBeenCalledWith('tok', 'leave-1', 'AUTORIZADO'));
    expect(await screen.findByText('Permiso aprobado.')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /Denegar permiso/ }));
    await waitFor(() => expect(resolveMock).toHaveBeenLastCalledWith('tok', 'leave-1', 'DENEGADO'));
  });

  it('un permiso ya resuelto no ofrece botones aunque se tenga permiso', async () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES', 'HR_ADMINISTRATION.AUTHORIZE_LEAVE']);
    getLeavesMock.mockResolvedValue([makeLeave({ status: 'DENEGADO', authorizedByName: 'Fiorella' })]);
    renderScreen();
    expect(await screen.findByText('Denegado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aprobar/ })).not.toBeInTheDocument();
  });

  it('muestra el error cuando el permiso ya fue resuelto por otra persona', async () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES', 'HR_ADMINISTRATION.AUTHORIZE_LEAVE']);
    resolveMock.mockRejectedValue(new HrCommandError(409, { code: 'LEAVE_ALREADY_RESOLVED' }));
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Aprobar permiso/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ya fue resuelto/);
  });

  it('el foco inicial esta en la fecha y la solicitud exige motivo', async () => {
    renderScreen();
    const date = await screen.findByLabelText('Fecha');
    await waitFor(() => expect(date).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar permiso' }));
    expect(await screen.findByText('Cuéntanos el motivo del permiso.')).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('envia la solicitud con tipo, fecha y motivo', async () => {
    requestMock.mockResolvedValue(makeLeave());
    renderScreen();
    await screen.findByLabelText('Fecha');
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-12' } });
    fireEvent.change(screen.getByLabelText('Tipo de permiso'), { target: { value: 'SALIDA_ANTES_DE_HORA' } });
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Cita médica' } });
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar permiso' }));
    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('tok', 'emp-1', expect.objectContaining({ type: 'SALIDA_ANTES_DE_HORA', date: '2026-10-12', reason: 'Cita médica' })),
    );
    expect(await screen.findByText(/Solicitud de permiso registrada/)).toBeInTheDocument();
  });

  it('estado vacio', async () => {
    getLeavesMock.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('Todavía no hay solicitudes de permiso.')).toBeInTheDocument();
  });

  it('sin permisos de lectura no hay formulario de solicitud', async () => {
    setPermissions(['HR_ADMINISTRATION.AUTHORIZE_LEAVE']);
    renderScreen();
    await screen.findByText(/Motivo: Trámite personal/);
    expect(screen.queryByRole('button', { name: 'Solicitar permiso' })).not.toBeInTheDocument();
  });
});
