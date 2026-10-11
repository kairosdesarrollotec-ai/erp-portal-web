import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Stage4ChecklistScreen } from './Stage4ChecklistScreen';

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

vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    listRentalEvidence: (...args: unknown[]) => listRentalEvidenceMock(...args),
    requestEvidenceUploadSession: (...args: unknown[]) => requestEvidenceUploadSessionMock(...args),
    uploadEvidenceToGcs: (...args: unknown[]) => uploadEvidenceToGcsMock(...args),
    recordEvidence: (...args: unknown[]) => recordEvidenceMock(...args),
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
});
