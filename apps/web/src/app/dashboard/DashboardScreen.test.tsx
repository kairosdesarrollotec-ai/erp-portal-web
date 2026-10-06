import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardScreen } from './DashboardScreen';
import { clearPermissions, roleRef } from '../../test/permissions';
import { usePermissionsStore } from '../shared/usePermissions';

const getDashboardMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();
const signOutMock = vi.fn();

vi.mock('firebase/auth', () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      email: 'user@veloxrent.pe',
      getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
    },
  }),
}));

vi.mock('./dashboard-client', () => ({
  getDashboard: (...args: unknown[]) => getDashboardMock(...args),
}));

vi.mock('../auth/work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
}));

const getMyPermissionsMock = vi.fn();

vi.mock('../shared/my-permissions-client', () => ({
  getMyPermissions: (...args: unknown[]) => getMyPermissionsMock(...args),
}));

const getMyNotificationsMock = vi.fn();

vi.mock('../notifications/notifications-client', () => ({
  getMyNotifications: (...args: unknown[]) => getMyNotificationsMock(...args),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));

function renderScreen(state?: Record<string, unknown>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/tablero', state }]}>
      <Routes>
        <Route path="/tablero" element={<DashboardScreen />} />
        <Route path="/seleccion-empresa-sede" element={<div>TR-05</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardScreen (TR-06)', () => {
  beforeEach(() => {
    getDashboardMock.mockReset();
    getWorkContextAssignmentsMock.mockReset();
    signOutMock.mockReset().mockResolvedValue(undefined);
    getMyNotificationsMock.mockReset().mockResolvedValue([]);
    clearPermissions();
    getMyPermissionsMock.mockReset().mockResolvedValue({
      role: roleRef('GERENCIA', 'Gerencia'),
      matrixVersion: 3,
      permissions: [{ module: 'INCIDENT', action: 'VIEW' }],
    });
  });

  it('con contexto por navegacion, muestra el rol resuelto y el estado EMPTY', async () => {
    getDashboardMock.mockResolvedValue({ role: roleRef('GERENCIA', 'Gerencia'), state: 'EMPTY' });
    renderScreen({
      companyId: 'c1',
      companyName: 'VeloxRent',
      branchId: 'b1',
      branchName: 'Ayacucho — Sede Central',
    });

    await screen.findByText('No tienes pendientes por ahora.');
    expect(screen.getAllByText('Gerencia')).toHaveLength(2);
    expect(screen.getByText('No tienes pendientes por ahora.')).toBeInTheDocument();
    expect(getDashboardMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
    expect(getWorkContextAssignmentsMock).not.toHaveBeenCalled();
  });

  it('al fijar el contexto carga los permisos efectivos de esa empresa/sede', async () => {
    getDashboardMock.mockResolvedValue({ role: roleRef('GERENCIA', 'Gerencia'), state: 'EMPTY' });
    renderScreen({ companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' });

    await screen.findByText('No tienes pendientes por ahora.');
    await waitFor(() => expect(usePermissionsStore.getState().status).toBe('ready'));
    expect(getMyPermissionsMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
    expect(usePermissionsStore.getState().granted.has('INCIDENT.VIEW')).toBe(true);
  });

  it('el tablero muestra el nombre del rol que viene de la API, también si es un rol creado a mano', async () => {
    getDashboardMock.mockResolvedValue({ role: roleRef(null, 'Supervisor de flota'), state: 'EMPTY' });
    renderScreen({ companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' });

    await screen.findByText('No tienes pendientes por ahora.');
    expect(screen.getAllByText('Supervisor de flota')).toHaveLength(2);
  });

  it('el rol de sistema PLATFORM_ADMIN ve los accesos directos de configuración en vez de tareas', async () => {
    getDashboardMock.mockResolvedValue({ role: roleRef('PLATFORM_ADMIN', 'Administrador de Plataforma'), state: 'EMPTY' });
    renderScreen({ companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' });

    expect(await screen.findByText('ACCESOS DIRECTOS DE CONFIGURACIÓN')).toBeInTheDocument();
    expect(screen.queryByText('No tienes pendientes por ahora.')).not.toBeInTheDocument();
  });

  it('sin contexto por navegacion y con 1 sola asignacion, la resuelve sola', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue([
      { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Ayacucho — Sede Central', role: roleRef('FRONT_OFFICE', 'Front Office') },
    ]);
    getDashboardMock.mockResolvedValue({ role: roleRef('FRONT_OFFICE', 'Front Office'), state: 'EMPTY' });
    renderScreen();

    await screen.findByText('No tienes pendientes por ahora.');
    expect(screen.getAllByText('Front Office')).toHaveLength(2);
    expect(getDashboardMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
  });

  it('sin contexto y con mas de 1 asignacion, vuelve a TR-05', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue([
      { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'A', role: roleRef('FRONT_OFFICE', 'Front Office') },
      { companyId: 'c2', companyName: 'Casa del Auto', branchId: 'b2', branchName: 'B', role: roleRef('FINANZAS', 'Finanzas') },
    ]);
    renderScreen();

    expect(await screen.findByText('TR-05')).toBeInTheDocument();
  });

  it('si no se puede resolver el contexto, muestra un mensaje defensivo sin bloquear', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue([]);
    renderScreen();

    expect(
      await screen.findByText(/No pudimos determinar tu contexto de trabajo/),
    ).toBeInTheDocument();
  });


  it('con tareas reales (Front-office), las muestra ordenadas y enlazadas a su deepLink', async () => {
    getDashboardMock.mockResolvedValue({
      role: roleRef('FRONT_OFFICE', 'Front Office'),
      state: 'READY',
      tasks: [
        { id: 't1', itemType: 'TASK', priority: 10, title: 'Reserva pendiente de pago/documentos', detail: 'Vehiculo veh-1', deepLink: '/reservas/res-1' },
      ],
    });
    renderScreen({
      companyId: 'c1',
      companyName: 'VeloxRent',
      branchId: 'b1',
      branchName: 'Ayacucho — Sede Central',
    });

    const link = await screen.findByRole('link', { name: /Reserva pendiente de pago\/documentos/ });
    expect(link).toHaveAttribute('href', '/reservas/res-1');
    expect(screen.getByText('Vehiculo veh-1')).toBeInTheDocument();
    expect(screen.queryByText('No tienes pendientes por ahora.')).not.toBeInTheDocument();
  });

  it('muestra el contador de notificaciones no leidas y abre el panel al hacer clic en la campana', async () => {
    getDashboardMock.mockResolvedValue({ role: roleRef('GERENCIA', 'Gerencia'), state: 'EMPTY' });
    getMyNotificationsMock.mockResolvedValue([
      {
        id: 'n1',
        notificationType: 'ReservationCreated',
        isEscalated: false,
        title: 'Nueva reserva creada',
        deepLink: '/reservas/r1',
        readAt: null,
        createdAt: '2026-09-23T10:00:00.000Z',
      },
    ]);
    renderScreen({
      companyId: 'c1',
      companyName: 'VeloxRent',
      branchId: 'b1',
      branchName: 'Ayacucho — Sede Central',
    });

    expect(await screen.findByText('1')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Notificaciones'));
    expect(await screen.findByText('Nueva reserva creada')).toBeInTheDocument();
  });
});