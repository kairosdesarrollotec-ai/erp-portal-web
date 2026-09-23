import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReservationDepositPolicyScreen } from './ReservationDepositPolicyScreen';

const getReservationDepositPolicyMock = vi.fn();
const updateReservationDepositPolicyMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'admin@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./parameters-client', async () => {
  const actual = await vi.importActual<typeof import('./parameters-client')>('./parameters-client');
  return {
    ...actual,
    getReservationDepositPolicy: (...args: unknown[]) => getReservationDepositPolicyMock(...args),
    updateReservationDepositPolicy: (...args: unknown[]) => updateReservationDepositPolicyMock(...args),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/admin/parametros', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path="/admin/parametros" element={<ReservationDepositPolicyScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReservationDepositPolicyScreen (ADM-03)', () => {
  beforeEach(() => {
    getReservationDepositPolicyMock.mockReset();
    updateReservationDepositPolicyMock.mockReset();
  });

  it('muestra el monto vigente y el historial', async () => {
    getReservationDepositPolicyMock.mockResolvedValue({
      current: { version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null },
      history: [{ version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null }],
    });
    renderScreen();

    expect((await screen.findAllByText('S/ 300.00')).length).toBeGreaterThan(0);
    expect(screen.getByText(/valor por defecto/)).toBeInTheDocument();
  });

  it('cambia el monto pasando por el paso de confirmacion', async () => {
    getReservationDepositPolicyMock
      .mockResolvedValueOnce({
        current: { version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null },
        history: [{ version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null }],
      })
      .mockResolvedValueOnce({
        current: { version: 2, amount: '350.00', currency: 'PEN', effectiveFrom: '2026-09-23T12:00:00.000Z' },
        history: [
          { version: 2, amount: '350.00', currency: 'PEN', effectiveFrom: '2026-09-23T12:00:00.000Z' },
          { version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null },
        ],
      });
    updateReservationDepositPolicyMock.mockResolvedValue({ version: 2, amount: '350.00', currency: 'PEN', effectiveFrom: '2026-09-23T12:00:00.000Z' });
    renderScreen();

    await screen.findAllByText('S/ 300.00');
    fireEvent.click(screen.getByText('Cambiar'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '350.00' } });
    fireEvent.click(screen.getByText('Continuar'));

    expect(screen.getByText(/Vas a cambiar el monto de reserva/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirmar cambio'));

    await waitFor(() => {
      expect(updateReservationDepositPolicyMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', '350.00', 'PEN');
    });
    expect((await screen.findAllByText('S/ 350.00')).length).toBeGreaterThan(0);
  });

  it('muestra el error recuperable si la carga falla', async () => {
    getReservationDepositPolicyMock.mockRejectedValue(new Error('network'));
    renderScreen();

    expect(await screen.findByText(/No pudimos cargar los parámetros/)).toBeInTheDocument();
  });
});
