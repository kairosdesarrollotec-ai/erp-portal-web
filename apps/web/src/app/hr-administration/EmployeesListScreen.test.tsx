import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EmployeesListScreen } from './EmployeesListScreen';
import { baseContext, makeEmployee } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const listEmployeesMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./hr-client', async () => {
  const actual = await vi.importActual<typeof import('./hr-client')>('./hr-client');
  return { ...actual, listEmployees: (...a: unknown[]) => listEmployeesMock(...a) };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal', state: baseContext }]}>
      <Routes>
        <Route path="/personal" element={<EmployeesListScreen />} />
        <Route path="/personal/:id" element={<div>ficha de personal</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EmployeesListScreen (ADP-01)', () => {
  beforeEach(() => {
    listEmployeesMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
  });

  it('muestra nombre, area, empresa y relacion laboral con texto', async () => {
    listEmployeesMock.mockResolvedValue({
      items: [makeEmployee(), makeEmployee({ id: 'emp-2', fullName: 'Rosa Díaz', status: 'PERIODO_PRUEBA', areaId: 'VENTAS', areaName: 'Ventas' })],
      total: 2,
    });
    renderScreen();
    const table = await screen.findByRole('table', { name: 'Personal' });
    expect(within(table).getByText('Carlos Pérez')).toBeInTheDocument();
    expect(within(table).getByText('Planilla')).toBeInTheDocument();
    expect(within(table).getByText('Periodo de prueba')).toBeInTheDocument();
    expect(within(table).getAllByText('VeloxRent').length).toBe(2);
  });

  it('consulta con el contexto de empresa y sede', async () => {
    listEmployeesMock.mockResolvedValue({ items: [makeEmployee()], total: 1 });
    renderScreen();
    await screen.findByRole('table');
    expect(listEmployeesMock).toHaveBeenCalledWith('tok', { companyId: 'c1', branchId: 'b1' }, expect.objectContaining({ limit: 20, offset: 0 }), );
  });

  it('filtra por area enviando el area al servicio', async () => {
    listEmployeesMock.mockResolvedValue({ items: [makeEmployee()], total: 1 });
    renderScreen();
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Área'), { target: { value: 'OPERACIONES' } });
    await waitFor(() =>
      expect(listEmployeesMock).toHaveBeenLastCalledWith('tok', { companyId: 'c1', branchId: 'b1' }, expect.objectContaining({ areaId: 'OPERACIONES' })),
    );
  });

  it('"Abrir ficha" navega a la ficha de la persona', async () => {
    listEmployeesMock.mockResolvedValue({ items: [makeEmployee()], total: 1 });
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir ficha de Carlos Pérez' }));
    expect(await screen.findByText('ficha de personal')).toBeInTheDocument();
  });

  it('sin VIEW_EMPLOYEES muestra acceso denegado y no consulta', () => {
    setPermissions([]);
    renderScreen();
    expect(screen.getByText(/No tienes acceso/)).toBeInTheDocument();
    expect(listEmployeesMock).not.toHaveBeenCalled();
  });

  it('el enlace a Salidas a campo solo aparece con permisos de campo', async () => {
    listEmployeesMock.mockResolvedValue({ items: [makeEmployee()], total: 1 });
    const { unmount } = renderScreen();
    await screen.findByRole('table');
    expect(screen.queryByRole('link', { name: 'Salidas a campo' })).not.toBeInTheDocument();
    unmount();
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES', 'HR_ADMINISTRATION.AUTHORIZE_FIELD_TRIP']);
    renderScreen();
    expect(await screen.findByRole('link', { name: 'Salidas a campo' })).toBeInTheDocument();
  });

  it('estado vacio y error recuperable', async () => {
    listEmployeesMock.mockResolvedValueOnce({ items: [], total: 0 });
    const { unmount } = renderScreen();
    expect(await screen.findByText(/Todavía no hay personal/)).toBeInTheDocument();
    unmount();
    listEmployeesMock.mockRejectedValueOnce(new Error('x'));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar el personal/);
  });

  it('muestra "Cargando" mientras llega la lista', async () => {
    listEmployeesMock.mockReturnValue(new Promise(() => {}));
    renderScreen();
    expect(await screen.findByText(/Cargando personal/)).toBeInTheDocument();
  });
});
