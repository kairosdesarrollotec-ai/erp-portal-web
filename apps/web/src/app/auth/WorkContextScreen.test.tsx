import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkContextScreen } from './WorkContextScreen';

const getWorkContextAssignmentsMock = vi.fn();
const selectWorkContextMock = vi.fn();
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

vi.mock('./work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
  selectWorkContext: (...args: unknown[]) => selectWorkContextMock(...args),
}));

function renderScreen() {
  return render(
    <MemoryRouter>
      <WorkContextScreen />
    </MemoryRouter>,
  );
}

const assignments = [
  { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Ayacucho — Sede Central' },
  { companyId: 'c2', companyName: 'Casa del Auto', branchId: 'b2', branchName: 'Ayacucho — Sede Central' },
];

describe('WorkContextScreen (TR-05)', () => {
  beforeEach(() => {
    getWorkContextAssignmentsMock.mockReset();
    selectWorkContextMock.mockReset().mockResolvedValue(undefined);
    signOutMock.mockReset().mockResolvedValue(undefined);
  });

  it('lista las empresas/sedes autorizadas del usuario', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue(assignments);
    renderScreen();

    expect(await screen.findByText('¿Dónde vas a trabajar hoy?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingresar a VeloxRent, Ayacucho/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Ingresar a Casa del Auto, Ayacucho/ }),
    ).toBeInTheDocument();
  });

  it('al elegir una tarjeta, fija el contexto en el backend y avanza al tablero', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue(assignments);
    renderScreen();

    const card = await screen.findByRole('button', { name: /Ingresar a VeloxRent, Ayacucho/ });
    fireEvent.click(card);

    await waitFor(() => {
      expect(selectWorkContextMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
    });
  });

  it('EMPTY: muestra un mensaje si el usuario no tiene ninguna asignacion', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue([]);
    renderScreen();

    expect(
      await screen.findByText(/No tienes ninguna empresa o sede asignada todavía/),
    ).toBeInTheDocument();
  });

  it('si el backend rechaza la seleccion, se queda en la lista sin avanzar', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue(assignments);
    selectWorkContextMock.mockRejectedValue(new Error('403'));
    renderScreen();

    const card = await screen.findByRole('button', { name: /Ingresar a VeloxRent, Ayacucho/ });
    fireEvent.click(card);

    await waitFor(() => {
      expect(selectWorkContextMock).toHaveBeenCalled();
    });
    expect(await screen.findByText('¿Dónde vas a trabajar hoy?')).toBeInTheDocument();
  });
});
