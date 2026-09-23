import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardScreen } from './DashboardScreen';

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
  });

  it('con contexto por navegacion, muestra el rol resuelto y el estado EMPTY', async () => {
    getDashboardMock.mockResolvedValue({ role: 'GERENCIA', state: 'EMPTY' });
    renderScreen({
      companyId: 'c1',
      companyName: 'VeloxRent',
      branchId: 'b1',
      branchName: 'Ayacucho — Sede Central',
    });

    expect(await screen.findAllByText('Gerencia')).toHaveLength(2);
    expect(screen.getByText('No tienes pendientes por ahora.')).toBeInTheDocument();
    expect(getDashboardMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
    expect(getWorkContextAssignmentsMock).not.toHaveBeenCalled();
  });

  it('sin contexto por navegacion y con 1 sola asignacion, la resuelve sola', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue([
      { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Ayacucho — Sede Central', role: 'FRONT_OFFICE' },
    ]);
    getDashboardMock.mockResolvedValue({ role: 'FRONT_OFFICE', state: 'EMPTY' });
    renderScreen();

    expect(await screen.findAllByText('Front Office')).toHaveLength(2);
    expect(getDashboardMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
  });

  it('sin contexto y con mas de 1 asignacion, vuelve a TR-05', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue([
      { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'A', role: 'FRONT_OFFICE' },
      { companyId: 'c2', companyName: 'Casa del Auto', branchId: 'b2', branchName: 'B', role: 'FINANZAS' },
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
      role: 'FRONT_OFFICE',
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
});