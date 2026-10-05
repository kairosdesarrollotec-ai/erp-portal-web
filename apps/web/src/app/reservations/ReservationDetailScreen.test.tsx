import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReservationDetailScreen } from './ReservationDetailScreen';

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
});
