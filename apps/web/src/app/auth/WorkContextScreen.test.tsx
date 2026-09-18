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

const { WorkContextApiError } = vi.hoisted(() => {
  class WorkContextApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { WorkContextApiError };
});

vi.mock('./work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
  selectWorkContext: (...args: unknown[]) => selectWorkContextMock(...args),
  WorkContextApiError,
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

  it('si el backend rechaza la seleccion, se queda en la lista sin avanzar y explica que paso (hallazgo de revision)', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue(assignments);
    selectWorkContextMock.mockRejectedValue(new WorkContextApiError('403', 403));
    renderScreen();

    const card = await screen.findByRole('button', { name: /Ingresar a VeloxRent, Ayacucho/ });
    fireEvent.click(card);

    await waitFor(() => {
      expect(selectWorkContextMock).toHaveBeenCalled();
    });
    expect(await screen.findByText('¿Dónde vas a trabajar hoy?')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/ya no está disponible/);
  });

  it('si la seleccion falla por red, muestra un mensaje de reintentar distinto del rechazo 403', async () => {
    getWorkContextAssignmentsMock.mockResolvedValue(assignments);
    selectWorkContextMock.mockRejectedValue(new Error('network offline'));
    renderScreen();

    const card = await screen.findByRole('button', { name: /Ingresar a VeloxRent, Ayacucho/ });
    fireEvent.click(card);

    expect(await screen.findByRole('alert')).toHaveTextContent(/problema de conexión/);
  });

  // Hallazgo de revision (finding #1): un fallo tecnico (401/403/5xx, red,
  // respuesta invalida) nunca debe presentarse como "no tienes ninguna
  // asignacion" (EMPTY) - es un estado distinto, reintentable.
  it.each([
    ['401 (token invalido/expirado)', new WorkContextApiError('401', 401)],
    ['403 (sin permiso)', new WorkContextApiError('403', 403)],
    ['500 (backend caido)', new WorkContextApiError('500', 500)],
    ['fallo de red', new Error('network offline')],
    ['respuesta con forma invalida', new WorkContextApiError('respuesta invalida', 200)],
  ])('RECOVERABLE_ERROR: %s nunca se presenta como "sin asignaciones"', async (_label, error) => {
    getWorkContextAssignmentsMock.mockRejectedValue(error);
    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar/);
    expect(screen.queryByText(/No tienes ninguna empresa o sede asignada/)).not.toBeInTheDocument();
  });

  it('RECOVERABLE_ERROR: "Reintentar" vuelve a consultar las asignaciones', async () => {
    getWorkContextAssignmentsMock.mockRejectedValueOnce(new WorkContextApiError('500', 500));
    renderScreen();

    const retryButton = await screen.findByRole('button', { name: 'Reintentar' });
    getWorkContextAssignmentsMock.mockResolvedValueOnce(assignments);
    fireEvent.click(retryButton);

    expect(await screen.findByText('¿Dónde vas a trabajar hoy?')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /Ingresar a VeloxRent, Ayacucho/ }),
    ).toBeInTheDocument();
    expect(getWorkContextAssignmentsMock).toHaveBeenCalledTimes(2);
  });
});
