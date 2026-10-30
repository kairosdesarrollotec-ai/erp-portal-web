import { describe, it, expect, vi, beforeEach } from 'vitest';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReservationDetailScreen } from './ReservationDetailScreen';
import { ReservationCommandError } from './reservations-client';
import { clearPermissions, setPermissions } from '../../test/permissions';

const getReservationMock = vi.fn();
const registerPaymentMock = vi.fn();
const registerDocumentsMock = vi.fn();
const confirmReservationMock = vi.fn();
const cancelReservationMock = vi.fn();
const registerReminderMock = vi.fn();
const requestAirportMock = vi.fn();
const getAirportMock = vi.fn();

const deniedPermissions = vi.hoisted(() => new Set<string>());
vi.mock('../shared/useRolePermissions', () => ({
  useRolePermissions: () => ({ can: (module: string, action: string) => !deniedPermissions.has(`${module}.${action}`) }),
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
    registerReservationReminder: (...args: unknown[]) => registerReminderMock(...args),
    requestReservationAirportService: (...args: unknown[]) => requestAirportMock(...args),
    getReservationAirportService: (...args: unknown[]) => getAirportMock(...args),
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
    registerReminderMock.mockReset();
    requestAirportMock.mockReset();
    getAirportMock.mockReset().mockResolvedValue(null);
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
    recordReservationDocumentMock.mockResolvedValue({ id: 'doc-voucher-1' });
    registerPaymentMock.mockResolvedValue(
      buildReservation({ requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: null } }),
    );
    const { container } = renderScreen();

    await screen.findByText('Borrador / No confirmada');
    expect(screen.queryByText('Confirmar reserva')).not.toBeInTheDocument();

    // Decision 22-oct #8: formulario con metodo, nº de operacion, pagador y comprobante adjunto.
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));
    expect(screen.getByTestId('payment-proof-form')).toBeInTheDocument();
    // Sin datos no envia nada.
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comprobante' }));
    expect(await screen.findByText('Ingresa el número de operación.')).toBeInTheDocument();
    expect(screen.getByText('Adjunta el comprobante de pago.')).toBeInTheDocument();
    expect(registerPaymentMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Método de pago/), { target: { value: 'YAPE' } });
    fireEvent.change(screen.getByLabelText(/Nº de operación/), { target: { value: 'OP-998877' } });
    fireEvent.click(screen.getByRole('button', { name: 'Paga un agente externo' }));
    fireEvent.change(screen.getByLabelText(/Nombre de quien paga/), { target: { value: 'Carlos Ruiz' } });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['voucher'], 'voucher.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comprobante' }));

    expect(await screen.findByText(/confirma automáticamente/)).toBeInTheDocument();
    expect(recordReservationDocumentMock).toHaveBeenCalledWith('fake-id-token', 'res-1', 'c1', 'b1', 'PAYMENT_VOUCHER', 'gs://bucket/voucher.png');
    // El monto requerido y la version de politica ya no viajan desde el cliente; si viajan metodo, operacion y pagador.
    expect(registerPaymentMock).toHaveBeenCalledWith('fake-id-token', 'res-1', 'c1', 'b1', 1, {
      amount: '300.00',
      method: 'YAPE',
      operationNumber: 'OP-998877',
      payerName: 'Carlos Ruiz',
      voucherDocumentId: 'doc-voucher-1',
    });
  });

  it('CR-01: si la subida del comprobante falla (503) no se registra documento ni pago', async () => {
    getReservationMock.mockResolvedValue(buildReservation());
    requestReservationDocumentUploadSessionMock.mockResolvedValue({
      uploadUrl: 'https://storage.googleapis.com/upload',
      objectUrl: 'gs://bucket/voucher.png',
      expiresAt: '2026-09-16T01:00:00Z',
    });
    uploadReservationFileToGcsMock.mockRejectedValue(new Error('Error al subir el archivo a GCS (503)'));
    recordReservationDocumentMock.mockReset();
    registerPaymentMock.mockReset();
    const { container } = renderScreen();

    await screen.findByText('Borrador / No confirmada');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));
    fireEvent.change(screen.getByLabelText(/Método de pago/), { target: { value: 'YAPE' } });
    fireEvent.change(screen.getByLabelText(/Nº de operación/), { target: { value: 'OP-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Paga un agente externo' }));
    fireEvent.change(screen.getByLabelText(/Nombre de quien paga/), { target: { value: 'Carlos Ruiz' } });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(['v'], 'voucher.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comprobante' }));

    expect(await screen.findByText(/No pudimos subir el comprobante/)).toBeInTheDocument();
    expect(recordReservationDocumentMock).not.toHaveBeenCalled();
    expect(registerPaymentMock).not.toHaveBeenCalled();
  });

  it('muestra el 422 RESERVATION_EXCEEDS_GUARANTEE de forma clara (sin saldo a favor)', async () => {
    getReservationMock.mockResolvedValue(buildReservation({
      requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: '2026-09-16T00:00:00Z' },
      missingRequirements: [],
    }));
    confirmReservationMock.mockRejectedValue(new ReservationCommandError(422, { code: 'RESERVATION_EXCEEDS_GUARANTEE', detail: 'tecnico' }));
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));

    expect(await screen.findByText(/no puede superar la garantía del vehículo/)).toBeInTheDocument();
    expect(screen.getByText(/No existe saldo a favor/)).toBeInTheDocument();
  });

  describe('RES-05 - Continuar con alquiler solo en la fecha pactada (hora de Lima)', () => {
    const confirmed = (startAt: string) =>
      buildReservation({
        status: 'CONFIRMED',
        version: 2,
        startAt,
        requirements: { paymentValidatedAt: '2026-09-16T00:00:00Z', documentsCompletedAt: '2026-09-16T00:00:00Z' },
        confirmedAt: '2026-09-16T00:00:00Z',
      });

    it('antes de la fecha pactada el boton esta deshabilitado y explica "Disponible el dia pactado: dd/mm"', async () => {
      getReservationMock.mockResolvedValue(confirmed('2099-03-05T15:00:00Z'));
      renderScreen();

      const btn = await screen.findByRole('button', { name: 'Continuar con alquiler' });
      expect(btn).toBeDisabled();
      expect(screen.getByText(/Disponible el día pactado: 05\/03/)).toBeInTheDocument();
    });

    it('V-22: sin permiso RENTAL.CREATE (p. ej. Gerencia) no se ofrece "Continuar con alquiler"', async () => {
      deniedPermissions.add('RENTAL.CREATE');
      try {
        getReservationMock.mockResolvedValue(confirmed('2026-09-20T14:00:00Z'));
        renderScreen();

        await screen.findByText(/Vehículo seleccionado para esta reserva/);
        expect(screen.queryByRole('button', { name: 'Continuar con alquiler' })).not.toBeInTheDocument();
      } finally {
        deniedPermissions.clear();
      }
    });

    it('desde la fecha pactada el boton esta habilitado', async () => {
      getReservationMock.mockResolvedValue(confirmed('2026-09-20T14:00:00Z'));
      renderScreen();

      expect(await screen.findByRole('button', { name: 'Continuar con alquiler' })).toBeEnabled();
      expect(screen.queryByText(/Disponible el día pactado/)).not.toBeInTheDocument();
    });
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

    it('CR-06: sin motivo no se puede confirmar la cancelación por cambio solicitado', async () => {
      getReservationMock.mockResolvedValue(
        buildReservation({ status: 'CONFIRMED', version: 2, confirmedAt: '2026-09-16T00:00:00Z' }),
      );
      renderScreen();

      fireEvent.click(await screen.findByRole('button', { name: 'Cancelar por cambio solicitado' }));
      expect(screen.getByRole('button', { name: 'Confirmar cancelación' })).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Motivo del cambio solicitado'), { target: { value: '   ' } });
      expect(screen.getByRole('button', { name: 'Confirmar cancelación' })).toBeDisabled();
      expect(cancelReservationMock).not.toHaveBeenCalled();
    });

    it('cancelar con un 409 de otro code tampoco es conflicto de sincronizacion', async () => {
      getReservationMock.mockResolvedValue(
        buildReservation({ status: 'CONFIRMED', version: 2, confirmedAt: '2026-09-16T00:00:00Z' }),
      );
      cancelReservationMock.mockRejectedValue(new ReservationCommandError(409, { code: 'OTHER' }));
      renderScreen();

      fireEvent.click(await screen.findByRole('button', { name: 'Cancelar por cambio solicitado' }));
      fireEvent.change(screen.getByLabelText('Motivo del cambio solicitado'), { target: { value: 'Cambio de fechas' } });
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

  describe('HU-04 / BDD-RES-001 (Reserva Remota)', () => {
    it('muestra badge de Modalidad Remota (BR-RES-005) y aviso de bloqueo atómico (SC-RES-004)', async () => {
      getReservationMock.mockResolvedValue(
        buildReservation({
          channelMode: 'VIRTUAL',
          customerLocation: 'FUERA_DE_AYACUCHO',
          canComeToOffice: false,
          requirements: {
            paymentValidatedAt: null,
            documentsCompletedAt: null,
            isRemote: true,
            video360Uploaded: false,
            signedAcceptanceUploaded: false,
          },
        }),
      );
      renderScreen();

      expect(await screen.findByText('Modalidad Remota (BR-RES-005)')).toBeInTheDocument();
      expect(
        screen.getByText(
          'El vehículo permanece disponible para otros clientes hasta completar el pago y la aceptación firmada (SC-RES-004).',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Video 360° del vehículo')).toBeInTheDocument();
      expect(screen.getByText('Documento de aceptación firmado')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Subir video' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Subir documento' })).toBeInTheDocument();
    });

    it('exige video 360 y aceptación firmada además de pago y documentos para confirmar reserva remota', async () => {
      // Solo pago y documentos completos (sin video 360 ni aceptación)
      getReservationMock.mockResolvedValue(
        buildReservation({
          channelMode: 'VIRTUAL',
          requirements: {
            paymentValidatedAt: '2026-09-16T00:00:00Z',
            documentsCompletedAt: '2026-09-16T00:00:00Z',
            isRemote: true,
            video360Uploaded: false,
            signedAcceptanceUploaded: false,
          },
        }),
      );
      renderScreen();

      await screen.findByText('Modalidad Remota (BR-RES-005)');
      expect(screen.queryByRole('button', { name: 'Confirmar reserva' })).not.toBeInTheDocument();
      expect(
        screen.getByText(
          'Para confirmar una reserva remota se requiere completar el pago, documentos, video 360° y documento de aceptación firmado (BR-RES-005).',
        ),
      ).toBeInTheDocument();
    });

    it('habilita "Confirmar reserva" cuando los 4 requisitos remotos están completos', async () => {
      getReservationMock.mockResolvedValue(
        buildReservation({
          channelMode: 'VIRTUAL',
          requirements: {
            paymentValidatedAt: '2026-09-16T00:00:00Z',
            documentsCompletedAt: '2026-09-16T00:00:00Z',
            isRemote: true,
            video360Uploaded: true,
            signedAcceptanceUploaded: true,
          },
        }),
      );
      confirmReservationMock.mockResolvedValue(
        buildReservation({
          status: 'CONFIRMED',
          version: 2,
          channelMode: 'VIRTUAL',
          requirements: {
            paymentValidatedAt: '2026-09-16T00:00:00Z',
            documentsCompletedAt: '2026-09-16T00:00:00Z',
            isRemote: true,
            video360Uploaded: true,
            signedAcceptanceUploaded: true,
          },
          confirmedAt: '2026-09-16T00:00:00Z',
        }),
      );
      renderScreen();

      const confirmBtn = await screen.findByRole('button', { name: 'Confirmar reserva' });
      expect(confirmBtn).toBeEnabled();
      fireEvent.click(confirmBtn);
      await waitFor(() => {
        expect(confirmReservationMock).toHaveBeenCalledWith('fake-id-token', 'res-1', 'c1', 'b1', 1);
      });
    });

    it('muestra error cuando backend rechaza con RESERVATION_REQUIREMENTS_NOT_MET', async () => {
      getReservationMock.mockResolvedValue(
        buildReservation({
          channelMode: 'VIRTUAL',
          requirements: {
            paymentValidatedAt: '2026-09-16T00:00:00Z',
            documentsCompletedAt: '2026-09-16T00:00:00Z',
            isRemote: true,
            video360Uploaded: true,
            signedAcceptanceUploaded: true,
          },
        }),
      );
      confirmReservationMock.mockRejectedValue(
        new ReservationCommandError(422, {
          code: 'RESERVATION_REQUIREMENTS_NOT_MET',
          detail: 'Requisitos remotos incompletos',
        }),
      );
      renderScreen();

      fireEvent.click(await screen.findByRole('button', { name: 'Confirmar reserva' }));

      expect(
        await screen.findByText(
          'Para confirmar una reserva remota se requiere el video 360° del vehículo y el documento de aceptación firmado (BR-RES-005, SC-RES-007).',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('C3: Recordatorio 3h antes y C1: Servicio de aeropuerto', () => {
    const confirmedRes = buildReservation({
      status: 'CONFIRMED',
      version: 2,
      startAt: '2026-10-30T10:00:00Z',
      customer: { id: 'c1', name: 'Juan Pérez' },
      vehicle: { id: 'v1', plate: 'ABC-123', label: 'Toyota Corolla - ABC-123' },
    });

    it('muestra tarjeta de recordatorio 3h antes con enlace WhatsApp y registra envío', async () => {
      getReservationMock.mockResolvedValue(confirmedRes);
      registerReminderMock.mockResolvedValue({ ...confirmedRes, version: 3 });

      renderScreen();

      expect(await screen.findByTestId('reservation-reminder-card')).toBeInTheDocument();
      const link = screen.getByTestId('whatsapp-reminder-link');
      expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/?text='));
      expect(link.getAttribute('href')).toContain('Juan%20P%C3%A9rez');

      fireEvent.click(screen.getByTestId('reminder-sent-btn'));

      await waitFor(() => {
        expect(registerReminderMock).toHaveBeenCalledWith('fake-id-token', 'res-1', 'c1', 'b1', 2, 'WHATSAPP', 'HOURS_3_BEFORE', 'SENT', undefined);
      });
      expect(await screen.findByTestId('reminder-status-badge')).toHaveTextContent('Enviado con éxito');
    });

    it('permite registrar fallo de recordatorio con motivo', async () => {
      getReservationMock.mockResolvedValue(confirmedRes);
      registerReminderMock.mockResolvedValue({ ...confirmedRes, version: 3 });

      renderScreen();

      await screen.findByTestId('reservation-reminder-card');
      fireEvent.click(screen.getByTestId('reminder-fail-toggle'));

      const reasonInput = screen.getByTestId('reminder-failure-reason-input');
      const submitBtn = screen.getByTestId('reminder-fail-submit-btn');

      expect(submitBtn).toBeDisabled();
      fireEvent.change(reasonInput, { target: { value: 'Número inválido' } });
      expect(submitBtn).toBeEnabled();

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(registerReminderMock).toHaveBeenCalledWith('fake-id-token', 'res-1', 'c1', 'b1', 2, 'WHATSAPP', 'HOURS_3_BEFORE', 'FAILED', 'Número inválido');
      });
      expect(await screen.findByTestId('reminder-status-badge')).toHaveTextContent('Fallido');
    });

    it('permite solicitar servicio de aeropuerto en reserva confirmada', async () => {
      getReservationMock.mockResolvedValue(confirmedRes);
      requestAirportMock.mockResolvedValue({ ...confirmedRes, version: 3 });

      renderScreen();

      expect(await screen.findByTestId('airport-service-card')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('request-airport-btn'));

      fireEvent.change(screen.getByTestId('airport-scheduled-at-input'), { target: { value: '2026-10-30T09:30' } });
      fireEvent.change(screen.getByTestId('airport-location-input'), { target: { value: 'Aeropuerto Coronel FAP Alfredo Mendívil Duarte' } });
      fireEvent.change(screen.getByTestId('airport-amount-input'), { target: { value: '60.00' } });
      fireEvent.change(screen.getByTestId('airport-notes-input'), { target: { value: 'Vuelo LA2104' } });

      fireEvent.click(screen.getByTestId('airport-submit-btn'));

      await waitFor(() => {
        expect(requestAirportMock).toHaveBeenCalledWith(
          'fake-id-token',
          'res-1',
          'c1',
          'b1',
          2,
          '2026-10-30T09:30',
          'Aeropuerto Coronel FAP Alfredo Mendívil Duarte',
          '60.00',
          'Vuelo LA2104',
        );
      });
      expect(await screen.findByTestId('airport-service-info')).toHaveTextContent('Aeropuerto Coronel FAP Alfredo Mendívil Duarte');
    });

    it('muestra información del servicio de aeropuerto si ya fue registrado previamente', async () => {
      getReservationMock.mockResolvedValue(confirmedRes);
      getAirportMock.mockResolvedValue({
        id: 'as-1',
        reservationId: 'res-1',
        scheduledAt: '2026-10-30T09:30:00Z',
        location: 'Aeropuerto AYP',
        additionalAmount: '50.00',
        currency: 'PEN',
        notes: 'Recojo puntual',
        requestedBy: 'user-admin',
        createdAt: '2026-10-26T10:00:00Z',
      });

      renderScreen();

      expect(await screen.findByTestId('airport-service-info')).toBeInTheDocument();
      expect(screen.getByText(/Lugar: Aeropuerto AYP/)).toBeInTheDocument();
      expect(screen.getByText(/Monto adicional: S\/ 50\.00/)).toBeInTheDocument();
      expect(screen.getByText(/Notas: Recojo puntual/)).toBeInTheDocument();
    });

    it('muestra comprobante de reembolso transferido cuando CANCELLED y TRANSFERRED', async () => {
      const cancelledTransferred = buildReservation({
        status: 'CANCELLED',
        saleResolution: {
          id: 'sr-1',
          status: 'REJECTED',
          refundStatus: 'TRANSFERRED',
          transferVoucher: 'TRANSFER-VOUCHER-999',
        },
      });
      getReservationMock.mockResolvedValue(cancelledTransferred);

      renderScreen();

      expect(await screen.findByTestId('detail-refund-transferred')).toHaveTextContent('Comprobante: TRANSFER-VOUCHER-999');
    });
  });
});

