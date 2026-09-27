import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminUsersScreen } from './AdminUsersScreen';

const listOrganizationUsersMock = vi.fn();
const assignUserToCompanyMock = vi.fn();
const deactivateAssignmentMock = vi.fn();

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
  };
});

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
        role: 'FRONT_OFFICE',
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
        role: 'FRONT_OFFICE',
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
    fireEvent.click(screen.getByText('Agregar usuario'));

    await waitFor(() => {
      expect(assignUserToCompanyMock).toHaveBeenCalledWith('fake-id-token', {
        companyId: 'c1',
        branchId: 'b1',
        targetEmail: 'nuevo@veloxrent.pe',
        targetCompanyId: 'c1',
        targetBranchId: 'b1',
        targetRole: 'FRONT_OFFICE',
        initialPassword: 'Temporal@123',
      });
    });
    expect(await screen.findByText('nuevo@veloxrent.pe')).toBeInTheDocument();
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
          role: 'FRONT_OFFICE',
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
          role: 'FRONT_OFFICE',
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
});
