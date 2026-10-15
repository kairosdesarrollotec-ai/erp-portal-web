import { describe, it, expect, vi, beforeEach } from 'vitest';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminUsersScreen } from './AdminUsersScreen';
import { AdminCommandError } from './admin-users-client';

const listOrganizationUsersMock = vi.fn();
const assignUserToCompanyMock = vi.fn();
const deactivateAssignmentMock = vi.fn();
const getOrganizationCompaniesMock = vi.fn();
const listRolesMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'admin@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./admin-users-client', async () => {
  const actual = await vi.importActual<typeof import('./admin-users-client')>('./admin-users-client');
  return {
    ...actual,
    listOrganizationUsers: (...args: unknown[]) => listOrganizationUsersMock(...args),
    assignUserToCompany: (...args: unknown[]) => assignUserToCompanyMock(...args),
    deactivateAssignment: (...args: unknown[]) => deactivateAssignmentMock(...args),
    getOrganizationCompanies: (...args: unknown[]) => getOrganizationCompaniesMock(...args),
  };
});

vi.mock('./roles-client', async () => {
  const actual = await vi.importActual<typeof import('./roles-client')>('./roles-client');
  return {
    ...actual,
    listRoles: (...args: unknown[]) => listRolesMock(...args),
  };
});

const ROLE_FRONT_OFFICE = { id: 'role-fo', name: 'Front Office', key: 'FRONT_OFFICE', isSystem: true, active: true, version: 1, assignmentCount: 3 };
const ROLE_CUSTOM = { id: 'role-custom', name: 'Supervisor de flota', key: null, isSystem: false, active: true, version: 1, assignmentCount: 0 };
const ROLE_INACTIVE = { id: 'role-old', name: 'Rol obsoleto', key: null, isSystem: false, active: false, version: 4, assignmentCount: 0 };

const GROUP_COMPANIES = [
  {
    companyId: 'c1',
    companyName: 'VeloxRent',
    branches: [{ branchId: 'b1', branchName: 'Sede Central' }],
  },
  {
    companyId: 'c2',
    companyName: 'VeloxRent Norte',
    branches: [{ branchId: 'b2', branchName: 'Sede Norte' }],
  },
];

async function chooseRole(name: string) {
  const select = (await screen.findByLabelText('Rol')) as HTMLSelectElement;
  const option = (await within(select).findByRole('option', { name })) as HTMLOptionElement;
  fireEvent.change(select, { target: { value: option.value } });
}

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/admin/usuarios', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path="/admin/usuarios" element={<AdminUsersScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminUsersScreen (ADM-01)', () => {
  beforeEach(() => {
    listOrganizationUsersMock.mockReset();
    assignUserToCompanyMock.mockReset();
    deactivateAssignmentMock.mockReset();
    getOrganizationCompaniesMock.mockReset();
    getOrganizationCompaniesMock.mockResolvedValue(GROUP_COMPANIES);
    listRolesMock.mockReset();
    listRolesMock.mockResolvedValue([ROLE_FRONT_OFFICE, ROLE_CUSTOM, ROLE_INACTIVE]);
  });

  it('muestra la bandeja de usuarios con estado y MFA', async () => {
    listOrganizationUsersMock.mockResolvedValue([
      {
        id: 'assign-1',
        firebaseUid: 'uid-1',
        email: 'usuario@veloxrent.pe',
        companyId: 'c1',
        companyName: 'VeloxRent',
        branchId: 'b1',
        branchName: 'Sede Central',
        role: { id: 'role-fo', name: 'Front Office', key: 'FRONT_OFFICE' },
        active: true,
        mfaEnrolled: true,
      },
    ]);
    renderScreen();

    expect(await screen.findByText('usuario@veloxrent.pe')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Front Office')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('la tabla muestra el nombre del rol que viene de la API, también de un rol creado a mano', async () => {
    listOrganizationUsersMock.mockResolvedValue([
      {
        id: 'assign-9',
        firebaseUid: 'uid-9',
        email: 'flota@veloxrent.pe',
        companyId: 'c1',
        companyName: 'VeloxRent',
        branchId: 'b1',
        branchName: 'Sede Central',
        role: { id: 'role-custom', name: 'Supervisor de flota', key: null },
        active: true,
        mfaEnrolled: false,
      },
    ]);
    renderScreen();

    expect(await screen.findByText('Supervisor de flota')).toBeInTheDocument();
  });

  it('muestra el estado vacio cuando no hay usuarios', async () => {
    listOrganizationUsersMock.mockResolvedValue([]);
    renderScreen();

    expect(await screen.findByText('Todavía no hay usuarios asignados a esta organización.')).toBeInTheDocument();
  });

  it('muestra el error recuperable si la carga falla', async () => {
    listOrganizationUsersMock.mockRejectedValue(new Error('network'));
    renderScreen();

    expect(await screen.findByText(/No pudimos cargar la bandeja de usuarios/)).toBeInTheDocument();
  });

  it('agrega un usuario mediante el formulario "Agregar usuario"', async () => {
    listOrganizationUsersMock.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'assign-2',
        firebaseUid: 'uid-2',
        email: 'nuevo@veloxrent.pe',
        companyId: 'c1',
        companyName: 'VeloxRent',
        branchId: 'b1',
        branchName: 'Sede Central',
        role: { id: 'role-fo', name: 'Front Office', key: 'FRONT_OFFICE' },
        active: true,
        mfaEnrolled: false,
      },
    ]);
    assignUserToCompanyMock.mockResolvedValue({ id: 'assign-2' });
    renderScreen();

    await screen.findByText('Todavía no hay usuarios asignados a esta organización.');

    fireEvent.click(screen.getByText('Agregar usuario'));
    fireEvent.change(screen.getByPlaceholderText('usuario@veloxrent.pe'), {
      target: { value: 'nuevo@veloxrent.pe' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 8 caracteres'), {
      target: { value: 'Temporal@123' },
    });
    await chooseRole('Front Office');
    fireEvent.click(screen.getByText('Agregar usuario'));

    await waitFor(() => {
      expect(assignUserToCompanyMock).toHaveBeenCalledWith('fake-id-token', {
        companyId: 'c1',
        branchId: 'b1',
        targetEmail: 'nuevo@veloxrent.pe',
        targetCompanyId: 'c1',
        targetBranchId: 'b1',
        targetRoleId: 'role-fo',
        initialPassword: 'Temporal@123',
      });
    });
    expect(await screen.findByText('nuevo@veloxrent.pe')).toBeInTheDocument();
  });

  it('permite elegir empresa/sede del grupo (no solo el contexto actual del admin)', async () => {
    listOrganizationUsersMock.mockResolvedValue([]);
    assignUserToCompanyMock.mockResolvedValue({ id: 'assign-3' });
    renderScreen();

    await screen.findByText('Todavía no hay usuarios asignados a esta organización.');
    fireEvent.click(screen.getByText('Agregar usuario'));

    await screen.findByText('VeloxRent Norte');
    fireEvent.change(screen.getByPlaceholderText('usuario@veloxrent.pe'), {
      target: { value: 'norte@veloxrent.pe' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 8 caracteres'), {
      target: { value: 'Temporal@123' },
    });
    // Desmarcar VeloxRent Sede Central y marcar VeloxRent Norte Sede Norte
    fireEvent.click(screen.getByLabelText('VeloxRent - Sede Central'));
    fireEvent.click(screen.getByLabelText('VeloxRent Norte - Sede Norte'));

    await chooseRole('Front Office');
    fireEvent.click(screen.getAllByText('Agregar usuario').at(-1)!);

    await waitFor(() => {
      expect(assignUserToCompanyMock).toHaveBeenCalledWith('fake-id-token', {
        companyId: 'c1',
        branchId: 'b1',
        targetEmail: 'norte@veloxrent.pe',
        targetCompanyId: 'c2',
        targetBranchId: 'b2',
        targetRoleId: 'role-fo',
        initialPassword: 'Temporal@123',
      });
    });
  });

  it('permite asignar a múltiples empresas y sedes simultáneamente', async () => {
    listOrganizationUsersMock.mockResolvedValue([]);
    assignUserToCompanyMock.mockResolvedValue({ id: 'assign-5' });
    renderScreen();

    await screen.findByText('Todavía no hay usuarios asignados a esta organización.');
    fireEvent.click(screen.getByText('Agregar usuario'));

    await screen.findByText('VeloxRent Norte');
    fireEvent.change(screen.getByPlaceholderText('usuario@veloxrent.pe'), {
      target: { value: 'multi@veloxrent.pe' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 8 caracteres'), {
      target: { value: 'Temporal@123' },
    });

    // VeloxRent Sede Central ya viene seleccionada, además marcamos VeloxRent Norte
    fireEvent.click(screen.getByLabelText('VeloxRent Norte - Sede Norte'));

    await chooseRole('Front Office');
    fireEvent.click(screen.getAllByText('Agregar usuario').at(-1)!);

    await waitFor(() => {
      expect(assignUserToCompanyMock).toHaveBeenCalledTimes(2);
      expect(assignUserToCompanyMock).toHaveBeenNthCalledWith(1, 'fake-id-token', {
        companyId: 'c1',
        branchId: 'b1',
        targetEmail: 'multi@veloxrent.pe',
        targetCompanyId: 'c1',
        targetBranchId: 'b1',
        targetRoleId: 'role-fo',
        initialPassword: 'Temporal@123',
      });
      expect(assignUserToCompanyMock).toHaveBeenNthCalledWith(2, 'fake-id-token', {
        companyId: 'c1',
        branchId: 'b1',
        targetEmail: 'multi@veloxrent.pe',
        targetCompanyId: 'c2',
        targetBranchId: 'b2',
        targetRoleId: 'role-fo',
        initialPassword: undefined,
      });
    });
  });

  it('agrega un usuario con correo existente sin exigir contraseña inicial', async () => {
    listOrganizationUsersMock.mockResolvedValue([]);
    assignUserToCompanyMock.mockResolvedValue({ id: 'assign-4' });
    renderScreen();

    await screen.findByText('Todavía no hay usuarios asignados a esta organización.');
    fireEvent.click(screen.getByText('Agregar usuario'));
    fireEvent.change(screen.getByPlaceholderText('usuario@veloxrent.pe'), {
      target: { value: 'existente@veloxrent.pe' },
    });
    // La contraseña se deja en blanco: el backend reutiliza el uid existente.
    await chooseRole('Front Office');
    fireEvent.click(screen.getAllByText('Agregar usuario').at(-1)!);

    await waitFor(() => {
      expect(assignUserToCompanyMock).toHaveBeenCalledWith('fake-id-token', {
        companyId: 'c1',
        branchId: 'b1',
        targetEmail: 'existente@veloxrent.pe',
        targetCompanyId: 'c1',
        targetBranchId: 'b1',
        targetRoleId: 'role-fo',
        initialPassword: undefined,
      });
    });
  });

  it('da de baja a un usuario tras confirmar', async () => {
    listOrganizationUsersMock
      .mockResolvedValueOnce([
        {
          id: 'assign-1',
          firebaseUid: 'uid-1',
          email: 'usuario@veloxrent.pe',
          companyId: 'c1',
          companyName: 'VeloxRent',
          branchId: 'b1',
          branchName: 'Sede Central',
          role: { id: 'role-fo', name: 'Front Office', key: 'FRONT_OFFICE' },
          active: true,
          mfaEnrolled: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'assign-1',
          firebaseUid: 'uid-1',
          email: 'usuario@veloxrent.pe',
          companyId: 'c1',
          companyName: 'VeloxRent',
          branchId: 'b1',
          branchName: 'Sede Central',
          role: { id: 'role-fo', name: 'Front Office', key: 'FRONT_OFFICE' },
          active: false,
          mfaEnrolled: false,
        },
      ]);
    deactivateAssignmentMock.mockResolvedValue(undefined);
    renderScreen();

    await screen.findByText('usuario@veloxrent.pe');
    fireEvent.click(screen.getByText('Dar de baja'));
    fireEvent.click(screen.getByText('Confirmar baja'));

    await waitFor(() => {
      expect(deactivateAssignmentMock).toHaveBeenCalledWith('fake-id-token', 'assign-1', 'c1', 'b1');
    });
    expect(await screen.findByText('Inactivo')).toBeInTheDocument();
  });

  it('el selector de rol se alimenta de GET /admin/roles y solo ofrece roles activos', async () => {
    listOrganizationUsersMock.mockResolvedValue([]);
    renderScreen();

    await screen.findByText('Todavía no hay usuarios asignados a esta organización.');
    fireEvent.click(screen.getByText('Agregar usuario'));

    const select = (await screen.findByLabelText('Rol')) as HTMLSelectElement;
    await within(select).findByRole('option', { name: 'Supervisor de flota' });
    const names = Array.from(select.options).map((o) => o.text);
    expect(names).toEqual(['Selecciona un rol', 'Front Office', 'Supervisor de flota']);
    expect(names).not.toContain('Rol obsoleto');
    expect(listRolesMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
  });

  it('asigna un rol personalizado por targetRoleId y no deja agregar sin elegir rol', async () => {
    listOrganizationUsersMock.mockResolvedValue([]);
    assignUserToCompanyMock.mockResolvedValue({ id: 'assign-7' });
    renderScreen();

    await screen.findByText('Todavía no hay usuarios asignados a esta organización.');
    fireEvent.click(screen.getByText('Agregar usuario'));
    fireEvent.change(screen.getByPlaceholderText('usuario@veloxrent.pe'), { target: { value: 'flota@veloxrent.pe' } });

    const submit = screen.getByRole('button', { name: 'Agregar usuario' });
    expect(submit).toBeDisabled();

    await chooseRole('Supervisor de flota');
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);

    await waitFor(() => {
      expect(assignUserToCompanyMock).toHaveBeenCalledWith('fake-id-token', {
        companyId: 'c1',
        branchId: 'b1',
        targetEmail: 'flota@veloxrent.pe',
        targetCompanyId: 'c1',
        targetBranchId: 'b1',
        targetRoleId: 'role-custom',
        initialPassword: undefined,
      });
    });
  });

  it('avisa si no se pudieron cargar los roles', async () => {
    listOrganizationUsersMock.mockResolvedValue([]);
    listRolesMock.mockRejectedValue(new Error('network'));
    renderScreen();

    await screen.findByText('Todavía no hay usuarios asignados a esta organización.');
    fireEvent.click(screen.getByText('Agregar usuario'));

    expect(await screen.findByText(/No pudimos cargar los roles disponibles/)).toBeInTheDocument();
  });

  it('muestra en lenguaje claro el rechazo del back por rol no disponible', async () => {
    listOrganizationUsersMock.mockResolvedValue([]);
    assignUserToCompanyMock.mockRejectedValue(
      new AdminCommandError(400, { code: 'ROLE_INACTIVE' }),
    );
    renderScreen();

    await screen.findByText('Todavía no hay usuarios asignados a esta organización.');
    fireEvent.click(screen.getByText('Agregar usuario'));
    fireEvent.change(screen.getByPlaceholderText('usuario@veloxrent.pe'), { target: { value: 'x@veloxrent.pe' } });
    await chooseRole('Front Office');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar usuario' }));

    expect(await screen.findByText(/El rol elegido ya no está disponible/)).toBeInTheDocument();
  });
});
