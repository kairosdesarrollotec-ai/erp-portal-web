import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AreasScreen } from './AreasScreen';
import { HrCommandError } from './hr-client';
import { baseContext } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const listMock = vi.fn();
const createMock = vi.fn();
const deactivateMock = vi.fn();
const reactivateMock = vi.fn();

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
    listHrAreas: (...a: unknown[]) => listMock(...a),
    createHrArea: (...a: unknown[]) => createMock(...a),
    deactivateHrArea: (...a: unknown[]) => deactivateMock(...a),
    reactivateHrArea: (...a: unknown[]) => reactivateMock(...a),
  };
});

const operaciones = { code: 'OPERACIONES', name: 'Operaciones', description: null, sortOrder: 1, isActive: true };
const marketing = { code: 'MARKETING', name: 'Marketing', description: null, sortOrder: 2, isActive: false };

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/areas', state: baseContext }]}>
      <AreasScreen />
    </MemoryRouter>,
  );
}

describe('AreasScreen (gestión de áreas de RR.HH.)', () => {
  beforeEach(() => {
    listMock.mockReset().mockResolvedValue([operaciones, marketing]);
    createMock.mockReset();
    deactivateMock.mockReset();
    reactivateMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.MANAGE_AREAS', 'HR_ADMINISTRATION.VIEW_EMPLOYEES']);
  });

  it('lista las áreas con las desactivadas (includeInactive) y su estado', async () => {
    renderScreen();
    expect(await screen.findByText('Operaciones')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(screen.getByText('Desactivada')).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith('tok', { companyId: 'c1', branchId: 'b1' }, undefined, { includeInactive: true });
  });

  it('sin MANAGE_AREAS no muestra la gestión', () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    renderScreen();
    expect(screen.getByText('Solo Gerencia General puede gestionar las áreas.')).toBeInTheDocument();
    expect(listMock).not.toHaveBeenCalled();
  });

  it('crea un área y la agrega a la lista', async () => {
    createMock.mockResolvedValue({ code: 'LOGISTICA', name: 'Logística', description: null, sortOrder: 3, isActive: true });
    renderScreen();
    fireEvent.change(await screen.findByLabelText('Nombre del área nueva'), { target: { value: 'Logística' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear área' }));
    expect(await screen.findByText(/Área «Logística» creada/)).toBeInTheDocument();
    expect(createMock).toHaveBeenCalledWith('tok', { companyId: 'c1', branchId: 'b1' }, { name: 'Logística', description: undefined });
    expect(screen.getAllByText('Logística').length).toBeGreaterThan(0);
  });

  it('valida el nombre vacío', async () => {
    renderScreen();
    await screen.findByText('Operaciones');
    fireEvent.click(screen.getByRole('button', { name: 'Crear área' }));
    expect(await screen.findByText('Indica el nombre del área.')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it.each([
    [409, 'HR_AREA_ALREADY_EXISTS', /Ya existe un área con ese nombre/],
    [422, 'HR_AREA_NAME_INVALID', /El nombre del área no es válido/],
  ])('mapea %i %s al crear', async (status, code, message) => {
    createMock.mockRejectedValue(new HrCommandError(status, { code }));
    renderScreen();
    fireEvent.change(await screen.findByLabelText('Nombre del área nueva'), { target: { value: '###' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear área' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('desactiva y reactiva un área', async () => {
    deactivateMock.mockResolvedValue({ ...operaciones, isActive: false });
    reactivateMock.mockResolvedValue({ ...marketing, isActive: true });
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar el área Operaciones' }));
    expect(await screen.findByText(/Área «Operaciones» desactivada/)).toBeInTheDocument();
    expect(deactivateMock).toHaveBeenCalledWith('tok', { companyId: 'c1', branchId: 'b1' }, 'OPERACIONES');
    fireEvent.click(screen.getByRole('button', { name: 'Activar el área Marketing' }));
    expect(await screen.findByText(/Área «Marketing» activada/)).toBeInTheDocument();
    expect(reactivateMock).toHaveBeenCalledWith('tok', { companyId: 'c1', branchId: 'b1' }, 'MARKETING');
  });

  it('mapea 409 HR_AREA_IN_USE al desactivar', async () => {
    deactivateMock.mockRejectedValue(new HrCommandError(409, { code: 'HR_AREA_IN_USE' }));
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar el área Operaciones' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/todavía tiene personal activo/));
  });
});
