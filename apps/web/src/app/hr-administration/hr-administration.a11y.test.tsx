import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EmployeesListScreen } from './EmployeesListScreen';
import { FieldTripAuthorizationScreen } from './FieldTripAuthorizationScreen';
import { TerminationScreen } from './TerminationScreen';
import { TrainingScreen } from './TrainingScreen';
import { NewEmployeeScreen } from './NewEmployeeScreen';
import { baseContext, makeDetail, makeEmployee, makeTrip } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const listEmployeesMock = vi.fn();
const getTripMock = vi.fn();
const getEmployeeMock = vi.fn();
const listTrainingsMock = vi.fn();
const listAreasMock = vi.fn().mockResolvedValue([]);

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
    listEmployees: (...a: unknown[]) => listEmployeesMock(...a),
    getFieldTrip: (...a: unknown[]) => getTripMock(...a),
    getEmployee: (...a: unknown[]) => getEmployeeMock(...a),
    listTrainings: (...a: unknown[]) => listTrainingsMock(...a),
    listHrAreas: (...a: unknown[]) => listAreasMock(...a),
  };
});

function renderAt(path: string, element: React.ReactElement, route: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state: baseContext }]}>
      <Routes>
        <Route path={route} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Administración de Personal - accesibilidad (axe)', () => {
  beforeEach(() => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES', 'HR_ADMINISTRATION.AUTHORIZE_FIELD_TRIP', 'HR_ADMINISTRATION.TERMINATE_EMPLOYMENT', 'HR_ADMINISTRATION.REGISTER_TRAINING', 'HR_ADMINISTRATION.MANAGE_EMPLOYEES']);
  });

  it('ADP-01 bandeja sin violaciones', async () => {
    listEmployeesMock.mockResolvedValue({ items: [makeEmployee()], total: 1 });
    const { container } = renderAt('/personal', <EmployeesListScreen />, '/personal');
    await screen.findByRole('table');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ADP-07 autorizacion sin violaciones', async () => {
    getTripMock.mockResolvedValue(makeTrip({ level1TimeoutAt: new Date(Date.now() + 240_000).toISOString() }));
    const { container } = renderAt('/personal/campo/trip-1/autorizacion', <FieldTripAuthorizationScreen />, '/personal/campo/:tripId/autorizacion');
    await screen.findByRole('timer');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ADP-09 formulario y confirmacion sin violaciones', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail());
    const { container } = renderAt('/personal/emp-1/termino', <TerminationScreen />, '/personal/:id/termino');
    fireEvent.click(await screen.findByLabelText('Despido'));
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.change(screen.getByLabelText('Motivo del despido'), { target: { value: 'Reincidencia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar término' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it('ADP-07 dialogo de rechazo sin violaciones', async () => {
    getTripMock.mockResolvedValue(makeTrip({ level1TimeoutAt: new Date(Date.now() + 240_000).toISOString() }));
    renderAt('/personal/campo/trip-1/autorizacion', <FieldTripAuthorizationScreen />, '/personal/campo/:tripId/autorizacion');
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    const dialog = await screen.findByRole('dialog');
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it('ADP-10 capacitacion sin violaciones', async () => {
    listEmployeesMock.mockResolvedValue({ items: [makeEmployee()], total: 1 });
    listTrainingsMock.mockResolvedValue([]);
    const { container } = renderAt('/personal/capacitacion', <TrainingScreen />, '/personal/capacitacion');
    await screen.findByLabelText('Tema');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('alta de personal sin violaciones', async () => {
    listEmployeesMock.mockResolvedValue({ items: [makeEmployee()], total: 1 });
    const { container } = renderAt('/personal/nuevo', <NewEmployeeScreen />, '/personal/nuevo');
    await screen.findByLabelText('Nombre completo');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('alta de personal con catalogo de areas (H-02) sin violaciones, incluida la opcion de texto libre', async () => {
    listEmployeesMock.mockResolvedValue({ items: [makeEmployee()], total: 1 });
    listAreasMock.mockResolvedValueOnce([{ code: 'OPERACIONES', name: 'Operaciones', description: null, sortOrder: 70 }]);
    const { container } = renderAt('/personal/nuevo', <NewEmployeeScreen />, '/personal/nuevo');
    const select = await screen.findByRole('combobox', { name: 'Área' });
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.change(select, { target: { value: '__OTHER__' } });
    expect(await axe(container)).toHaveNoViolations();
  });
});
