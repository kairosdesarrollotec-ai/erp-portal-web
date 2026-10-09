import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EmployeeFileScreen } from './EmployeeFileScreen';
import { HrApiError } from './hr-client';
import { baseContext, makeDetail } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getEmployeeMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./hr-client', async () => {
  const actual = await vi.importActual<typeof import('./hr-client')>('./hr-client');
  return { ...actual, getEmployee: (...a: unknown[]) => getEmployeeMock(...a) };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/emp-1', state: baseContext }]}>
      <Routes>
        <Route path="/personal/:id" element={<EmployeeFileScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

const ALL = [
  'HR_ADMINISTRATION.VIEW_EMPLOYEES',
  'HR_ADMINISTRATION.SCHEDULE_VACATION',
  'HR_ADMINISTRATION.REQUEST_FIELD_TRIP',
  'HR_ADMINISTRATION.TERMINATE_EMPLOYMENT',
];

describe('EmployeeFileScreen (ADP-01 ficha)', () => {
  beforeEach(() => {
    getEmployeeMock.mockReset();
    setPermissions(ALL);
  });

  it('muestra los datos laborales y las acciones permitidas', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail());
    renderScreen();
    expect(await screen.findByRole('heading', { name: 'Carlos Pérez' })).toBeInTheDocument();
    expect(screen.getByText('Planilla')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Asistencia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar vacaciones' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar salida a campo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar renuncia o despido' })).toBeInTheDocument();
  });

  it('sin permisos puntuales no hay botones de accion', async () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    getEmployeeMock.mockResolvedValue(makeDetail());
    renderScreen();
    await screen.findByRole('heading', { name: 'Carlos Pérez' });
    expect(screen.queryByRole('button', { name: 'Solicitar vacaciones' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar salida a campo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar renuncia o despido' })).not.toBeInTheDocument();
  });

  it('la referencia a Reclutamiento es un enlace; la ficha no se fusiona con el candidato', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail({ candidateId: 'cand-9' }));
    renderScreen();
    const link = await screen.findByRole('link', { name: /Ver su proceso en Reclutamiento/ });
    expect(link).toHaveAttribute('href', '/reclutamiento/candidatos/cand-9');
    expect(screen.getByText(/no se fusiona con la de candidato/)).toBeInTheDocument();
  });

  it('una persona terminada no ofrece solicitudes ni nuevo termino', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail({ status: 'TERMINADO', terminatedAt: '2026-10-01T00:00:00Z', terminationReason: 'RENUNCIA' }));
    renderScreen();
    expect(await screen.findByText(/La relación laboral terminó/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar renuncia o despido' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar vacaciones' })).not.toBeInTheDocument();
  });

  it('estados 404 y error recuperable', async () => {
    getEmployeeMock.mockRejectedValueOnce(new HrApiError(404));
    const { unmount } = renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No encontramos la ficha/);
    unmount();
    getEmployeeMock.mockRejectedValueOnce(new Error('x'));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar la ficha/);
  });
});
