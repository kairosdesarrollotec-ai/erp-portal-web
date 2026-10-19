import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RolePermissionMatrixScreen } from './RolePermissionMatrixScreen';
import { PermissionCommandError } from './permissions-client';

/**
 * ADM-02 punto 10 / SEC-F4: guardar la matriz exige MFA reciente. Integracion
 * pantalla + useMfaStepUp con Firebase simulado.
 */
const getRolePermissionMatrixMock = vi.fn();
const saveRolePermissionMatrixMock = vi.fn();
const listRolesMock = vi.fn();
const reauthMock = vi.fn();
const resolveSignInMock = vi.fn();
const getIdTokenMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'admin@veloxrent.pe', getIdToken: (...args: unknown[]) => getIdTokenMock(...args) },
  }),
}));
vi.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: (email: string, password: string) => ({ email, password }) },
  reauthenticateWithCredential: (...args: unknown[]) => reauthMock(...args),
  getMultiFactorResolver: () => ({
    hints: [{ uid: 'totp-uid', factorId: 'totp' }],
    resolveSignIn: (...args: unknown[]) => resolveSignInMock(...args),
  }),
  TotpMultiFactorGenerator: { FACTOR_ID: 'totp', assertionForSignIn: () => 'assertion' },
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
  return { ...actual, listRoles: (...args: unknown[]) => listRolesMock(...args) };
});
vi.mock('./admin-users-client', async () => {
  const actual = await vi.importActual<typeof import('./admin-users-client')>('./admin-users-client');
  return { ...actual, getOrganizationCompanies: vi.fn().mockResolvedValue([]) };
});

const FRONT = { id: 'role-fo', name: 'Front Office', key: 'FRONT_OFFICE', isSystem: true, active: true, version: 2, assignmentCount: 3 };
const matrix = () => ({
  version: 2,
  scope: { companyId: null, branchId: null },
  actionCatalog: [{ module: 'RESERVATION' as const, action: 'CONFIRM', label: 'Reserva: confirmar' }],
  entries: [{ roleId: 'role-fo', module: 'RESERVATION', action: 'CONFIRM', allowed: false }],
});
const mfaRequired = () => new PermissionCommandError(403, { code: 'MFA_RECENT_REQUIRED', detail: 'x' });

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

async function editAndSave() {
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Front Office: Reserva: confirmar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
}

function fillChallenge(code: string, password: string) {
  fireEvent.change(screen.getByTestId('mfa-password'), { target: { value: password } });
  [...code].forEach((digit, i) => fireEvent.change(screen.getByTestId(`mfa-digit-${i}`), { target: { value: digit } }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
}

describe('ADM-02 - MFA reciente al guardar (SEC-F4)', () => {
  beforeEach(() => {
    getRolePermissionMatrixMock.mockReset().mockResolvedValue(matrix());
    saveRolePermissionMatrixMock.mockReset();
    listRolesMock.mockReset().mockResolvedValue([FRONT]);
    reauthMock.mockReset().mockRejectedValue({ code: 'auth/multi-factor-auth-required' });
    resolveSignInMock.mockReset().mockResolvedValue({});
    getIdTokenMock.mockReset().mockImplementation(async (force?: boolean) => (force ? 'fresh-token' : 'old-token'));
  });

  it('si el back pide MFA reciente abre el reto, reautentica y reintenta con el token nuevo', async () => {
    saveRolePermissionMatrixMock.mockRejectedValueOnce(mfaRequired()).mockResolvedValueOnce(matrix());
    renderScreen();
    await editAndSave();

    expect(await screen.findByRole('heading', { name: 'Confirma tu identidad' })).toBeInTheDocument();
    fillChallenge('123456', 'secreto');

    await waitFor(() => expect(saveRolePermissionMatrixMock).toHaveBeenCalledTimes(2));
    expect(saveRolePermissionMatrixMock.mock.calls[0][0]).toBe('old-token');
    expect(saveRolePermissionMatrixMock.mock.calls[1][0]).toBe('fresh-token');
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Confirma tu identidad' })).toBeNull());
  });

  it('si se cancela el reto NO se guarda y se explica', async () => {
    saveRolePermissionMatrixMock.mockRejectedValueOnce(mfaRequired());
    renderScreen();
    await editAndSave();

    await screen.findByRole('heading', { name: 'Confirma tu identidad' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Cerrar' })[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent('Verificación cancelada');
    expect(saveRolePermissionMatrixMock).toHaveBeenCalledTimes(1);
  });

  it('con contrasena incorrecta el reto sigue abierto y no se reintenta el guardado', async () => {
    saveRolePermissionMatrixMock.mockRejectedValueOnce(mfaRequired());
    reauthMock.mockRejectedValue({ code: 'auth/invalid-credential' });
    renderScreen();
    await editAndSave();
    await screen.findByRole('heading', { name: 'Confirma tu identidad' });
    fillChallenge('123456', 'mala');

    expect(await screen.findByText('Contraseña incorrecta. Verifica e intenta de nuevo.')).toBeInTheDocument();
    expect(saveRolePermissionMatrixMock).toHaveBeenCalledTimes(1);
  });

  it('si tras reautenticar el back sigue rechazando por MFA, muestra el error y no entra en bucle', async () => {
    saveRolePermissionMatrixMock.mockRejectedValue(mfaRequired());
    renderScreen();
    await editAndSave();
    await screen.findByRole('heading', { name: 'Confirma tu identidad' });
    fillChallenge('123456', 'secreto');

    expect(await screen.findByText(/segundo factor reciente/)).toBeInTheDocument();
    expect(saveRolePermissionMatrixMock).toHaveBeenCalledTimes(2);
  });

  it('un guardado que ya cumple MFA reciente no abre ningun reto', async () => {
    saveRolePermissionMatrixMock.mockResolvedValue(matrix());
    renderScreen();
    await editAndSave();
    await waitFor(() => expect(saveRolePermissionMatrixMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('heading', { name: 'Confirma tu identidad' })).toBeNull();
  });
});
