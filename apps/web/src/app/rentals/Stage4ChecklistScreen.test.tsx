import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Stage4ChecklistScreen } from './Stage4ChecklistScreen';
import { EvidenceDeletionError } from '../evidence/evidence-client';
import { clearPermissions, setPermissions } from '../../test/permissions';

// ── mocks de infraestructura ────────────────────────────────────────────────

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

const useRentalWizardMock = vi.fn();
vi.mock('./useRentalWizard', () => ({
  useRentalWizard: () => useRentalWizardMock(),
}));

const listRentalEvidenceMock = vi.fn();
const requestEvidenceUploadSessionMock = vi.fn();
const uploadEvidenceToGcsMock = vi.fn();
const recordEvidenceMock = vi.fn();
const deleteRentalEvidenceMock = vi.fn();
const requestDeletionMock = vi.fn();
const listDeletionMock = vi.fn();

vi.mock('../evidence/evidence-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../evidence/evidence-client')>()),
  requestEvidenceDeletion: (...args: unknown[]) => requestDeletionMock(...args),
  listEvidenceDeletionRequests: (...args: unknown[]) => listDeletionMock(...args),
}));

function openRequest(status: 'PENDING' | 'APPROVED_1') {
  return {
    id: 'req-1', companyId: 'c1', branchId: 'b1', targetKind: 'RENTAL' as const, targetId: 'rent-1', evidenceId: 'ev-PHOTO-0',
    evidence: { type: 'PHOTO', zone: 'FRONTAL', uploadedBy: 'uid-1', uploadedAt: '2026-10-22T10:00:00Z' },
    reason: 'Foto movida por error', status, requestedBy: 'uid-1', requestedAt: '2026-10-22T10:05:00Z',
    firstApprovedBy: null, firstApprovedAt: null, firstApprovalNote: null, secondApprovedBy: null, secondApprovedAt: null,
    secondApprovalNote: null, rejectedBy: null, rejectedAt: null, rejectionReason: null, executedAt: null, expiredAt: null,
    expiresAt: '2026-10-29T10:05:00Z', version: 1, viewer: { canApprove: false, canReject: false },
  };
}

vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    listRentalEvidence: (...args: unknown[]) => listRentalEvidenceMock(...args),
    requestEvidenceUploadSession: (...args: unknown[]) => requestEvidenceUploadSessionMock(...args),
    uploadEvidenceToGcs: (...args: unknown[]) => uploadEvidenceToGcsMock(...args),
    recordEvidence: (...args: unknown[]) => recordEvidenceMock(...args),
    deleteRentalEvidence: (...args: unknown[]) => deleteRentalEvidenceMock(...args),
  };
});

const recordVehicleOperationalFormatMock = vi.fn().mockResolvedValue({ id: 'rec-1' });
const listVehicleOperationalRecordsMock = vi.fn().mockResolvedValue({ items: [], total: 0 });

vi.mock('../fleet/fleet-client', async () => {
  const actual = await vi.importActual<typeof import('../fleet/fleet-client')>('../fleet/fleet-client');
  return {
    ...actual,
    recordVehicleOperationalFormat: (...args: unknown[]) => recordVehicleOperationalFormatMock(...args),
    listVehicleOperationalRecords: (...args: unknown[]) => listVehicleOperationalRecordsMock(...args),
  };
});

// ── mocks de infraestructura offline ────────────────────────────────────────

const addEvidenceToQueueMock = vi.fn();
const refreshCountsMock = vi.fn().mockResolvedValue(undefined);

vi.mock('../../offline/queue/evidence-upload-queue', () => ({
  addEvidenceToQueue: (...args: unknown[]) => addEvidenceToQueueMock(...args),
  getPendingEvidence: vi.fn().mockResolvedValue([]),
  markEvidenceSynced: vi.fn().mockResolvedValue(undefined),
  markEvidenceFailed: vi.fn().mockResolvedValue(undefined),
  countPendingAll: vi.fn().mockResolvedValue(0),
  clearSyncedEvidence: vi.fn().mockResolvedValue(undefined),
}));

const useSyncManagerMock = vi.fn();
vi.mock('../../offline/synchronization/use-sync-manager', () => ({
  useSyncManager: (params: unknown) => useSyncManagerMock(params),
}));

// ── fixtures ────────────────────────────────────────────────────────────────

const baseRental = {
  id: 'rent-1',
  status: 'PENDING_DELIVERY',
  customerName: 'Ana Torres',
  customerDocNumber: '11223344',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Yaris',
  vehiclePlate: 'B2C-456',
  vehicleId: 'veh-1',
  alcoholTestResult: 'FAVORABLE',
  version: 4,
  notaryEvaluation: null,
  contract: { id: 'ct-1', documentRef: 'CONTRATO-rent-000', status: 'SIGNED', signedAt: null, createdAt: '', templateVersionId: 'v1' },
  deposit: { id: 'dep-1', originalAmount: '500', currency: 'PEN', status: 'HELD', createdAt: '' },
};

const baseContext = {
  companyId: 'c1',
  companyName: 'VeloxRent',
  branchId: 'b1',
  branchName: 'Sede Central',
};

function makeWizard(overrides?: Record<string, unknown>) {
  return {
    id: 'rent-1',
    state: 'READY' as const,
    rental: baseRental,
    context: baseContext,
    getIdToken: vi.fn().mockResolvedValue('tok'),
    setRental: vi.fn(),
    reload: vi.fn(),
    ...overrides,
  };
}

function makeSyncManager(overrides?: Partial<ReturnType<typeof useSyncManagerMock>>) {
  return {
    syncing: false,
    pendingCount: 0,
    failedCount: 0,
    triggerSync: vi.fn(),
    refreshCounts: refreshCountsMock,
    ...overrides,
  };
}

function evidenceItem(type: 'PHOTO' | 'VIDEO', i: number) {
  return {
    id: `ev-${type}-${i}`,
    rentalId: 'rent-1',
    type,
    zone: 'FRONTAL' as const,
    objectUrl: `https://storage.googleapis.com/bucket/${type}-${i}.jpg`,
    uploadedBy: 'uid-1',
    uploadedAt: new Date().toISOString(),
  };
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// sync.yaml: el estado /sync lo confirma el servidor; por defecto el expediente no uso el flujo offline.
const syncStatusMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../sync/sync-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sync/sync-client')>()),
  getChecklistSyncStatus: (...args: unknown[]) => syncStatusMock.get(...args),
}));
beforeEach(() => {
  syncStatusMock.get.mockResolvedValue({ checklistType: 'ENTREGA', sourceId: 'rent-1', status: 'SYNCED', serverConfirmedAt: null, stateVersion: null, openConflicts: [] });
});


const CHECKLIST_KEY = 'kairos.alquiler.rent-1.checklist';

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          { pathname: '/alquileres/rent-1/entrega-04', state: baseContext },
        ]}
      >
        <Routes>
          <Route path="/alquileres/:id/entrega-04" element={<Stage4ChecklistScreen />} />
          <Route path="/alquileres/:id/entrega-05" element={<div>etapa 5</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── suite ───────────────────────────────────────────────────────────────────

describe('Stage4ChecklistScreen (ENTREGA-04 / ALQ-09)', () => {
  beforeEach(() => {
    useRentalWizardMock.mockReset();
    listRentalEvidenceMock.mockReset();
    requestEvidenceUploadSessionMock.mockReset();
    uploadEvidenceToGcsMock.mockReset();
    recordEvidenceMock.mockReset();
    deleteRentalEvidenceMock.mockReset();
    requestDeletionMock.mockReset();
    listDeletionMock.mockReset();
    listDeletionMock.mockResolvedValue([]);
    clearPermissions();
    addEvidenceToQueueMock.mockReset();
    useSyncManagerMock.mockReset();
    listRentalEvidenceMock.mockResolvedValue([]);
    useSyncManagerMock.mockReturnValue(makeSyncManager());
    // Simular navigator.onLine = true por defecto
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    sessionStorage.removeItem(CHECKLIST_KEY);
  });

  afterEach(() => {
    sessionStorage.removeItem(CHECKLIST_KEY);
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  // ── estado: carga ─────────────────────────────────────────────────────────

  it('muestra mensaje de carga cuando state es LOADING', () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ state: 'LOADING', rental: null, context: null }));
    renderScreen();
    expect(screen.getByText(/Cargando expediente/)).toBeInTheDocument();
  });

  // ── estado: error ─────────────────────────────────────────────────────────

  it('muestra mensaje de error cuando state es RECOVERABLE_ERROR', () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ state: 'RECOVERABLE_ERROR', rental: null, context: null }));
    renderScreen();
    expect(screen.getByText(/No pudimos cargar el expediente/)).toBeInTheDocument();
  });

  // ── estado: nominal ───────────────────────────────────────────────────────

  it('renderiza el formulario de checklist en estado READY y carga la evidencia existente', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    expect(screen.getByText(/Fotos/)).toBeInTheDocument();
    expect(screen.getByText(/Videos/)).toBeInTheDocument();
    expect(screen.getByText(/Temporizador/)).toBeInTheDocument();
    await waitFor(() => expect(listRentalEvidenceMock).toHaveBeenCalledWith('tok', 'rent-1', 'c1', 'b1'));
  });

  it('Continuar está deshabilitado sin las fotos y videos mínimos', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    await waitFor(() => expect(listRentalEvidenceMock).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  // ── validación: completar checklist habilita Continuar ────────────────────

  it('Continuar se habilita cuando el backend reporta 35 fotos y 3 videos', async () => {
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => evidenceItem('PHOTO', i)),
      ...Array.from({ length: 3 }, (_, i) => evidenceItem('VIDEO', i)),
    ]);
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ technicalMinutes: 35, documentaryMinutes: 20, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled());
  });

  it('la foto del alcoholímetro (zona ALCOHOL_TEST) no cuenta para las 35 fotos', async () => {
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 34 }, (_, i) => evidenceItem('PHOTO', i)),
      { ...evidenceItem('PHOTO', 99), zone: 'ALCOHOL_TEST' },
      ...Array.from({ length: 3 }, (_, i) => evidenceItem('VIDEO', i)),
    ]);
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ technicalMinutes: 35, documentaryMinutes: 20, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    await waitFor(() => expect(screen.getByText(/34\/35/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  // ── guardado: navegación a etapa 5 ───────────────────────────────────────

  it('navega a etapa 5 al hacer clic en Continuar cuando el checklist está completo', async () => {
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => evidenceItem('PHOTO', i)),
      ...Array.from({ length: 3 }, (_, i) => evidenceItem('VIDEO', i)),
    ]);
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ technicalMinutes: 35, documentaryMinutes: 20, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('etapa 5')).toBeInTheDocument();
  });

  // ── confirmación: modal de excepción de tiempo ───────────────────────────

  it('abre el modal de excepción cuando el tiempo está por debajo del mínimo', async () => {
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => evidenceItem('PHOTO', i)),
      ...Array.from({ length: 3 }, (_, i) => evidenceItem('VIDEO', i)),
    ]);
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ technicalMinutes: 10, documentaryMinutes: 5, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Tiempo por debajo del mínimo/)).toBeInTheDocument();
  });

  it('permite continuar con excepción tras ingresar el motivo en el modal', async () => {
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => evidenceItem('PHOTO', i)),
      ...Array.from({ length: 3 }, (_, i) => evidenceItem('VIDEO', i)),
    ]);
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ technicalMinutes: 10, documentaryMinutes: 5, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    const textarea = screen.getByRole('dialog').querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Cliente solicitó acortar la inspección' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con excepción' }));

    expect(screen.getByText('etapa 5')).toBeInTheDocument();
  });

  // ── vacios: contadores parten en 0 ───────────────────────────────────────

  it('los contadores muestran 0 fotos y 0 videos al iniciar sin evidencia', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    await waitFor(() => expect(listRentalEvidenceMock).toHaveBeenCalled());
    expect(screen.getByText(/0\/35/)).toBeInTheDocument();
    expect(screen.getByText(/0\/3(?!\d)/)).toBeInTheDocument();
  });

  // ── subida de archivos ────────────────────────────────────────────────────

  it('al seleccionar una foto: pide URL firmada, sube a GCS, confirma y refresca el progreso', async () => {
    requestEvidenceUploadSessionMock.mockResolvedValue({
      uploadUrl: 'https://storage.googleapis.com/bucket/upload-signed-url',
      objectUrl: 'https://storage.googleapis.com/bucket/rental-evidence/rent-1/photo/frontal/uuid.jpg',
    });
    uploadEvidenceToGcsMock.mockResolvedValue(undefined);
    recordEvidenceMock.mockResolvedValue(evidenceItem('PHOTO', 0));
    listRentalEvidenceMock
      .mockResolvedValueOnce([]) // carga inicial
      .mockResolvedValueOnce([evidenceItem('PHOTO', 0)]); // tras subir

    useRentalWizardMock.mockReturnValue(makeWizard());
    const { container } = renderScreen();
    await waitFor(() => expect(listRentalEvidenceMock).toHaveBeenCalledTimes(1));

    const file = new File(['data'], 'frontal.jpg', { type: 'image/jpeg' });
    const photoInput = container.querySelector('input[type="file"][accept^="image"]') as HTMLInputElement;
    fireEvent.change(photoInput, { target: { files: [file] } });

    await waitFor(() => expect(recordEvidenceMock).toHaveBeenCalled());
    expect(requestEvidenceUploadSessionMock).toHaveBeenCalledWith(
      'tok',
      'rent-1',
      'c1',
      'b1',
      'PHOTO',
      'FRONTAL',
      'image/jpeg',
      file.size,
    );
    expect(uploadEvidenceToGcsMock).toHaveBeenCalledWith('https://storage.googleapis.com/bucket/upload-signed-url', file);
    await waitFor(() => expect(screen.getByText(/1\/35/)).toBeInTheDocument());
  });

  // Eliminar evidencia = solicitud con DOBLE APROBACION (evidence.yaml 1.0.0): nunca borra directo.
  it('solicita eliminar una foto con motivo obligatorio y no llama al borrado directo', async () => {
    setPermissions(['EVIDENCE.REQUEST_DELETION']);
    requestDeletionMock.mockResolvedValue(openRequest('PENDING'));
    listRentalEvidenceMock.mockResolvedValue([evidenceItem('PHOTO', 0)]);
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: /Solicitar eliminación de foto Frontal/i }));
    const send = screen.getByRole('button', { name: 'Enviar solicitud' });
    expect(send).toBeDisabled(); // motivo obligatorio
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Foto movida por error' } });
    fireEvent.click(send);

    await waitFor(() =>
      expect(requestDeletionMock).toHaveBeenCalledWith('fake-id-token', {
        companyId: 'c1',
        branchId: 'b1',
        targetKind: 'RENTAL',
        targetId: 'rent-1',
        evidenceId: 'ev-PHOTO-0',
        reason: 'Foto movida por error',
      }),
    );
    expect(deleteRentalEvidenceMock).not.toHaveBeenCalled();
    expect(await screen.findByTestId('evidence-deletion-status')).toHaveTextContent(/Eliminación solicitada/);
  });

  it('muestra "Eliminación solicitada" cuando la evidencia ya tiene una solicitud abierta', async () => {
    setPermissions(['EVIDENCE.APPROVE_DELETION']);
    listDeletionMock.mockImplementation(async (_t: string, p: { status: string }) =>
      p.status === 'APPROVED_1' ? [openRequest('APPROVED_1')] : [],
    );
    listRentalEvidenceMock.mockResolvedValue([evidenceItem('PHOTO', 0)]);
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    expect(await screen.findByTestId('evidence-deletion-status')).toHaveTextContent(/Falta la 2.ª aprobación/);
    expect(screen.queryByRole('button', { name: /Solicitar eliminación/i })).not.toBeInTheDocument();
  });

  it('sin el permiso EVIDENCE.REQUEST_DELETION no ofrece eliminar evidencia', async () => {
    setPermissions([]);
    listRentalEvidenceMock.mockResolvedValue([evidenceItem('PHOTO', 0)]);
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    await screen.findByText(/Foto · Frontal/);
    expect(screen.queryByRole('button', { name: /eliminación|Eliminar/i })).not.toBeInTheDocument();
  });

  it('si ya existe una solicitud abierta (409) muestra un mensaje claro', async () => {
    setPermissions(['EVIDENCE.REQUEST_DELETION']);
    requestDeletionMock.mockRejectedValue(
      new EvidenceDeletionError(409, { code: 'EVIDENCE_DELETION_ALREADY_REQUESTED', detail: 'x' }),
    );
    listRentalEvidenceMock.mockResolvedValue([evidenceItem('PHOTO', 0)]);
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: /Solicitar eliminación de foto Frontal/i }));
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Duplicada por error' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText(/Ya existe una solicitud abierta/)).toBeInTheDocument();
  });

  it('rechaza un tipo de archivo no permitido sin llamar al backend', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    const { container } = renderScreen();
    await waitFor(() => expect(listRentalEvidenceMock).toHaveBeenCalled());

    const file = new File(['data'], 'frontal.png', { type: 'image/png' });
    const photoInput = container.querySelector('input[type="file"][accept^="image"]') as HTMLInputElement;
    fireEvent.change(photoInput, { target: { files: [file] } });

    expect(await screen.findByText(/Solo se admiten imágenes JPEG o WebP/)).toBeInTheDocument();
    expect(requestEvidenceUploadSessionMock).not.toHaveBeenCalled();
  });

  it('muestra un mensaje de error claro si falla la subida a GCS (sin conexión)', async () => {
    requestEvidenceUploadSessionMock.mockResolvedValue({
      uploadUrl: 'https://storage.googleapis.com/bucket/upload-signed-url',
      objectUrl: 'https://storage.googleapis.com/bucket/x.jpg',
    });
    uploadEvidenceToGcsMock.mockRejectedValue(new Error('network error'));

    useRentalWizardMock.mockReturnValue(makeWizard());
    const { container } = renderScreen();
    await waitFor(() => expect(listRentalEvidenceMock).toHaveBeenCalled());

    const file = new File(['data'], 'frontal.jpg', { type: 'image/jpeg' });
    const photoInput = container.querySelector('input[type="file"][accept^="image"]') as HTMLInputElement;
    fireEvent.change(photoInput, { target: { files: [file] } });

    expect(await screen.findByText(/No pudimos subir el archivo/)).toBeInTheDocument();
    expect(recordEvidenceMock).not.toHaveBeenCalled();
  });

  // ── OFFLINE: captura local sin conexión ──────────────────────────────────

  it('muestra el banner offline cuando no hay conexión', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();
  });

  it('Continuar está deshabilitado cuando offline aunque haya evidencia suficiente', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    // Simular que la query cacheada devuelve evidencia suficiente
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => evidenceItem('PHOTO', i)),
      ...Array.from({ length: 3 }, (_, i) => evidenceItem('VIDEO', i)),
    ]);
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ technicalMinutes: 35, documentaryMinutes: 20, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    // Esperar a que la query se resuelva (si aplica)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    });
  });

  it('al seleccionar una foto offline: guarda en cola Dexie y NO llama al backend', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    addEvidenceToQueueMock.mockResolvedValue(1);
    useRentalWizardMock.mockReturnValue(makeWizard());
    const { container } = renderScreen();

    const file = new File(['data'], 'frontal.jpg', { type: 'image/jpeg' });
    const photoInput = container.querySelector('input[type="file"][accept^="image"]') as HTMLInputElement;
    fireEvent.change(photoInput, { target: { files: [file] } });

    await waitFor(() => expect(addEvidenceToQueueMock).toHaveBeenCalled());
    expect(addEvidenceToQueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rentalId: 'rent-1',
        type: 'PHOTO',
        zone: 'FRONTAL',
        mimeType: 'image/jpeg',
      }),
    );
    // No debe llamar al backend
    expect(requestEvidenceUploadSessionMock).not.toHaveBeenCalled();
  });

  it('al seleccionar una foto offline: rechaza tipos no permitidos sin guardar en cola', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    useRentalWizardMock.mockReturnValue(makeWizard());
    const { container } = renderScreen();

    const file = new File(['data'], 'frontal.gif', { type: 'image/gif' });
    const photoInput = container.querySelector('input[type="file"][accept^="image"]') as HTMLInputElement;
    fireEvent.change(photoInput, { target: { files: [file] } });

    expect(await screen.findByText(/Solo se admiten imágenes JPEG o WebP/)).toBeInTheDocument();
    expect(addEvidenceToQueueMock).not.toHaveBeenCalled();
  });

  // ── SYNCING: sincronización en progreso ───────────────────────────────────

  it('muestra el banner de sincronización cuando syncing es true', () => {
    useSyncManagerMock.mockReturnValue(makeSyncManager({ syncing: true, pendingCount: 3 }));
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    expect(screen.getByText(/Sincronizando 3/)).toBeInTheDocument();
  });

  it('Continuar está deshabilitado mientras syncing es true', () => {
    useSyncManagerMock.mockReturnValue(makeSyncManager({ syncing: true, pendingCount: 0 }));
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => evidenceItem('PHOTO', i)),
      ...Array.from({ length: 3 }, (_, i) => evidenceItem('VIDEO', i)),
    ]);
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ technicalMinutes: 35, documentaryMinutes: 20, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('Continuar está deshabilitado cuando hay items pendientes aunque no esté sincronizando', () => {
    useSyncManagerMock.mockReturnValue(makeSyncManager({ syncing: false, pendingCount: 2 }));
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => evidenceItem('PHOTO', i)),
      ...Array.from({ length: 3 }, (_, i) => evidenceItem('VIDEO', i)),
    ]);
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ technicalMinutes: 35, documentaryMinutes: 20, exceptionReason: '', notes: '' }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('renders FIV (02), FCKE (08) and RNC (06) operational sections and updates draft', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    expect(screen.getByText(/Control de Kit de Emergencia \(FCKE - Formato 08/)).toBeInTheDocument();
    expect(screen.getByText(/Inspección Vehicular Completa \(FIV - Formato 02\)/)).toBeInTheDocument();
    expect(screen.getByText(/Registro de Combustible y Kilometraje \(RNC - Formato 06\)/)).toBeInTheDocument();

    const gataRow = screen.getByText(/Gata hidráulica tipo botella/).closest('div');
    expect(gataRow).toBeInTheDocument();
    const btnM = within(gataRow!).getByRole('button', { name: 'M' });
    fireEvent.click(btnM);

    const saved = JSON.parse(sessionStorage.getItem(CHECKLIST_KEY) || '{}');
    expect(saved.fcke_gata_botella).toBe('M');
  });

  it('persiste formatos FIV, FCKE y RNC en el servidor al continuar (C2)', async () => {
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => evidenceItem('PHOTO', i)),
      ...Array.from({ length: 3 }, (_, i) => evidenceItem('VIDEO', i)),
    ]);
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({
        technicalMinutes: 35,
        documentaryMinutes: 20,
        exceptionReason: '',
        notes: 'Todo verificado en patio',
        rnc_kilometraje: 50400,
        rnc_nivel_combustible_lineas: 16,
        rnc_sugerencia: 'Tanque lleno',
        fcke_gata_botella: 'B',
        fiv_puertas_capo_cajuela: 'B',
      }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => {
      expect(recordVehicleOperationalFormatMock).toHaveBeenCalledWith(
        expect.any(String),
        'veh-1',
        expect.objectContaining({
          formatType: 'FORMATO_02_FIV',
          processType: 'RENTAL',
          processId: 'rent-1',
          odometerKm: 50400,
          fuelLevelLines: 16,
          data: expect.objectContaining({
            technicalMinutes: 35,
            documentaryMinutes: 20,
            exceptionReason: null,
            fiv_puertas_capo_cajuela: 'B',
          }),
        }),
        'rental-rent-1-fiv',
      );
      expect(recordVehicleOperationalFormatMock).toHaveBeenCalledWith(
        expect.any(String),
        'veh-1',
        expect.objectContaining({
          formatType: 'FORMATO_08_FCKE',
          processType: 'RENTAL',
          processId: 'rent-1',
          data: expect.objectContaining({ fcke_gata_botella: 'B' }),
        }),
        'rental-rent-1-fcke',
      );
      expect(recordVehicleOperationalFormatMock).toHaveBeenCalledWith(
        expect.any(String),
        'veh-1',
        expect.objectContaining({
          formatType: 'FORMATO_06_RNC',
          processType: 'RENTAL',
          processId: 'rent-1',
          fuelLevelLines: 16,
          data: expect.objectContaining({
            responsable: expect.any(String),
            unidad: expect.objectContaining({
              plate: 'B2C-456',
              model: 'Yaris',
            }),
            fuelLevelLines: 16,
            sugerencia: 'Tanque lleno',
            firmaConfirmada: true,
          }),
        }),
        'rental-rent-1-rnc',
      );
    });
  });

  it('bloquea Continuar y muestra aviso de bloqueo cuando fiv_soat_vigente o fiv_revision_tecnica_vigente es M (A3)', async () => {
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => evidenceItem('PHOTO', i)),
      ...Array.from({ length: 3 }, (_, i) => evidenceItem('VIDEO', i)),
    ]);
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({
        technicalMinutes: 35,
        documentaryMinutes: 20,
        exceptionReason: '',
        notes: '',
        fiv_soat_vigente: 'M',
      }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    expect(await screen.findByText(/Bloqueo de entrega: SOAT o Revisión Técnica marcados en Mal Estado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('usa odometerKm como fallback sobre rnc_kilometraje para el odómetro de FIV (A2)', async () => {
    recordVehicleOperationalFormatMock.mockClear();
    listRentalEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => evidenceItem('PHOTO', i)),
      ...Array.from({ length: 3 }, (_, i) => evidenceItem('VIDEO', i)),
    ]);
    sessionStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({
        technicalMinutes: 35,
        documentaryMinutes: 20,
        exceptionReason: '',
        odometerKm: 65400,
        rnc_nivel_combustible_lineas: 8,
      }),
    );
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => {
      expect(recordVehicleOperationalFormatMock).toHaveBeenCalledWith(
        expect.any(String),
        'veh-1',
        expect.objectContaining({
          formatType: 'FORMATO_02_FIV',
          odometerKm: 65400,
        }),
        'rental-rent-1-fiv',
      );
    });
  });

  it('carga datos previos de formatos operativos guardados para este alquiler (C2)', async () => {
    listVehicleOperationalRecordsMock.mockResolvedValueOnce({
      items: [
        {
          id: 'rec-fiv-1',
          formatType: 'FORMATO_02_FIV',
          processType: 'RENTAL',
          processId: 'rent-1',
          odometerKm: 42000,
          fuelLevelLines: 12,
          data: { fiv_puertas_capo_cajuela: 'B', rnc_sugerencia: '3/4 de tanque' },
        },
      ],
      total: 1,
    });
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    await waitFor(() => {
      expect(listVehicleOperationalRecordsMock).toHaveBeenCalledWith(
        expect.any(String),
        'veh-1',
        expect.objectContaining({ companyId: 'c1', branchId: 'b1' }),
      );
    });
  });

  it('D3: muestra la guia de toma fotografica segun la zona seleccionada', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    const guide = screen.getByTestId('zone-photo-guide');
    expect(guide).toBeInTheDocument();
    expect(guide).toHaveTextContent(/Parachoques delantero, capó/);

    const select = screen.getByLabelText(/Zona del vehículo/);
    fireEvent.change(select, { target: { value: 'LATERAL_IZQUIERDO' } });
    expect(screen.getByTestId('zone-photo-guide')).toHaveTextContent(/Puertas izquierdas, manijas/);

    fireEvent.change(select, { target: { value: 'INTERIOR' } });
    expect(screen.getByTestId('zone-photo-guide')).toHaveTextContent(/Salón completo, tapicería/);
  });
});


