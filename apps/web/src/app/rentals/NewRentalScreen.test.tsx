import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NewRentalScreen } from './NewRentalScreen';
import { RentalCommandError } from './rentals-client';

const createRentalMock = vi.fn();
const createRentalFromReservationMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    createRental: (...args: unknown[]) => createRentalMock(...args),
    createRentalFromReservation: (...args: unknown[]) => createRentalFromReservationMock(...args),
  };
});

const workContext = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' };

function renderScreen(navState: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/alquileres/nuevo', state: { ...workContext, ...navState } }]}
    >
      <Routes>
        <Route path="/alquileres/nuevo" element={<NewRentalScreen />} />
        <Route path="/alquileres/:id/entrega-01" element={<div>etapa 1</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NewRentalScreen (ALQ-02)', () => {
  beforeEach(() => {
    createRentalMock.mockReset();
    createRentalFromReservationMock.mockReset();
  });

  it('deshabilita el boton cuando no hay origen (sin customerId+vehicleId ni reservationId)', () => {
    renderScreen();
    const btn = screen.getByRole('button', { name: 'Crear expediente' });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/Esta pantalla se abre desde una Consulta o Reserva/)).toBeInTheDocument();
  });

  it('muestra datos heredados desde reserva y habilita el boton', () => {
    renderScreen({ reservationId: 'res-1' });
    const heredados = screen.getAllByText(/heredado de la reserva/);
    expect(heredados.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Crear expediente' })).not.toBeDisabled();
  });

  it('muestra cliente y vehiculo cuando vienen desde consulta/directo', () => {
    renderScreen({ customerId: 'cust-1', customerName: 'Maria Quispe', vehicleId: 'veh-1', vehicleLabel: 'Toyota Hilux D0Y-704' });
    expect(screen.getByText('Maria Quispe')).toBeInTheDocument();
    expect(screen.getByText('Toyota Hilux D0Y-704')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear expediente' })).not.toBeDisabled();
  });

  it('llama a createRentalFromReservation cuando hay reservationId y navega a entrega-01', async () => {
    createRentalFromReservationMock.mockResolvedValue({ id: 'rent-new' });
    renderScreen({ reservationId: 'res-1' });

    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));

    await waitFor(() => expect(screen.getByText('etapa 1')).toBeInTheDocument());
    expect(createRentalFromReservationMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', 'res-1', undefined);
    expect(createRentalMock).not.toHaveBeenCalled();
  });

  it('llama a createRental cuando hay customerId+vehicleId y navega a entrega-01', async () => {
    createRentalMock.mockResolvedValue({ id: 'rent-new' });
    renderScreen({ customerId: 'cust-1', customerName: 'Maria Quispe', vehicleId: 'veh-1', vehicleLabel: 'Toyota Hilux' });

    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));

    await waitFor(() => expect(screen.getByText('etapa 1')).toBeInTheDocument());
    expect(createRentalMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', 'cust-1', 'veh-1', {
      planCode: undefined,
      startAt: undefined,
      expectedEndAt: undefined,
      inquiryId: undefined,
    });
    expect(createRentalFromReservationMock).not.toHaveBeenCalled();
  });

  it('muestra el mensaje de RentalCommandError cuando la API rechaza el comando', async () => {
    createRentalMock.mockRejectedValue(new RentalCommandError(422, { detail: 'Vehículo no disponible.' }));
    renderScreen({ customerId: 'cust-1', vehicleId: 'veh-1' });

    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));

    expect(await screen.findByText('Vehículo no disponible.')).toBeInTheDocument();
  });

  it('muestra mensaje generico cuando el error no es RentalCommandError', async () => {
    createRentalMock.mockRejectedValue(new Error('Network error'));
    renderScreen({ customerId: 'cust-1', vehicleId: 'veh-1' });

    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));

    expect(await screen.findByText('No pudimos crear el expediente de alquiler.')).toBeInTheDocument();
  });

  it('muestra "Creando…" y deshabilita el boton mientras procesa', async () => {
    let resolve: (v: { id: string }) => void;
    createRentalMock.mockReturnValue(new Promise((res) => { resolve = res; }));
    renderScreen({ customerId: 'cust-1', vehicleId: 'veh-1' });

    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Creando…' })).toBeDisabled());
    resolve!({ id: 'rent-new' });
    await waitFor(() => expect(screen.getByText('etapa 1')).toBeInTheDocument());
  });
});
