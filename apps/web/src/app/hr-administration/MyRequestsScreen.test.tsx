import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MyRequestsScreen } from './MyRequestsScreen';
import { baseContext } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getMyEmployeeMock = vi.fn();
const listMyLeavesMock = vi.fn();
const listMyVacationsMock = vi.fn();
const requestMyLeaveMock = vi.fn();
const requestMyVacationMock = vi.fn();

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
    getMyEmployee: (...a: unknown[]) => getMyEmployeeMock(...a),
    listMyLeaves: (...a: unknown[]) => listMyLeavesMock(...a),
    listMyVacations: (...a: unknown[]) => listMyVacationsMock(...a),
    requestMyLeave: (...a: unknown[]) => requestMyLeaveMock(...a),
    requestMyVacation: (...a: unknown[]) => requestMyVacationMock(...a),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/mis-solicitudes', state: baseContext }]}>
      <Routes>
        <Route path="/personal/mis-solicitudes" element={<MyRequestsScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MyRequestsScreen (Self-Service ADP-04/ADP-05)', () => {
  beforeEach(() => {
    getMyEmployeeMock.mockReset().mockResolvedValue({
      id: 'emp-me',
      tenantId: 'company-vr',
      companyId: 'company-vr',
      branchId: 'branch-ayacucho',
      firstName: 'Juan',
      lastName: 'Pérez',
      role: 'ASESOR_COMERCIAL',
    });
    listMyLeavesMock.mockReset().mockResolvedValue([
      {
        id: 'leave-1',
        employeeId: 'emp-me',
        type: 'PERMISO_HORAS',
        date: '2026-11-05',
        reason: 'Cita médica particular',
        status: 'SOLICITADO',
      },
    ]);
    listMyVacationsMock.mockReset().mockResolvedValue([
      {
        id: 'vac-1',
        employeeId: 'emp-me',
        startDate: '2026-12-01',
        endDate: '2026-12-15',
        status: 'SOLICITADA',
        grantedDays: null,
      },
    ]);
    requestMyLeaveMock.mockReset().mockResolvedValue({ id: 'leave-2' });
    requestMyVacationMock.mockReset().mockResolvedValue({ id: 'vac-2' });
    setPermissions([]);
  });

  it('renders tabs and displays leaves history', async () => {
    renderScreen();
    expect(await screen.findByRole('heading', { name: 'Mis Solicitudes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Permisos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Vacaciones' })).toBeInTheDocument();

    expect(await screen.findByText('Cita médica particular')).toBeInTheDocument();
    expect(screen.getByText('Solicitado')).toBeInTheDocument();
  });

  it('submits a new leave request', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: 'Mis Solicitudes' });

    const reasonInput = screen.getByLabelText(/Motivo/);
    fireEvent.change(reasonInput, { target: { value: 'Trámite personal bancario' } });

    const submitBtn = screen.getByRole('button', { name: 'Solicitar permiso' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(requestMyLeaveMock).toHaveBeenCalledWith(
        'tok',
        expect.anything(),
        expect.objectContaining({
          reason: 'Trámite personal bancario',
          type: 'PERMISO_HORAS',
        }),
      );
    });

    expect(await screen.findByText(/Permiso solicitado exitosamente/)).toBeInTheDocument();
  });

  it('switches to Vacations tab and submits vacation request', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: 'Mis Solicitudes' });

    fireEvent.click(screen.getByRole('tab', { name: 'Vacaciones' }));

    expect(await screen.findByText('Historial de vacaciones')).toBeInTheDocument();
    expect(screen.getByText('Solicitada')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2027-01-10' } });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2027-01-20' } });

    fireEvent.click(screen.getByRole('button', { name: 'Solicitar vacaciones' }));

    await waitFor(() => {
      expect(requestMyVacationMock).toHaveBeenCalledWith(
        'tok',
        expect.anything(),
        expect.objectContaining({
          startDate: '2027-01-10',
          endDate: '2027-01-20',
        }),
      );
    });

    expect(await screen.findByText(/Vacaciones solicitadas exitosamente/)).toBeInTheDocument();
  });
});
