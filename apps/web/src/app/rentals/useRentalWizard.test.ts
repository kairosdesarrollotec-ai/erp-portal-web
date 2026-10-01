import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RentalResponse } from './rentals-client';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// ── mocks de infraestructura ────────────────────────────────────────────────

const getIdTokenMock = vi.fn().mockResolvedValue('fake-id-token');

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: getIdTokenMock },
  }),
}));

// useParams necesita estar dentro de un Router para leer los parámetros;
// para el hook test usamos un mock directo para mantenerlo simple y aislado.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'rent-1' }),
  };
});

const getRentalMock = vi.fn();
vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    getRental: (...args: unknown[]) => getRentalMock(...args),
  };
});

const useWorkContextForRentalsMock = vi.fn();
vi.mock('./useWorkContextForRentals', () => ({
  useWorkContextForRentals: () => useWorkContextForRentalsMock(),
}));

// ── fixtures ────────────────────────────────────────────────────────────────

const baseRental: RentalResponse = {
  id: 'rent-1',
  organizationId: 'org-1',
  operatingCompanyId: 'comp-1',
  branchId: 'branch-1',
  inquiryId: null,
  reservationId: null,
  customerId: 'cust-1',
  customerName: 'Maria Quispe',
  customerDocNumber: '12345678',
  vehicleId: 'veh-1',
  vehiclePlate: 'D0Y-704',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  planCode: 'NORMAL',
  status: 'DRAFT',
  startAt: '2026-10-01T09:00:00Z',
  expectedEndAt: '2026-10-05T09:00:00Z',
  alcoholTestResult: null,
  createdAt: '2026-10-01T00:00:00Z',
  createdBy: 'user-1',
  updatedAt: '2026-10-01T00:00:00Z',
  updatedBy: 'user-1',
  version: 1,
  etag: '"1"',
};

const baseContext = {
  companyId: 'c1',
  companyName: 'VeloxRent',
  branchId: 'b1',
  branchName: 'Sede Central',
};

/** Wrapper mínimo con MemoryRouter para que useNavigate/useLocation no fallen. */
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(MemoryRouter, { initialEntries: ['/alquileres/rent-1/entrega-01'] }, children);
}

// ── importación diferida del hook ────────────────────────────────────────────

async function getHook() {
  const { useRentalWizard } = await import('./useRentalWizard');
  return useRentalWizard;
}

// ── suite ───────────────────────────────────────────────────────────────────

describe('useRentalWizard', () => {
  beforeEach(() => {
    getRentalMock.mockReset();
    getIdTokenMock.mockReset();
    getIdTokenMock.mockResolvedValue('fake-id-token');
    useWorkContextForRentalsMock.mockReset();
  });

  // ── estado: carga mientras el contexto se resuelve ───────────────────────

  it('devuelve state LOADING mientras el contexto de trabajo está cargando', async () => {
    useWorkContextForRentalsMock.mockReturnValue({ context: null, loading: true });

    const useRentalWizard = await getHook();
    const { result } = renderHook(() => useRentalWizard(), { wrapper });

    expect(result.current.state).toBe('LOADING');
  });

  // ── estado: listo tras cargar el expediente ──────────────────────────────

  it('devuelve state READY y el rental cuando getRental resuelve', async () => {
    useWorkContextForRentalsMock.mockReturnValue({ context: baseContext, loading: false });
    getRentalMock.mockResolvedValue(baseRental);

    const useRentalWizard = await getHook();
    const { result } = renderHook(() => useRentalWizard(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('READY'));

    expect(result.current.rental).toEqual(baseRental);
    expect(result.current.id).toBe('rent-1');
    expect(result.current.context).toEqual(baseContext);
    expect(getRentalMock).toHaveBeenCalledWith('fake-id-token', 'rent-1', 'c1', 'b1');
  });

  // ── estado: error recuperable ────────────────────────────────────────────

  it('devuelve state RECOVERABLE_ERROR cuando getRental rechaza con un error genérico', async () => {
    useWorkContextForRentalsMock.mockReturnValue({ context: baseContext, loading: false });
    getRentalMock.mockRejectedValue(new Error('Network failure'));

    const useRentalWizard = await getHook();
    const { result } = renderHook(() => useRentalWizard(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('RECOVERABLE_ERROR'));
    expect(result.current.rental).toBeNull();
  });

  // ── estado: no encontrado ────────────────────────────────────────────────

  it('devuelve state NOT_FOUND cuando getRental lanza RentalApiError con status 404', async () => {
    const { RentalApiError } = await import('./rentals-client');
    useWorkContextForRentalsMock.mockReturnValue({ context: baseContext, loading: false });
    getRentalMock.mockRejectedValue(new RentalApiError(404));

    const useRentalWizard = await getHook();
    const { result } = renderHook(() => useRentalWizard(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('NOT_FOUND'));
  });

  // ── estado: error cuando no hay contexto ─────────────────────────────────

  it('devuelve state RECOVERABLE_ERROR cuando el contexto termina de cargar sin datos', async () => {
    useWorkContextForRentalsMock.mockReturnValue({ context: null, loading: false });

    const useRentalWizard = await getHook();
    const { result } = renderHook(() => useRentalWizard(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('RECOVERABLE_ERROR'));
    expect(getRentalMock).not.toHaveBeenCalled();
  });

  // ── getIdToken ────────────────────────────────────────────────────────────

  it('getIdToken delega en firebase.currentUser.getIdToken', async () => {
    useWorkContextForRentalsMock.mockReturnValue({ context: baseContext, loading: false });
    getRentalMock.mockResolvedValue(baseRental);

    const useRentalWizard = await getHook();
    const { result } = renderHook(() => useRentalWizard(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('READY'));

    let token: string | undefined;
    await act(async () => {
      token = await result.current.getIdToken();
    });
    expect(token).toBe('fake-id-token');
  });

  // ── setRental ─────────────────────────────────────────────────────────────

  it('setRental actualiza el rental expuesto por el hook', async () => {
    useWorkContextForRentalsMock.mockReturnValue({ context: baseContext, loading: false });
    getRentalMock.mockResolvedValue(baseRental);

    const useRentalWizard = await getHook();
    const { result } = renderHook(() => useRentalWizard(), { wrapper });

    await waitFor(() => expect(result.current.state).toBe('READY'));

    const updatedRental = { ...baseRental, status: 'VALIDATION', version: 2 };
    act(() => result.current.setRental(updatedRental as typeof baseRental));

    expect(result.current.rental).toEqual(updatedRental);
  });
});
