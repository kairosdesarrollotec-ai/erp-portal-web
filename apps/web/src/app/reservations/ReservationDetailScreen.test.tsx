import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReservationDetailScreen } from './ReservationDetailScreen';
import { ReservationCommandError } from './reservations-client';

const getReservationMock = vi.fn();
const registerPaymentMock = vi.fn();
const registerDocumentsMock = vi.fn();
const confirmReservationMock = vi.fn();
const cancelReservationMock = vi.fn();
const getWorkContextAssignmentsMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./reservations-client', async () => {
  const actual = await vi.importActual<typeof import('./reservations-client')>('./reservations-client');
  return {
    ...actual,
    getReservation: (...args: unknown[]) => getReservationMock(...args),
    registerPayment: (...args: unknown[]) => registerPaymentMock(...args),
    registerDocuments: (...args: unknown[]) => registerDocumentsMock(...args),
    confirmReservation: (...args: unknown[]) => confirmReservationMock(...args),
    cancelReservation: (...args: unknown[]) => cancelReservationMock(...args),
  };
});

vi.mock('../auth/work-context-client', () => ({
  getWorkContextAssignments: (...args: unknown[]) => getWorkContextAssignmentsMock(...args),
}));

const oneAssignment = [
  { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
];

function buildReservation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'res-1',
    status: 'DRAFT',
    channelMode: 'PRESENCIAL',
    version: 1,
    customer: { id: 'c', name: 'Maria Quispe' },
    vehicle: { id: 'v', plate: 'D0Y-704', label: 'Toyota Hilux - D0Y-704' },
    startAt: '2026-09-20T14:00:00Z',
    endAt: '2026-09-22T14:00:00Z',
    requiredPayment: { amount: '300.00', currency: 'PEN' },
    requirements: { paymentValidatedAt: null, documentsCompletedAt: null },
    missingRequirements: ['PAYMENT_VALIDATION', 'DOCUMENTS_COMPLETE'],
    confirmedAt: null,
    createdAt: '2026-09-16T00:00:00Z',
    ...overrides,
  };
}

function renderScreen(state?: Record<string, unknown>) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/reservas/res-1',
          state: state ?? { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
        },
      ]}
    >
      <Routes>
        <Route path="/reservas/:id" element={<ReservationDetailScreen />} />
        <Route path="/reservas" element={<div>bandeja</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReservationDetailScreen (RES-04/RES-05)', () => {
  beforeEach(() => {
    getReservationMock.mockReset();
    registerPaymentMock.mockReset();
    registerDocumentsMock.mockReset();
    confirmReservationMock.mockReset();
    cancelReservationMock.mockReset();
    getWorkContextAssignmentsMock.mockReset().mockResolvedValue(oneAssignment);
  });

  it('muestra el checklist en borrador con badge "Borrador / No confirmada"', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    renderScreen();

    expect(await screen.findByText('Borrador / No confirmada')).toBeInTheDocument();
    expect(screen.getByText('Pago del monto de reserva vigente')).toBeInTheDocument();
    expect(screen.getByText('Documentos / contrato')).toBeInTheDocument();
  });

  // Finding #2: el control nunca sube archivos, solo marca el requisito.
  it('el control del checklist no implica una subida de archivo (finding #2)', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    renderScreen();

    await screen.findByText('Borrador / No confirmada');
    expect(screen.queryByText('Subir')).not.toBeInTheDocument();
    expect(screen.getAllByText('Marcar como validado').length).toBe(2);
    expect(screen.getByText(/No se sube ni se guarda ningún archivo todavía/)).toBeInTheDocument();
  });

  // Finding #4: no hay boton manual "Confirmar reserva" - se confirma sola.
  it('al completar ambos requisitos se confirma automaticamente, sin boton manual (finding #4)', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    registerPaymentMock.mockResolvedValue(
      buildReservation({ requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: null } }),
    );
    registerDocumentsMock.mockResolvedValue(
      buildReservation({
        requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: '2026-09-16T00:00:00Z' },
      }),
    );
    confirmReservationMock.mockResolvedValue(
      buildReservation({
        status: 'CONFIRMED',
        version: 2,
        requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: '2026-09-16T00:00:00Z' },
        confirmedAt: '2026-09-16T00:00:00Z',
      }),
    );
    renderScreen();

    await screen.findByText('Borrador / No confirmada');
    expect(screen.queryByText('Confirmar reserva')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Marcar como validado')[0]);
    await screen.findByText(/confirma automáticamente/);

    fireEvent.click(screen.getAllByText('Marcar como validado')[0]);

    await waitFor(() => expect(confirmReservationMock).toHaveBeenCalledWith('fake-id-token', 'res-1', 'c1', 'b1', 1));
    expect(await screen.findByText('Confirmada')).toBeInTheDocument();
    expect(screen.queryByText('Confirmar reserva')).not.toBeInTheDocument();
  });

  it('cuando esta confirmada, muestra el mensaje sin bloqueo exclusivo (ADR-008)', async () => {
    getReservationMock.mockResolvedValue(
      buildReservation({
        status: 'CONFIRMED',
        version: 2,
        requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: '2026-09-16T00:00:00Z' },
        confirmedAt: '2026-09-16T00:00:00Z',
      }),
    );
    renderScreen();

    expect(await screen.findByText('Confirmada')).toBeInTheDocument();
    expect(
      screen.getByText(/La disponibilidad se revalidará antes de confirmar el alquiler o la entrega/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/bloqueado exclusivamente/)).not.toBeInTheDocument();
  });

  // Finding #5: el motivo de cancelacion no puede quedar vacio.
  it('bloquea la cancelacion si el motivo esta vacio (finding #5)', async () => {
    getReservationMock.mockResolvedValue(
      buildReservation({
        status: 'CONFIRMED',
        version: 2,
        requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: '2026-09-16T00:00:00Z' },
        confirmedAt: '2026-09-16T00:00:00Z',
      }),
    );
    renderScreen();

    fireEvent.click(await screen.findByText('Cancelar por cambio solicitado'));
    const confirmCancelButton = screen.getByText('Confirmar cancelación');
    expect(confirmCancelButton).toBeDisabled();

    fireEvent.click(confirmCancelButton);
    expect(cancelReservationMock).not.toHaveBeenCalled();

    const textarea = screen.getByPlaceholderText('Motivo del cambio solicitado');
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.blur(textarea);
    expect(await screen.findByText(/Escribe el motivo del cambio solicitado/)).toBeInTheDocument();
    expect(confirmCancelButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Motivo del cambio solicitado'), {
      target: { value: 'El cliente cambió de planes' },
    });
    cancelReservationMock.mockResolvedValue(buildReservation({ status: 'CANCELLED', version: 3 }));
    expect(confirmCancelButton).not.toBeDisabled();
    fireEvent.click(confirmCancelButton);

    await waitFor(() =>
      expect(cancelReservationMock).toHaveBeenCalledWith(
        'fake-id-token',
        'res-1',
        'c1',
        'b1',
        2,
        'CUSTOMER_REQUESTED_CHANGE',
        'El cliente cambió de planes',
      ),
    );
  });

  // Finding #6: mientras una mutacion esta en curso, TODOS los controles
  // de mutacion se deshabilitan, no solo el que la inicio.
  it('deshabilita todos los controles de mutacion mientras hay una en curso (finding #6)', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    let resolvePayment: (value: unknown) => void = () => {};
    registerPaymentMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePayment = resolve;
      }),
    );
    renderScreen();

    await screen.findByText('Borrador / No confirmada');
    const buttons = screen.getAllByText('Marcar como validado');
    fireEvent.click(buttons[0]);

    await waitFor(() => expect(screen.getAllByText('Marcar como validado')[0]).toBeDisabled());
    expect(screen.getByText('Guardando…')).toBeDisabled();

    resolvePayment(buildReservation({ requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: null } }));
    await screen.findByText(/confirma automáticamente/);
  });

  // Finding #7: los errores 401/403/409/422/5xx se traducen a mensajes
  // distintos, y un 422 muestra los requisitos faltantes (missingRequirements).
  it('traduce un error 422 con missingRequirements a un mensaje claro (finding #7)', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    registerPaymentMock.mockRejectedValue(
      new ReservationCommandError(422, {
        code: 'REQUIREMENTS_INCOMPLETE',
        detail: 'Faltan requisitos',
        missingRequirements: ['DOCUMENTS_COMPLETE'],
      }),
    );
    renderScreen();

    await screen.findByText('Borrador / No confirmada');
    fireEvent.click(screen.getAllByText('Marcar como validado')[0]);

    expect(await screen.findByText(/Falta completar: Documentos \/ contrato/)).toBeInTheDocument();
  });

  it('traduce un error 403 a un mensaje de permisos/sesion (finding #7)', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    registerPaymentMock.mockRejectedValue(
      new ReservationCommandError(403, { code: 'FORBIDDEN', detail: 'forbidden' }),
    );
    renderScreen();

    await screen.findByText('Borrador / No confirmada');
    fireEvent.click(screen.getAllByText('Marcar como validado')[0]);

    expect(await screen.findByText(/No tienes permiso para hacer esto, o tu sesión expiró/)).toBeInTheDocument();
  });

  it('traduce un error 5xx a un mensaje de problema del servidor (finding #7)', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    registerPaymentMock.mockRejectedValue(
      new ReservationCommandError(500, { code: 'INTERNAL', detail: 'boom' }),
    );
    renderScreen();

    await screen.findByText('Borrador / No confirmada');
    fireEvent.click(screen.getAllByText('Marcar como validado')[0]);

    expect(await screen.findByText(/No pudimos completar la operación por un problema del servidor/)).toBeInTheDocument();
  });

  it('un 409 muestra el banner de conflicto de sincronizacion (finding #7)', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    registerPaymentMock.mockRejectedValue(
      new ReservationCommandError(409, { code: 'VEHICLE_NOT_AVAILABLE', detail: 'conflict' }),
    );
    renderScreen();

    await screen.findByText('Borrador / No confirmada');
    fireEvent.click(screen.getAllByText('Marcar como validado')[0]);

    expect(await screen.findByText(/Esta reserva cambió por otra operación mientras la veías/)).toBeInTheDocument();
  });

  // Finding #8: location.state manipulado/desactualizado se ignora.
  it('si location.state no coincide con ninguna asignacion real, se ignora y se resuelve con la asignacion real (finding #8)', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    renderScreen({ companyId: 'empresa-ajena', companyName: 'Otra Empresa', branchId: 'sede-ajena', branchName: 'Sede ajena' });

    await screen.findByText('Borrador / No confirmada');
    expect(getReservationMock).toHaveBeenCalledWith('fake-id-token', 'res-1', 'c1', 'b1');
  });
});
