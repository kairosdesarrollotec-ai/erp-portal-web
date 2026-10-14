import { describe, it, expect, vi, beforeEach } from 'vitest';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RolePermissionMatrixScreen } from './RolePermissionMatrixScreen';
import { PermissionCommandError } from './permissions-client';
import { RoleCommandError } from './roles-client';

const getRolePermissionMatrixMock = vi.fn();
const saveRolePermissionMatrixMock = vi.fn();
const listRolesMock = vi.fn();
const createRoleMock = vi.fn();
const renameRoleMock = vi.fn();
const deactivateRoleMock = vi.fn();
const getOrganizationCompaniesMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'admin@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./permissions-client', async () => {
  const actual = await vi.importActual<typeof import('./permissions-client')>('./permissions-client');
  return {
    ...actual,
    getRolePermissionMatrix: (...args: unknown[]) => getRolePermissionMatrixMock(...args),
    saveRolePermissionMatrix: (...args: unknown[]) => saveRolePermissionMatrixMock(...args),
  };
});

vi.mock('./roles-client', async () => {
  const actual = await vi.importActual<typeof import('./roles-client')>('./roles-client');
  return {
    ...actual,
    listRoles: (...args: unknown[]) => listRolesMock(...args),
    createRole: (...args: unknown[]) => createRoleMock(...args),
    renameRole: (...args: unknown[]) => renameRoleMock(...args),
    deactivateRole: (...args: unknown[]) => deactivateRoleMock(...args),
  };
});

vi.mock('./admin-users-client', async () => {
  const actual = await vi.importActual<typeof import('./admin-users-client')>('./admin-users-client');
  return {
    ...actual,
    getOrganizationCompanies: (...args: unknown[]) => getOrganizationCompaniesMock(...args),
  };
});

const CATALOG = [
  { module: 'RESERVATION' as const, action: 'REGISTER_PAYMENT', label: 'Reserva: registrar pago' },
  { module: 'RESERVATION' as const, action: 'CONFIRM', label: 'Reserva: confirmar' },
];

const FRONT = { id: 'role-fo', name: 'Front Office', key: 'FRONT_OFFICE', isSystem: true, active: true, version: 2, assignmentCount: 3 };
const PLATFORM = { id: 'role-pa', name: 'Administrador de Plataforma', key: 'PLATFORM_ADMIN', isSystem: true, active: true, version: 1, assignmentCount: 1 };
const CUSTOM = { id: 'role-custom', name: 'Supervisor de flota', key: null, isSystem: false, active: true, version: 5, assignmentCount: 0 };
const INACTIVE = { id: 'role-old', name: 'Rol obsoleto', key: null, isSystem: false, active: false, version: 4, assignmentCount: 0 };

function baseMatrix() {
  return {
    version: 2,
    scope: { companyId: null, branchId: null },
    actionCatalog: CATALOG,
    // El rol personalizado (CUSTOM) no tiene entradas todavia: nace sin permisos.
    entries: [
      { roleId: 'role-fo', module: 'RESERVATION', action: 'REGISTER_PAYMENT', allowed: false },
      { roleId: 'role-fo', module: 'RESERVATION', action: 'CONFIRM', allowed: true },
      { roleId: 'role-pa', module: 'RESERVATION', action: 'REGISTER_PAYMENT', allowed: true },
      { roleId: 'role-pa', module: 'RESERVATION', action: 'CONFIRM', allowed: false },
      // Entrada de un rol desactivado: no debe aparecer ni enviarse.
      { roleId: 'role-old', module: 'RESERVATION', action: 'CONFIRM', allowed: true },
    ],
  };
}

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/admin/permisos', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path="/admin/permisos" element={<RolePermissionMatrixScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RolePermissionMatrixScreen (ADM-02)', () => {
  beforeEach(() => {
    getRolePermissionMatrixMock.mockReset().mockResolvedValue(baseMatrix());
    saveRolePermissionMatrixMock.mockReset();
    listRolesMock.mockReset().mockResolvedValue([FRONT, PLATFORM, CUSTOM, INACTIVE]);
    createRoleMock.mockReset();
    renameRoleMock.mockReset();
    deactivateRoleMock.mockReset();
    getOrganizationCompaniesMock.mockReset().mockResolvedValue([
      {
        companyId: 'c1',
        companyName: 'VeloxRent',
        branches: [{ branchId: 'b1', branchName: 'Sede Central' }],
      },
    ]);
  });

  // --- matriz ----------------------------------------------------------------

  it('muestra una fila por rol activo (incluye el rol nuevo sin permisos) y el estado vigente de cada celda', async () => {
    renderScreen();

    const matrix = (await screen.findByRole('table')) as HTMLElement;
    expect(within(matrix).getByText('Front Office')).toBeInTheDocument();
    expect(within(matrix).getByText('Supervisor de flota')).toBeInTheDocument();
    expect(within(matrix).queryByText('Rol obsoleto')).toBeNull();

    expect(screen.getByRole('checkbox', { name: 'Front Office: Reserva: registrar pago' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Front Office: Reserva: confirmar' })).toBeChecked();
    // Rol nuevo: todo denegado por defecto.
    expect(screen.getByRole('checkbox', { name: 'Supervisor de flota: Reserva: confirmar' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Supervisor de flota: Reserva: registrar pago' })).not.toBeChecked();
  });

  it('la fila de PLATFORM_ADMIN es de solo lectura', async () => {
    renderScreen();
    const cell = await screen.findByRole('checkbox', { name: 'Administrador de Plataforma: Reserva: registrar pago' });
    expect(cell).toBeDisabled();
    expect(cell).toBeChecked();
    expect(screen.getByText('Solo lectura')).toBeInTheDocument();
  });

  it('marca en conflicto una combinacion incompatible y bloquea el guardado', async () => {
    renderScreen();

    const registerPaymentCheckbox = await screen.findByRole('checkbox', { name: 'Front Office: Reserva: registrar pago' });
    fireEvent.click(registerPaymentCheckbox);

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/segregación de funciones/);
    expect(registerPaymentCheckbox.closest('td')).toHaveAttribute('title', expect.stringMatching(/segregación de funciones/));
  });

  it('guarda la matriz completa por roleId (todos los roles activos x acciones del catalogo) en el ambito elegido', async () => {
    saveRolePermissionMatrixMock.mockResolvedValue(baseMatrix());
    renderScreen();

    const confirmCheckbox = await screen.findByRole('checkbox', { name: 'Supervisor de flota: Reserva: confirmar' });
    fireEvent.click(confirmCheckbox);

    const saveButton = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() => expect(saveRolePermissionMatrixMock).toHaveBeenCalledTimes(1));
    const [token, companyId, branchId, entries, scope] = saveRolePermissionMatrixMock.mock.calls[0];
    expect(token).toBe('fake-id-token');
    expect([companyId, branchId]).toEqual(['c1', 'b1']);
    // 3 roles activos x 2 acciones = 6 entradas, ninguna del rol desactivado.
    expect(entries).toHaveLength(6);
    expect(entries.some((e: { roleId: string }) => e.roleId === 'role-old')).toBe(false);
    expect(entries).toContainEqual({ roleId: 'role-custom', module: 'RESERVATION', action: 'CONFIRM', allowed: true });
    expect(entries).toContainEqual({ roleId: 'role-custom', module: 'RESERVATION', action: 'REGISTER_PAYMENT', allowed: false });
    // PLATFORM_ADMIN viaja tal como llego (no editable).
    expect(entries).toContainEqual({ roleId: 'role-pa', module: 'RESERVATION', action: 'REGISTER_PAYMENT', allowed: true });
    // Ambito por defecto: toda la organizacion.
    expect(scope).toEqual({ companyId: null, branchId: null });
  });

  it('volver a marcar la celda al valor vigente deja de contar como cambio', async () => {
    renderScreen();
    const cell = await screen.findByRole('checkbox', { name: 'Supervisor de flota: Reserva: confirmar' });
    fireEvent.click(cell);
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).not.toBeDisabled();
    fireEvent.click(cell);
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('permite guardar con ámbito de sede (selector opcional, "Toda la organización" por defecto)', async () => {
    saveRolePermissionMatrixMock.mockResolvedValue(baseMatrix());
    renderScreen();

    const scopeSelect = (await screen.findByLabelText('Ámbito de la nueva versión')) as HTMLSelectElement;
    expect(scopeSelect.value).toBe('org');
    await within(scopeSelect).findByRole('option', { name: 'Solo la sede Sede Central' });
    fireEvent.change(scopeSelect, { target: { value: 'branch:c1:b1' } });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Supervisor de flota: Reserva: confirmar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(saveRolePermissionMatrixMock).toHaveBeenCalled());
    expect(saveRolePermissionMatrixMock.mock.calls[0][4]).toEqual({ companyId: 'c1', branchId: 'b1' });
  });

  it('muestra el error del back al guardar (segregacion de funciones rechazada por el servidor)', async () => {
    saveRolePermissionMatrixMock.mockRejectedValue(new PermissionCommandError(409, { code: 'INCOMPATIBLE_PERMISSION_COMBINATION' }));
    renderScreen();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Supervisor de flota: Reserva: confirmar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/dos permisos incompatibles/);
  });

  it('muestra el error recuperable si la carga falla', async () => {
    getRolePermissionMatrixMock.mockRejectedValue(new Error('network'));
    renderScreen();

    expect(await screen.findByText(/No pudimos cargar la matriz de permisos/)).toBeInTheDocument();
  });

  it('si falla la lista de roles tambien muestra el error recuperable', async () => {
    listRolesMock.mockRejectedValue(new Error('network'));
    renderScreen();

    expect(await screen.findByText(/No pudimos cargar la matriz de permisos/)).toBeInTheDocument();
  });

  // --- gestion de roles ------------------------------------------------------

  it('crea un rol: llama al back con el nombre, recarga la lista y avisa que nace sin permisos', async () => {
    createRoleMock.mockResolvedValue({ ...CUSTOM, id: 'role-new', name: 'Recepción' });
    renderScreen();

    fireEvent.change(await screen.findByLabelText('Nombre del nuevo rol'), { target: { value: '  Recepción ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear rol' }));

    await waitFor(() => expect(createRoleMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', 'Recepción'));
    expect(await screen.findByRole('status')).toHaveTextContent(/Recepción.*sin permisos/);
    expect(listRolesMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('muestra ROLE_NAME_TAKEN y ROLE_NAME_INVALID junto al campo del nombre', async () => {
    createRoleMock.mockRejectedValueOnce(new RoleCommandError(409, { code: 'ROLE_NAME_TAKEN' }));
    renderScreen();

    const input = await screen.findByLabelText('Nombre del nuevo rol');
    fireEvent.change(input, { target: { value: 'Front Office' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear rol' }));

    expect(await screen.findByText('Ya existe un rol con ese nombre. Elige otro.')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'new-role-name-error');

    createRoleMock.mockRejectedValueOnce(new RoleCommandError(400, { code: 'ROLE_NAME_INVALID' }));
    fireEvent.change(input, { target: { value: 'x'.repeat(61).slice(0, 60) } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear rol' }));
    expect(await screen.findByText(/El nombre del rol no es válido/)).toBeInTheDocument();
  });

  it('renombra en línea con If-Match (version del rol) y recarga', async () => {
    renameRoleMock.mockResolvedValue({ ...CUSTOM, name: 'Jefe de flota', version: 6 });
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Renombrar rol Supervisor de flota' }));
    const input = screen.getByLabelText('Nuevo nombre del rol Supervisor de flota');
    fireEvent.change(input, { target: { value: 'Jefe de flota' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }));

    await waitFor(() =>
      expect(renameRoleMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', expect.objectContaining({ id: 'role-custom', version: 5 }), 'Jefe de flota'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Rol renombrado a «Jefe de flota»');
  });

  it('ante 412 VERSION_CONFLICT al renombrar recarga la lista y avisa', async () => {
    renameRoleMock.mockRejectedValue(new RoleCommandError(412, { code: 'VERSION_CONFLICT' }));
    renderScreen();
    await screen.findByRole('table');
    const callsBefore = listRolesMock.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Renombrar rol Supervisor de flota' }));
    fireEvent.change(screen.getByLabelText('Nuevo nombre del rol Supervisor de flota'), { target: { value: 'Otro nombre' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }));

    expect(await screen.findByText(/Otra persona modificó este rol/)).toBeInTheDocument();
    await waitFor(() => expect(listRolesMock.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('un 412 sin codigo en el cuerpo tambien se trata como VERSION_CONFLICT', () => {
    const error = new RoleCommandError(412, null);
    expect(error.code).toBe('VERSION_CONFLICT');
    expect(error.message).toMatch(/Otra persona modificó/);
  });

  it('desactiva un rol solo tras confirmar y lo quita de la matriz', async () => {
    deactivateRoleMock.mockResolvedValue({ ...CUSTOM, active: false, version: 6 });
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar rol Supervisor de flota' }));
    expect(deactivateRoleMock).not.toHaveBeenCalled();

    listRolesMock.mockResolvedValue([FRONT, PLATFORM]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desactivación del rol Supervisor de flota' }));

    await waitFor(() =>
      expect(deactivateRoleMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', expect.objectContaining({ id: 'role-custom', version: 5 })),
    );
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: /Supervisor de flota/ })).toBeNull());
    expect(screen.getByRole('status')).toHaveTextContent('Rol «Supervisor de flota» desactivado.');
  });

  it('explica ROLE_HAS_ACTIVE_ASSIGNMENTS y LAST_ADMINISTRATOR_ROLE en lenguaje claro', async () => {
    deactivateRoleMock.mockRejectedValueOnce(new RoleCommandError(409, { code: 'ROLE_HAS_ACTIVE_ASSIGNMENTS' }));
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar rol Front Office' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desactivación del rol Front Office' }));
    expect(await screen.findByText(/todavía hay usuarios con este rol/)).toBeInTheDocument();

    deactivateRoleMock.mockRejectedValueOnce(new RoleCommandError(409, { code: 'LAST_ADMINISTRATOR_ROLE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar rol Front Office' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desactivación del rol Front Office' }));
    expect(await screen.findByText(/último rol con permisos para administrar usuarios y permisos/)).toBeInTheDocument();
  });

  it('PLATFORM_ADMIN no ofrece renombrar ni desactivar', async () => {
    renderScreen();
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: /Renombrar rol Administrador de Plataforma/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Desactivar rol Administrador de Plataforma/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Renombrar rol Front Office' })).toBeInTheDocument();
  });

  it('las ediciones sin guardar de la matriz se conservan al crear un rol', async () => {
    createRoleMock.mockResolvedValue({ ...CUSTOM, id: 'role-new', name: 'Recepción' });
    renderScreen();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Supervisor de flota: Reserva: confirmar' }));
    listRolesMock.mockResolvedValue([FRONT, PLATFORM, CUSTOM, { ...CUSTOM, id: 'role-new', name: 'Recepción' }]);
    fireEvent.change(screen.getByLabelText('Nombre del nuevo rol'), { target: { value: 'Recepción' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear rol' }));

    await screen.findByRole('checkbox', { name: 'Recepción: Reserva: confirmar' });
    expect(screen.getByRole('checkbox', { name: 'Supervisor de flota: Reserva: confirmar' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Recepción: Reserva: confirmar' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).not.toBeDisabled();
  });
});
