import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RolePermissionMatrixScreen } from './RolePermissionMatrixScreen';

const getRolePermissionMatrixMock = vi.fn();
const saveRolePermissionMatrixMock = vi.fn();

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

const CATALOG = [
  { module: 'RESERVATION' as const, action: 'REGISTER_PAYMENT', label: 'Reserva: registrar pago' },
  { module: 'RESERVATION' as const, action: 'CONFIRM', label: 'Reserva: confirmar' },
];

function baseMatrix() {
  return {
    version: 2,
    actionCatalog: CATALOG,
    entries: [
      { role: 'FRONT_OFFICE', module: 'RESERVATION', action: 'REGISTER_PAYMENT', allowed: false },
      { role: 'FRONT_OFFICE', module: 'RESERVATION', action: 'CONFIRM', allowed: true },
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
    getRolePermissionMatrixMock.mockReset();
    saveRolePermissionMatrixMock.mockReset();
  });

  it('muestra la matriz de roles y acciones con el estado vigente de cada celda', async () => {
    getRolePermissionMatrixMock.mockResolvedValue(baseMatrix());
    renderScreen();

    expect(await screen.findByText('FRONT_OFFICE')).toBeInTheDocument();
    const registerPaymentCheckbox = screen.getByRole('checkbox', { name: 'FRONT_OFFICE: Reserva: registrar pago' });
    const confirmCheckbox = screen.getByRole('checkbox', { name: 'FRONT_OFFICE: Reserva: confirmar' });
    expect(registerPaymentCheckbox).not.toBeChecked();
    expect(confirmCheckbox).toBeChecked();
  });

  it('marca en conflicto una combinacion incompatible y bloquea el guardado', async () => {
    getRolePermissionMatrixMock.mockResolvedValue(baseMatrix());
    renderScreen();

    const registerPaymentCheckbox = await screen.findByRole('checkbox', { name: 'FRONT_OFFICE: Reserva: registrar pago' });
    fireEvent.click(registerPaymentCheckbox);

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('guarda los cambios cuando no hay conflictos', async () => {
    getRolePermissionMatrixMock.mockResolvedValue(baseMatrix());
    saveRolePermissionMatrixMock.mockResolvedValue(baseMatrix());
    renderScreen();

    const confirmCheckbox = await screen.findByRole('checkbox', { name: 'FRONT_OFFICE: Reserva: confirmar' });
    fireEvent.click(confirmCheckbox);

    const saveButton = screen.getByRole('button', { name: 'Guardar cambios' });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveRolePermissionMatrixMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', expect.any(Array));
    });
  });

  it('muestra el error recuperable si la carga falla', async () => {
    getRolePermissionMatrixMock.mockRejectedValue(new Error('network'));
    renderScreen();

    expect(await screen.findByText(/No pudimos cargar la matriz de permisos/)).toBeInTheDocument();
  });
});
