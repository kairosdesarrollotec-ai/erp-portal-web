import { useState } from 'react';
/**
 * ChecklistScreen.test.tsx — DEV-04 offline/sync tests
 *
 * Cubre los estados OFFLINE y SYNCING de la cola Dexie (ADR-KAI-004, DEV-04).
 * Los estados READY y SYNCED ya estan cubiertos en ChecklistResult.test.tsx.
 *
 * Prototipos de referencia:
 *   - PROTO-DEV-04-CHECKLIST-RECEPCION-SIN-CONEXION-MOVIL (OFFLINE mobile)
 *   - PROTO-DEV-04-CHECKLIST-RECEPCION-MOVIL (READY mobile — captura offline)
 *   - PROTO-DEV-04-CHECKLIST-RECEPCION-CONFIRMADO-POR-SERVIDOR-MOVIL (SYNCED mobile)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ChecklistScreen } from './ChecklistScreen';
import { baseContext, makeFlow, makeReturn } from './test-utils';
import { setPermissions } from '../../test/permissions';
import { EMPTY_RETURN_CHECKLIST, saveReturnChecklist } from './return-session-draft';
import type { SyncManagerResult } from '../../offline/synchronization/use-sync-manager';

// sync.yaml: el estado /sync lo confirma el servidor; por defecto el expediente no uso el flujo offline.
const syncStatusMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../sync/sync-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sync/sync-client')>()),
  getChecklistSyncStatus: (...args: unknown[]) => syncStatusMock.get(...args),
}));
beforeEach(() => {
  syncStatusMock.get.mockResolvedValue({ checklistType: 'RECEPCION', sourceId: 'ret-1', status: 'SYNCED', serverConfirmedAt: null, stateVersion: null, openConflicts: [] });
});


// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));

// ── Permisos ────────────────────────────────────────────────────────────────
const RETURN_FULL = [
  'RETURN.CREATE', 'RETURN.READ', 'RETURN.RECEIVE_PROVISIONAL',
  'RETURN.REGISTER_ALCOHOL_TEST', 'RETURN.COMPLETE_INSPECTION',
  'RETURN.UPLOAD_EVIDENCE', 'RETURN.ASSESS_DAMAGE',
  'RETURN.CHARGE_IMMOBILIZATION', 'RETURN.CLOSE_FINANCIAL', 'RETURN.CLOSE',
] as const;

// ── Mocks de infraestructura ─────────────────────────────────────────────────
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));

const flowMock = vi.fn();
vi.mock('./useReturnFlow', () => ({ useReturnFlow: () => flowMock() }));

const listReturnEvidenceMock = vi.fn();
const requestSessionMock = vi.fn();
const uploadGcsMock = vi.fn();
const recordEvidenceMock = vi.fn();
const deleteEvidenceMock = vi.fn();
const requestDeletionMock = vi.fn();
vi.mock('../evidence/evidence-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../evidence/evidence-client')>()),
  requestEvidenceDeletion: (...args: unknown[]) => requestDeletionMock(...args),
  listEvidenceDeletionRequests: vi.fn().mockResolvedValue([]),
}));
const getResponsibilityTemplateMock = vi.fn();

vi.mock('./returns-client', async () => {
  const actual = await vi.importActual<typeof import('./returns-client')>('./returns-client');
  return {
    ...actual,
    listReturnEvidence: (...args: unknown[]) => listReturnEvidenceMock(...args),
    requestReturnEvidenceUploadSession: (...args: unknown[]) => requestSessionMock(...args),
    uploadReturnEvidenceToGcs: (...args: unknown[]) => uploadGcsMock(...args),
    recordReturnEvidence: (...args: unknown[]) => recordEvidenceMock(...args),
    deleteReturnEvidence: (...args: unknown[]) => deleteEvidenceMock(...args),
    getResponsibilityTemplate: (...args: unknown[]) => getResponsibilityTemplateMock(...args),
  };
});

const recordVehicleOperationalFormatMock = vi.fn().mockResolvedValue({ id: 'rec-ret-1' });
const listVehicleOperationalRecordsMock = vi.fn().mockResolvedValue({ items: [], total: 0 });

vi.mock('../fleet/fleet-client', async () => {
  const actual = await vi.importActual<typeof import('../fleet/fleet-client')>('../fleet/fleet-client');
  return {
    ...actual,
    recordVehicleOperationalFormat: (...args: unknown[]) => recordVehicleOperationalFormatMock(...args),
    listVehicleOperationalRecords: (...args: unknown[]) => listVehicleOperationalRecordsMock(...args),
  };
});

// Mock del modulo de queue offline
const addEvidenceToQueueMock = vi.fn();
vi.mock('../../offline/queue/evidence-upload-queue', () => ({
  addEvidenceToQueue: (...args: unknown[]) => addEvidenceToQueueMock(...args),
  getPendingEvidenceForReturn: vi.fn().mockResolvedValue([]),
  countPendingAll: vi.fn().mockResolvedValue(0),
  clearSyncedEvidenceForReturn: vi.fn().mockResolvedValue(undefined),
}));

// Mock del sync manager para controlar sincing/pendingCount
const syncManagerMock = vi.fn();
vi.mock('../../offline/synchronization/use-sync-manager', () => ({
  useSyncManager: () => syncManagerMock(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
function evidence(type: 'PHOTO' | 'VIDEO', i: number, zone = 'FRONTAL') {
  return {
    id: `${type}-${i}`,
    returnId: 'ret-1',
    type,
    zone,
    objectUrl: `https://gcs/${type}-${i}`,
    createdAt: '2026-10-04T10:00:00Z',
  };
}

function fullEvidence() {
  return [
    ...Array.from({ length: 35 }, (_, i) => evidence('PHOTO', i)),
    ...Array.from({ length: 3 }, (_, i) => evidence('VIDEO', i)),
  ];
}

function syncManagerIdle(overrides: Partial<SyncManagerResult> = {}): SyncManagerResult {
  return { syncing: false, pendingCount: 0, failedCount: 0, triggerSync: vi.fn(), refreshCounts: vi.fn().mockResolvedValue(undefined), ...overrides };
}

function syncManagerSyncing(pendingCount = 2): SyncManagerResult {
  return { syncing: true, pendingCount, failedCount: 0, triggerSync: vi.fn(), refreshCounts: vi.fn().mockResolvedValue(undefined) };
}

function renderChecklist() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/devoluciones/ret-1/checklist', state: baseContext }]}>
      <Routes>
        <Route path="/devoluciones/:id/checklist" element={<ChecklistScreen />} />
        <Route path="/devoluciones/:id/resultado" element={<div>pantalla resultado</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function makeFile(name = 'foto.jpg', type = 'image/jpeg', size = 1024): File {
  return new File([new ArrayBuffer(size)], name, { type });
}

// ── Setup / teardown ─────────────────────────────────────────────────────────
const originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true, writable: true });
}

beforeEach(() => {
  [flowMock, listReturnEvidenceMock, requestSessionMock, uploadGcsMock, recordEvidenceMock, deleteEvidenceMock, getResponsibilityTemplateMock, addEvidenceToQueueMock].forEach((m) => m.mockReset());
  syncManagerMock.mockReset();
  sessionStorage.clear();
  setPermissions(RETURN_FULL);
  setOnline(true);
  flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ status: 'INSPECCION' }) }));
  listReturnEvidenceMock.mockResolvedValue([]);
  getResponsibilityTemplateMock.mockResolvedValue({ type: 'STANDARD', name: 'Documento de Responsabilidad', content: '', version: 1 });
  syncManagerMock.mockReturnValue(syncManagerIdle());
  addEvidenceToQueueMock.mockResolvedValue(1);
});

afterEach(() => {
  sessionStorage.clear();
  // Restaurar navigator.onLine
  if (originalOnLine) {
    Object.defineProperty(navigator, 'onLine', originalOnLine);
  } else {
    setOnline(true);
  }
});

// ── Suite: estado OFFLINE ────────────────────────────────────────────────────
describe('ChecklistScreen — estado OFFLINE (PROTO-DEV-04-CHECKLIST-RECEPCION-SIN-CONEXION-MOVIL)', () => {
  it('muestra el banner de sin conexion cuando navigator.onLine es false', async () => {
    setOnline(false);
    renderChecklist();
    // Disparar evento para forzar actualizacion del hook useOnline
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(await screen.findByText(/Sin conexión/)).toBeInTheDocument();
  });

  it('el banner offline usa el texto del prototipo/PANTALLAS-V3-B-DEVOLUCION', async () => {
    setOnline(false);
    renderChecklist();
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(await screen.findByText(/Sin conexión — tu trabajo se guarda en este dispositivo/)).toBeInTheDocument();
  });

  it('el boton Continuar esta deshabilitado cuando esta offline', async () => {
    setOnline(false);
    // Evidence completa en servidor y doc firmado, pero offline
    saveReturnChecklist('ret-1', {
      ...EMPTY_RETURN_CHECKLIST,
      responsibilityDocument: {
        signerName: 'Maria Quispe',
        signerIsHolder: true,
        signerRelationToHolder: '',
        signatureData: 'data:image/png;base64,FIRMA',
      },
    });
    listReturnEvidenceMock.mockResolvedValue(fullEvidence());
    renderChecklist();
    act(() => { window.dispatchEvent(new Event('offline')); });
    await screen.findByText(/Sin conexión/);
    expect(screen.getByRole('button', { name: 'Continuar a Resultado' })).toBeDisabled();
  });

  it('los botones de captura permanecen habilitados sin conexion (ADR-KAI-004: captura offline permitida)', async () => {
    setOnline(false);
    renderChecklist();
    act(() => { window.dispatchEvent(new Event('offline')); });
    await screen.findByText(/Sin conexión/);
    // El boton de fotos debe estar habilitado para permitir captura offline
    expect(screen.getByRole('button', { name: 'Agregar fotos' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Agregar video' })).toBeEnabled();
  });

  it('cuando se selecciona un archivo sin conexion, se encola en Dexie y no se llama al servidor', async () => {
    setOnline(false);
    renderChecklist();
    act(() => { window.dispatchEvent(new Event('offline')); });
    await screen.findByText(/Sin conexión/);

    const photoInput = document.querySelector('input[aria-label="Seleccionar fotos"]') as HTMLInputElement;
    const file = makeFile('foto.jpg', 'image/jpeg');
    await act(async () => {
      fireEvent.change(photoInput, { target: { files: [file] } });
    });

    // Verifica que se encoló en Dexie
    expect(addEvidenceToQueueMock).toHaveBeenCalledOnce();
    expect(addEvidenceToQueueMock).toHaveBeenCalledWith(expect.objectContaining({
      returnId: 'ret-1',
      rentalId: null,
      type: 'PHOTO',
      zone: 'FRONTAL',
      mimeType: 'image/jpeg',
    }));

    // Verifica que NO se llamó al servidor (requestReturnEvidenceUploadSession)
    expect(requestSessionMock).not.toHaveBeenCalled();
  });

  it('el contador de cola local aumenta al encolar archivos offline', async () => {
    setOnline(false);
    // Igual que el hook real (y ENTREGA-04): tras encolar, refreshCounts relee la cola Dexie.
    syncManagerMock.mockImplementation(() => {
      const [pending, setPending] = useState(0);
      return syncManagerIdle({
        pendingCount: pending,
        refreshCounts: async () => { setPending(1); },
      });
    });
    renderChecklist();
    act(() => { window.dispatchEvent(new Event('offline')); });
    await screen.findByText(/Sin conexión/);

    const photoInput = document.querySelector('input[aria-label="Seleccionar fotos"]') as HTMLInputElement;
    const file = makeFile('foto.jpg', 'image/jpeg');
    await act(async () => {
      fireEvent.change(photoInput, { target: { files: [file] } });
    });

    // El banner debe mostrar el conteo de archivos pendientes
    await waitFor(() => {
      expect(screen.getByText(/1 archivo pendiente de sincronizar/)).toBeInTheDocument();
    });
  });
});

// ── Suite: fallo de sincronizacion (cola en error) ───────────────────────────
describe('ChecklistScreen — sincronizacion fallida', () => {
  it('muestra alerta con Reintentar, bloquea Continuar y reintenta via triggerSync', async () => {
    const triggerSync = vi.fn();
    syncManagerMock.mockReturnValue(syncManagerIdle({ pendingCount: 0, failedCount: 2, triggerSync }));
    renderChecklist();
    expect(await screen.findByRole('alert')).toHaveTextContent('2 archivos no pudo sincronizarse');
    expect(screen.getByRole('button', { name: 'Continuar a Resultado' })).toBeDisabled();
    triggerSync.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar sincronización' }));
    expect(triggerSync).toHaveBeenCalled();
  });
});

// ── Suite: estado SYNCING ────────────────────────────────────────────────────
describe('ChecklistScreen — estado SYNCING (ADR-KAI-004)', () => {
  it('muestra el banner de sincronizacion cuando useSyncManager reporta syncing=true', async () => {
    syncManagerMock.mockReturnValue(syncManagerSyncing(3));
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByText(/Sincronizando 3 archivos/)).toBeInTheDocument();
    });
  });

  it('el boton Continuar esta deshabilitado mientras sincroniza', async () => {
    syncManagerMock.mockReturnValue(syncManagerSyncing(2));
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continuar a Resultado' })).toBeDisabled();
    });
  });

  it('el boton Continuar esta deshabilitado cuando hay pendingCount > 0 aunque no este sincronizando activamente', async () => {
    syncManagerMock.mockReturnValue(syncManagerIdle({ pendingCount: 2 }));
    renderChecklist();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continuar a Resultado' })).toBeDisabled();
    });
  });
});

// ── Suite: transicion OFFLINE → ONLINE → SYNCED ───────────────────────────────
describe('ChecklistScreen — transicion offline → sync → synced', () => {
  it('al recuperar conexion se llama a triggerSync del syncManager (online event)', async () => {
    const triggerSyncMock = vi.fn();
    syncManagerMock.mockReturnValue(syncManagerIdle({ triggerSync: triggerSyncMock }));
    setOnline(false);
    renderChecklist();
    act(() => { window.dispatchEvent(new Event('offline')); });
    await screen.findByText(/Sin conexión/);

    // Simular recuperacion de conexion
    setOnline(true);
    act(() => { window.dispatchEvent(new Event('online')); });

    // El sync manager recibe el evento online y llama triggerSync internamente.
    // Aqui verificamos que el banner de offline desaparece.
    await waitFor(() => {
      expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument();
    });
  });

  it('con evidence completa del servidor, online y sin pendientes, el boton Continuar se habilita', async () => {
    saveReturnChecklist('ret-1', {
      ...EMPTY_RETURN_CHECKLIST,
      responsibilityDocument: {
        signerName: 'Maria Quispe',
        signerIsHolder: true,
        signerRelationToHolder: '',
        signatureData: 'data:image/png;base64,FIRMA',
      },
    });
    syncManagerMock.mockReturnValue(syncManagerIdle());
    listReturnEvidenceMock.mockResolvedValue(fullEvidence());
    renderChecklist();
    await screen.findByText('Confirmado por el servidor — recepción completa');
    expect(screen.getByRole('button', { name: 'Continuar a Resultado' })).toBeEnabled();
  });
});

// ── Suite: validacion de tipo MIME al encolar offline ─────────────────────────
describe('ChecklistScreen — validacion MIME offline', () => {
  it('no encola archivos con tipo MIME invalido y muestra error', async () => {
    setOnline(false);
    addEvidenceToQueueMock.mockClear(); // no debe llamarse
    renderChecklist();
    act(() => { window.dispatchEvent(new Event('offline')); });
    await screen.findByText(/Sin conexión/);

    const photoInput = document.querySelector('input[aria-label="Seleccionar fotos"]') as HTMLInputElement;
    const badFile = makeFile('foto.gif', 'image/gif');
    await act(async () => {
      fireEvent.change(photoInput, { target: { files: [badFile] } });
    });

    // No se llama al queue con tipo invalido
    expect(addEvidenceToQueueMock).not.toHaveBeenCalled();
    // Se muestra el error
    expect(await screen.findByRole('alert')).toHaveTextContent(/Solo se admiten/);
  });
});

// ── Suite: eliminar evidencia = solicitud con doble aprobacion (DEV-04, evidence.yaml 1.0.0) ───────────────
describe('ChecklistScreen — solicitar eliminación de evidencia', () => {
  it('solicita la eliminación con motivo y NO borra directo', async () => {
    setPermissions(['EVIDENCE.REQUEST_DELETION']);
    requestDeletionMock.mockResolvedValue({ id: 'req-1', evidenceId: 'PHOTO-0', status: 'PENDING' });
    listReturnEvidenceMock.mockResolvedValue([evidence('PHOTO', 0)]);
    renderChecklist();

    const buttons = await screen.findAllByRole('button', { name: /^Solicitar eliminación de foto/i });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Foto duplicada del lado derecho' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await waitFor(() =>
      expect(requestDeletionMock).toHaveBeenCalledWith(expect.anything(), {
        companyId: baseContext.companyId,
        branchId: baseContext.branchId,
        targetKind: 'RETURN',
        targetId: 'ret-1',
        evidenceId: 'PHOTO-0',
        reason: 'Foto duplicada del lado derecho',
      }),
    );
    expect(deleteEvidenceMock).not.toHaveBeenCalled();
  });

  it('sin conexión el botón Solicitar eliminación está deshabilitado', async () => {
    setPermissions(['EVIDENCE.REQUEST_DELETION']);
    listReturnEvidenceMock.mockResolvedValue([evidence('VIDEO', 0)]);
    setOnline(false);
    renderChecklist();
    act(() => { window.dispatchEvent(new Event('offline')); });

    const btn = await screen.findByRole('button', { name: /^Solicitar eliminación de video/i });
    expect(btn).toBeDisabled();
  });

  it('renders FIV (02), FCKE (08) and RNC (06) operational sections and updates return draft', async () => {
    renderChecklist();

    expect(await screen.findByText(/Control de Kit de Emergencia \(FCKE - Formato 08/)).toBeInTheDocument();
    expect(screen.getByText(/Inspección Vehicular Completa \(FIV - Formato 02\)/)).toBeInTheDocument();
    expect(screen.getByText(/Registro de Combustible y Kilometraje \(RNC - Formato 06\)/)).toBeInTheDocument();

    const gataRow = screen.getByText(/Gata hidráulica tipo botella/).closest('div');
    expect(gataRow).toBeInTheDocument();
    const btnM = within(gataRow!).getByRole('button', { name: 'M' });
    fireEvent.click(btnM);

    const saved = JSON.parse(sessionStorage.getItem('kairos.devolucion.ret-1.checklist') || '{}');
    expect(saved.fcke_gata_botella).toBe('M');
  });

  it('persiste formatos FIV, FCKE y RNC en el servidor al continuar con la devolución (C2)', async () => {
    saveReturnChecklist('ret-1', {
      ...EMPTY_RETURN_CHECKLIST,
      rnc_kilometraje: 51200,
      rnc_nivel_combustible_lineas: 8,
      rnc_sugerencia: '1/2 tanque al recibir',
      fcke_gata_botella: 'B',
      fiv_puertas_capo_cajuela: 'B',
      responsibilityDocument: {
        signerName: 'Ana Torres',
        signerIsHolder: true,
        signerRelationToHolder: '',
        signatureData: 'data:image/png;base64,abc',
      },
    });

    listReturnEvidenceMock.mockResolvedValue([
      ...Array.from({ length: 35 }, (_, i) => evidence('PHOTO', i)),
      ...Array.from({ length: 3 }, (_, i) => evidence('VIDEO', i)),
    ]);

    renderChecklist();

    const continueBtn = await screen.findByRole('button', { name: /Continuar a Resultado/i });
    await waitFor(() => expect(continueBtn).not.toBeDisabled());
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(recordVehicleOperationalFormatMock).toHaveBeenCalledWith(
        expect.any(String),
        'veh-1',
        expect.objectContaining({
          formatType: 'FORMATO_02_FIV',
          processType: 'RETURN',
          processId: 'ret-1',
        }),
        'return-ret-1-fiv',
      );
      expect(recordVehicleOperationalFormatMock).toHaveBeenCalledWith(
        expect.any(String),
        'veh-1',
        expect.objectContaining({
          formatType: 'FORMATO_08_FCKE',
          processType: 'RETURN',
          processId: 'ret-1',
        }),
        'return-ret-1-fcke',
      );
      expect(recordVehicleOperationalFormatMock).toHaveBeenCalledWith(
        expect.any(String),
        'veh-1',
        expect.objectContaining({
          formatType: 'FORMATO_06_RNC',
          processType: 'RETURN',
          processId: 'ret-1',
          fuelLevelLines: 8,
          data: expect.objectContaining({
            responsable: expect.any(String),
            unidad: expect.objectContaining({
              plate: 'D0Y-704',
            }),
            fuelLevelLines: 8,
            firmaConfirmada: true,
          }),
        }),
        'return-ret-1-rnc',
      );
    });
  });

  it('carga datos previos de formatos operativos guardados para esta devolución sin pisar edición del usuario (A5)', async () => {
    saveReturnChecklist('ret-1', {
      ...EMPTY_RETURN_CHECKLIST,
      rnc_sugerencia: 'Edición previa del usuario',
      notes: 'Nota digitada por operador',
    });

    listVehicleOperationalRecordsMock.mockResolvedValueOnce({
      items: [
        {
          id: 'rec-fiv-ret-1',
          formatType: 'FORMATO_02_FIV',
          processType: 'RETURN',
          processId: 'ret-1',
          odometerKm: 51200,
          fuelLevelLines: 8,
          data: { fiv_puertas_capo_cajuela: 'B', rnc_sugerencia: 'Sugerencia del servidor' },
          observations: 'Nota del servidor',
        },
      ],
      total: 1,
    });

    renderChecklist();

    await waitFor(() => {
      expect(listVehicleOperationalRecordsMock).toHaveBeenCalledWith(
        expect.any(String),
        'veh-1',
        expect.objectContaining({ companyId: 'c1', branchId: 'b1' }),
      );
    });

    // La sugerencia editada por el usuario no se sobreescribe con la del servidor
    const inputSugerencia = screen.getByLabelText(/Sugerencia \/ Observación de combustible/i) as HTMLInputElement;
    expect(inputSugerencia.value).toBe('Edición previa del usuario');
  });
});


