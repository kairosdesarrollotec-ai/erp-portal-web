import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NewEmployeeScreen } from './NewEmployeeScreen';
import { areaIdFromName } from './hr-domain';
import { HrCommandError } from './hr-client';
import { baseContext, makeEmployee } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const listEmployeesMock = vi.fn();
const createMock = vi.fn();
const getCandidateMock = vi.fn();

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('../recruitment/recruitment-client', async () => {
  const actual = await vi.importActual<typeof import('../recruitment/recruitment-client')>('../recruitment/recruitment-client');
  return { ...actual, getCandidate: (...a: unknown[]) => getCandidateMock(...a) };
});
vi.mock('./hr-client', async () => {
  const actual = await vi.importActual<typeof import('./hr-client')>('./hr-client');
  return {
    ...actual,
    listEmployees: (...a: unknown[]) => listEmployeesMock(...a),
    createEmployee: (...a: unknown[]) => createMock(...a),
  };
});

const CANDIDATE = '0b3d5f1e-8a4c-4f60-9a53-1d2e3f4a5b6c';

function renderScreen(search = '') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/nuevo', search, state: baseContext }]}>
      <Routes>
        <Route path="/personal/nuevo" element={<NewEmployeeScreen />} />
        <Route path="/personal/:id" element={<div>ficha creada</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fill() {
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: ' Ana Torres ' } });
  fireEvent.change(screen.getByLabelText('Número de documento'), { target: { value: '70123456' } });
  fireEvent.change(screen.getByLabelText('Área'), { target: { value: 'Operaciones' } });
  fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'Conductor' } });
}

describe('NewEmployeeScreen (alta de personal)', () => {
  beforeEach(() => {
    listEmployeesMock.mockReset().mockResolvedValue({ items: [makeEmployee()], total: 1 });
    createMock.mockReset();
    getCandidateMock.mockReset().mockResolvedValue({ fullName: 'Ana Torres', documentType: 'CE', documentNumber: '70123456', email: 'ana@correo.pe', phone: '999111222' });
    setPermissions(['HR_ADMINISTRATION.MANAGE_EMPLOYEES', 'HR_ADMINISTRATION.VIEW_EMPLOYEES']);
  });

  it('deriva un id estable para un area nueva', () => {
    expect(areaIdFromName(' Administración y Finanzas ')).toBe('ADMINISTRACION_Y_FINANZAS');
  });

  it('foco en el nombre y valida los obligatorios', async () => {
    renderScreen();
    const name = await screen.findByLabelText('Nombre completo');
    await waitFor(() => expect(name).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar persona' }));
    expect(await screen.findByText('Indica el nombre completo.')).toBeInTheDocument();
    expect(screen.getByText('Indica el número de documento.')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('crea la persona reutilizando el id de un area existente y abre su ficha', async () => {
    createMock.mockResolvedValue(makeEmployee({ id: 'emp-9' }));
    renderScreen();
    await screen.findByLabelText('Nombre completo');
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar persona' }));
    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith(
        'tok',
        expect.objectContaining({ companyId: 'c1', branchId: 'b1', fullName: 'Ana Torres', documentNumber: '70123456', areaId: 'OPERACIONES', areaName: 'Operaciones', jobTitle: 'Conductor' }),
      ),
    );
    expect(createMock.mock.calls[0][1]).not.toHaveProperty('candidateId');
    expect(await screen.findByText('ficha creada')).toBeInTheDocument();
  });

  it('desde un candidato contratado envia candidateId como referencia', async () => {
    createMock.mockResolvedValue(makeEmployee({ id: 'emp-9' }));
    renderScreen(`?candidateId=${CANDIDATE}`);
    await screen.findByLabelText('Nombre completo');
    expect(screen.getByText(/enlazada a la persona contratada en Reclutamiento/)).toBeInTheDocument();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar persona' }));
    await waitFor(() => expect(createMock).toHaveBeenCalledWith('tok', expect.objectContaining({ candidateId: CANDIDATE })));
  });

  it('precarga nombre, documento y contacto desde el candidato', async () => {
    renderScreen(`?candidateId=${CANDIDATE}`);
    await waitFor(() => expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana Torres'));
    expect(getCandidateMock).toHaveBeenCalledWith('tok', CANDIDATE, { companyId: 'c1', branchId: 'b1' });
    expect(screen.getByLabelText('Tipo de documento')).toHaveValue('CE');
    expect(screen.getByLabelText('Número de documento')).toHaveValue('70123456');
    expect(screen.getByLabelText('Correo (opcional)')).toHaveValue('ana@correo.pe');
    expect(screen.getByLabelText('Teléfono (opcional)')).toHaveValue('999111222');
  });

  it('si falla la precarga avisa y deja el formulario usable', async () => {
    getCandidateMock.mockRejectedValue(new Error('boom'));
    renderScreen(`?candidateId=${CANDIDATE}`);
    expect(await screen.findByText(/No pudimos precargar los datos del candidato/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('');
  });

  it('ignora un candidateId que no es un UUID', async () => {
    renderScreen('?candidateId=abc');
    await screen.findByLabelText('Nombre completo');
    expect(getCandidateMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/enlazada a la persona contratada/)).not.toBeInTheDocument();
  });

  it('muestra el error de negocio si el documento ya existe', async () => {
    createMock.mockRejectedValue(new HrCommandError(409, { code: 'DUPLICATE_EMPLOYEE_DOCUMENT' }));
    renderScreen();
    await screen.findByLabelText('Nombre completo');
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar persona' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Ya existe una persona registrada con ese documento/);
  });

  it('sin MANAGE_EMPLOYEES no se puede registrar personal', () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    renderScreen();
    expect(screen.getByRole('alert')).toHaveTextContent(/No tienes permiso para registrar personal/);
    expect(listEmployeesMock).not.toHaveBeenCalled();
  });
});
