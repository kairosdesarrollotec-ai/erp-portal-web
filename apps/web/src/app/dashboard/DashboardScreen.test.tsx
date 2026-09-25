import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardScreen } from './DashboardScreen';

const getDashboardMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();
const signOutMock = vi.fn();

const { DashboardApiError } = vi.hoisted(() => {
  class DashboardApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { DashboardApiError };
});

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
  DashboardApiError,
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

const oneAssignment = [
  { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Ayacucho — Sede Central' },
];

describe('DashboardScreen (TR-06)', () => {
  beforeEach(() => {
    getDashboardMock.mockReset();
    getWorkContextAssignmentsMock.mockReset();
    signOutMock.mockReset().mockResolvedValue(undefined);
  });

  // Hallazgo de revision (finding #2): location.state ya NO se toma como
  // fuente de verdad - se confirma contra la lista real de asignaciones
  // del backend antes de mostrarlo. Antes de este fix, este test verificaba
  // exactamente lo contrario (getWorkContextAssignments sin llamar), que
  // era el bug.
  it('con contexto por navegacion que SI coincide con una asignacion real, muestra el rol resuelto', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue(oneAssignment);
    getDashboardMock.mockResolvedValue({ role: 'GERENCIA', state: 'EMPTY' });
    renderScreen({
      companyId: 'c1',
      companyName: 'Nombre falso que no deberia mostrarse',
      branchId: 'b1',
      branchName: 'Sede falsa que no deberia mostrarse',
    });

    expect(await screen.findAllByText('Gerencia')).toHaveLength(2);
    expect(getWorkContextAssignmentsMock).toHaveBeenCalledWith('fake-id-token');
    expect(getDashboardMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
    // El nombre mostrado viene de la asignacion confirmada por el backend,
    // nunca del companyName/branchName que trajo location.state.
    expect(screen.getByText(/VeloxRent — Ayacucho — Sede Central/)).toBeInTheDocument();
    expect(screen.queryByText(/falso/)).not.toBeInTheDocument();
  });

  it('con contexto por navegacion manipulado/desactualizado (no coincide con ninguna asignacion real), se ignora y se resuelve solo', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue(oneAssignment);
    getDashboardMock.mockResolvedValue({ role: 'GERENCIA', state: 'EMPTY' });
    renderScreen({
      companyId: 'company-que-no-es-del-usuario',
      companyName: 'Otra Empresa S.A.',
      branchId: 'branch-inventado',
      branchName: 'Sede inventada',
    });

    expect(await screen.findAllByText('Gerencia')).toHaveLength(2);
    // Se resolvio con la UNICA asignacion real (c1/b1), no con el estado
    // de navegacion manipulado.
    expect(getDashboardMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
    expect(screen.queryByText(/Otra Empresa/)).not.toBeInTheDocument();
  });

  it('sin contexto por navegacion y con 1 sola asignacion, la resuelve sola', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue([
      { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Ayacucho — Sede Central' },
    ]);
    getDashboardMock.mockResolvedValue({ role: 'FRONT_OFFICE', state: 'EMPTY' });
    renderScreen();

    expect(await screen.findAllByText('Front Office')).toHaveLength(2);
    expect(getDashboardMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
  });

  it('sin contexto y con mas de 1 asignacion, vuelve a TR-05', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue([
      { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'A' },
      { companyId: 'c2', companyName: 'Casa del Auto', branchId: 'b2', branchName: 'B' },
    ]);
    renderScreen();

    expect(await screen.findByText('TR-05')).toBeInTheDocument();
  });

  it('si el usuario realmente no tiene ninguna asignacion, muestra UNRESOLVED sin bloquear', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue([]);
    renderScreen();

    expect(
      await screen.findByText(/No pudimos determinar tu contexto de trabajo/),
    ).toBeInTheDocument();
  });

  // Hallazgo de revision (finding #5): un fallo tecnico (401/403/404/5xx,
  // red) nunca debe presentarse igual que "no tienes contexto" - es
  // reintentable.
  it.each([
    ['consultar las asignaciones falla (401)', () => getWorkContextAssignmentsMock.mockRejectedValue(new DashboardApiError('401', 401))],
    ['consultar el tablero falla (403)', () => {
      getWorkContextAssignmentsMock.mockResolvedValue(oneAssignment);
      getDashboardMock.mockRejectedValue(new DashboardApiError('403', 403));
    }],
    ['consultar el tablero falla (500)', () => {
      getWorkContextAssignmentsMock.mockResolvedValue(oneAssignment);
      getDashboardMock.mockRejectedValue(new DashboardApiError('500', 500));
    }],
    ['el tablero responde con forma invalida', () => {
      getWorkContextAssignmentsMock.mockResolvedValue(oneAssignment);
      getDashboardMock.mockRejectedValue(new DashboardApiError('forma invalida', 200));
    }],
  ])('RECOVERABLE_ERROR: %s nunca se presenta como "sin contexto"', async (_label, setup) => {
    setup();
    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar tu tablero/);
    expect(
      screen.queryByText(/No pudimos determinar tu contexto de trabajo/),
    ).not.toBeInTheDocument();
  });

  it('RECOVERABLE_ERROR: "Reintentar" vuelve a consultar', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue(oneAssignment);
    getDashboardMock.mockRejectedValueOnce(new DashboardApiError('500', 500));
    renderScreen();

    const retryButton = await screen.findByRole('button', { name: 'Reintentar' });
    getDashboardMock.mockResolvedValueOnce({ role: 'GERENCIA', state: 'EMPTY' });
    fireEvent.click(retryButton);

    expect(await screen.findAllByText('Gerencia')).toHaveLength(2);
  });

  // Finding #4: el boton de cerrar sesion debe tener nombre accesible y
  // manejar el error de signOut().
  it('el boton de cerrar sesion tiene nombre accesible y funciona', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue(oneAssignment);
    getDashboardMock.mockResolvedValue({ role: 'GERENCIA', state: 'EMPTY' });
    renderScreen();
    await screen.findAllByText('Gerencia');

    const signOutButton = screen.getByRole('button', { name: 'Cerrar sesión' });
    fireEvent.click(signOutButton);

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
  });

  it('si signOut() falla, muestra un error en vez de quedar en un estado ambiguo', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue(oneAssignment);
    getDashboardMock.mockResolvedValue({ role: 'GERENCIA', state: 'EMPTY' });
    signOutMock.mockRejectedValue(new Error('network offline'));
    renderScreen();
    await screen.findAllByText('Gerencia');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cerrar tu sesión/);
  });
});
