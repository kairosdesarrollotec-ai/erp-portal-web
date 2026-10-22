import { describe, it, expect, vi, beforeEach } from 'vitest';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReservationDetailScreen } from './ReservationDetailScreen';
import { ReservationCommandError } from './reservations-client';
import { clearPermissions, setPermissions } from '../../test/permissions';

const getReservationMock = vi.fn();
const registerPaymentMock = vi.fn();
const registerDocumentsMock = vi.fn();
const confirmReservationMock = vi.fn();
const cancelReservationMock = vi.fn();

vi.mock('../shared/useRolePermissions', () => ({
  useRolePermissions: () => ({ can: () => true }),
}));

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

const requestReservationDocumentUploadSessionMock = vi.fn();
const uploadReservationFileToGcsMock = vi.fn();
const recordReservationDocumentMock = vi.fn();

vi.mock('./reservations-client', async () => {
  const actual = await vi.importActual<typeof import('./reservations-client')>('./reservations-client');
  return {
    ...actual,
    getReservation: (...args: unknown[]) => getReservationMock(...args),
    registerPayment: (...args: unknown[]) => registerPaymentMock(...args),
    registerDocuments: (...args: unknown[]) => registerDocumentsMock(...args),
    confirmReservation: (...args: unknown[]) => confirmReservationMock(...args),
    cancelReservation: (...args: unknown[]) => cancelReservationMock(...args),
    requestReservationDocumentUploadSession: (...args: unknown[]) => requestReservationDocumentUploadSessionMock(...args),
    uploadReservationFileToGcs: (...args: unknown[]) => uploadReservationFileToGcsMock(...args),
    recordReservationDocument: (...args: unknown[]) => recordReservationDocumentMock(...args),
  };
});

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

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/reservas/res-1', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
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
  });

  it('muestra el checklist en borrador con badge "Borrador / No confirmada"', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    renderScreen();

    expect(await screen.findByText('Borrador / No confirmada')).toBeInTheDocument();
    expect(screen.getByText('Pago del monto de reserva vigente')).toBeInTheDocument();
    expect(screen.getByText('Documentos / contrato')).toBeInTheDocument();
  });

  it('al completar ambos requisitos habilita "Confirmar reserva" y no antes', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    requestReservationDocumentUploadSessionMock.mockResolvedValue({
      uploadUrl: 'https://storage.googleapis.com/upload',
      objectUrl: 'gs://bucket/voucher.png',
      expiresAt: '2026-09-16T01:00:00Z',
    });
    uploadReservationFileToGcsMock.mockResolvedValue(undefined);
    recordReservationDocumentMock.mockResolvedValue(undefined);
    registerPaymentMock.mockResolvedValue(
      buildReservation({ requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: null } }),
    );
    const { container } = renderScreen();

    await screen.findByText('Borrador / No confirmada');
    expect(screen.queryByText('Confirmar reserva')).not.toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['voucher'], 'voucher.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText(/confirma automáticamente/)).toBeInTheDocument();
    expect(registerPaymentMock).toHaveBeenCalledWith('fake-id-token', 'res-1', 'c1', 'b1', 1);
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

  describe('errores de comandos (409 vs 412)', () => {
    const readyToConfirm = () =>
      buildReservation({
        requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: '2026-09-16T00:00:00Z' },
        missingRequirements: [],
      });

    it('409 VEHICLE_NOT_AVAILABLE muestra aviso (role alert) con el detail del back y NO es conflicto de sincronizacion', async () => {
      getReservationMock.mockResolvedValue(readyToConfirm());
      confirmReservationMock.mockRejectedValue(
        new ReservationCommandError(409, { code: 'VEHICLE_NOT_AVAILABLE', detail: 'Vehiculo ocupado del 20/09 al 22/09.' }),
      );
      renderScreen();

      fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Vehiculo ocupado del 20/09 al 22/09.');
      expect(screen.queryByText(/cambió por otra operación/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Recargar' })).not.toBeInTheDocument();
      const confirmBtn = screen.getByRole('button', { name: 'Confirmar reserva' });
      expect(confirmBtn).toBeDisabled();
      expect(confirmBtn).toHaveAttribute('aria-describedby', alert.id);
    });

    it('409 VEHICLE_NOT_AVAILABLE sin detail usa el mensaje por defecto', async () => {
      getReservationMock.mockResolvedValue(readyToConfirm());
      confirmReservationMock.mockRejectedValue(new ReservationCommandError(409, { code: 'VEHICLE_NOT_AVAILABLE' }));
      renderScreen();

      fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Este vehículo ya está ocupado para estas fechas. Elige otro vehículo u otras fechas.',
      );
    });

    it('412 RESERVATION_VERSION_CONFLICT muestra el banner de sincronizacion con Recargar', async () => {
      getReservationMock.mockResolvedValue(readyToConfirm());
      confirmReservationMock.mockRejectedValue(
        new ReservationCommandError(412, { code: 'RESERVATION_VERSION_CONFLICT', detail: 'version' }),
      );
      renderScreen();

      fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));

      expect(await screen.findByText(/Esta reserva cambió por otra operación/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
    });

    it('otro 409 con otro code muestra el mensaje del back sin pasar a SYNC_CONFLICT', async () => {
      getReservationMock.mockResolvedValue(readyToConfirm());
      confirmReservationMock.mockRejectedValue(
        new ReservationCommandError(409, { code: 'RESERVATION_NOT_CONFIRMABLE', detail: 'Faltan requisitos.' }),
      );
      renderScreen();

      fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));

      expect(await screen.findByText('Faltan requisitos.')).toBeInTheDocument();
      expect(screen.queryByText(/cambió por otra operación/)).not.toBeInTheDocument();
    });

    it('cancelar con un 409 de otro code tampoco es conflicto de sincronizacion', async () => {
      getReservationMock.mockResolvedValue(
        buildReservation({ status: 'CONFIRMED', version: 2, confirmedAt: '2026-09-16T00:00:00Z' }),
      );
      cancelReservationMock.mockRejectedValue(new ReservationCommandError(409, { code: 'OTHER' }));
      renderScreen();

      fireEvent.click(await screen.findByRole('button', { name: 'Cancelar por cambio solicitado' }));
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));

      expect(await screen.findByText('No se pudo completar la operación. Intenta de nuevo.')).toBeInTheDocument();
      expect(screen.queryByText(/cambió por otra operación/)).not.toBeInTheDocument();
    });
  });

  it('DEC-ALQ-VEHDATA-001: muestra los avisos de datos faltantes del vehículo con atajo a Editar vehículo (FLEET.WRITE)', async () => {
    clearPermissions();
    setPermissions(['FLEET.WRITE']);
    getReservationMock.mockResolvedValue(
      buildReservation({
        vehicleWarnings: [
          { code: 'VEHICLE_DEPOSIT_MINIMUM_MISSING', field: 'depositMinimum', message: 'x' },
          { code: 'VEHICLE_FUEL_PRICE_MISSING', field: 'fuelPrice', message: 'x' },
        ],
      }),
    );
    renderScreen();

    expect(await screen.findByTestId('vehicle-warning-VEHICLE_DEPOSIT_MINIMUM_MISSING')).toBeInTheDocument();
    expect(screen.getByTestId('vehicle-warning-VEHICLE_FUEL_PRICE_MISSING')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar vehículo' })).toHaveAttribute('href', '/flota/v');
    clearPermissions();
  });

  it('sin avisos de vehículo no muestra el recuadro', async () => {
    getReservationMock.mockResolvedValue(buildReservation({ vehicleWarnings: [] }));
    renderScreen();
    await screen.findByText('Borrador / No confirmada');
    expect(screen.queryByTestId('vehicle-data-warnings')).not.toBeInTheDocument();
  });
});
