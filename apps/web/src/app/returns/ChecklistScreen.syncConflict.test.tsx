/**
 * DEV-04 - SYNC_CONFLICT (TR-08 / sync.yaml): el estado SYNCED lo confirma el servidor y un conflicto abierto
 * mantiene deshabilitado «Continuar a Resultado» hasta que un supervisor lo resuelva.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChecklistScreen } from './ChecklistScreen';
import { baseContext, makeFlow, makeReturn } from './test-utils';
import { setPermissions } from '../../test/permissions';
import { EMPTY_RETURN_CHECKLIST, saveReturnChecklist } from './return-session-draft';
import { SyncCommandError } from '../sync/sync-client';
import { makeConflict, syncedStatus } from '../sync/sync-test-utils';

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
const status = vi.hoisted(() => ({ get: vi.fn(), resolve: vi.fn() }));
vi.mock('../sync/sync-client', async (orig) => ({
  ...(await orig<typeof import('../sync/sync-client')>()),
  getChecklistSyncStatus: (...a: unknown[]) => status.get(...a),
  resolveSyncConflict: (...a: unknown[]) => status.resolve(...a),
}));
const flowMock = vi.fn();
const listReturnEvidenceMock = vi.fn();
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('t') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./useReturnFlow', () => ({ useReturnFlow: () => flowMock() }));
vi.mock('../../offline/queue/evidence-upload-queue', () => ({ addEvidenceToQueue: vi.fn() }));
vi.mock('../../offline/queue/sync-draft-store', () => ({ saveFieldEdit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../offline/synchronization/use-sync-manager', () => ({
  useSyncManager: () => ({ syncing: false, pendingCount: 0, failedCount: 0, triggerSync: vi.fn(), refreshCounts: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('./returns-client', async () => {
  const actual = await vi.importActual<typeof import('./returns-client')>('./returns-client');
  return {
    ...actual,
    listReturnEvidence: (...a: unknown[]) => listReturnEvidenceMock(...a),
    getResponsibilityTemplate: vi.fn().mockResolvedValue({ type: 'STANDARD', name: 'Doc', content: '', version: 1 }),
  };
});

const BASE = ['RETURN.READ', 'RETURN.UPLOAD_EVIDENCE', 'RETURN.COMPLETE_INSPECTION'];
const conflict = makeConflict({ checklistType: 'RECEPCION', sourceId: 'ret-1', rentalId: 'rent-1' });
const full = () => [
  ...Array.from({ length: 35 }, (_, i) => ({ id: `p${i}`, returnId: 'ret-1', type: 'PHOTO', zone: 'FRONTAL', objectUrl: 'u', createdAt: '2026-10-19T10:00:00Z' })),
  ...Array.from({ length: 3 }, (_, i) => ({ id: `v${i}`, returnId: 'ret-1', type: 'VIDEO', zone: 'FRONTAL', objectUrl: 'u', createdAt: '2026-10-19T10:00:00Z' })),
];

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/devoluciones/ret-1/checklist', state: baseContext }]}>
      <Routes>
        <Route path="/devoluciones/:id/checklist" element={<ChecklistScreen />} />
        <Route path="/devoluciones/:id/resultado" element={<div>pantalla resultado</div>} />
      </Routes>
    </MemoryRouter>,
  );
}
const next = () => screen.getByRole('button', { name: 'Continuar a Resultado' });

beforeEach(() => {
  [flowMock, listReturnEvidenceMock, status.get, status.resolve].forEach((m) => m.mockReset());
  sessionStorage.clear();
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  saveReturnChecklist('ret-1', {
    ...EMPTY_RETURN_CHECKLIST,
    responsibilityDocument: { signerName: 'Maria', signerIsHolder: true, signerRelationToHolder: '', signatureData: 'data:image/png;base64,F' },
  });
  setPermissions([...BASE, 'RETURN.CLOSE']);
  flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ status: 'INSPECCION' }) }));
  listReturnEvidenceMock.mockResolvedValue(full());
});

describe('DEV-04 ChecklistScreen + sync.yaml', () => {
  it('conflicto abierto: muestra la tarjeta, avisa y mantiene «Continuar a Resultado» deshabilitado aunque haya 35+3', async () => {
    status.get.mockResolvedValue(syncedStatus('RECEPCION', 'ret-1', { status: 'SYNC_CONFLICT', openConflicts: [conflict] }));
    renderScreen();
    expect(await screen.findByTestId('sync-conflict-card')).toBeInTheDocument();
    expect(screen.getByText(/Hay conflictos de sincronización/)).toBeInTheDocument();
    expect(screen.queryByText('Confirmado por el servidor — recepción completa')).not.toBeInTheDocument();
    expect(next()).toBeDisabled();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('el supervisor resuelve (RETURN.CLOSE), el servidor confirma SYNCED y recien ahi se habilita Continuar', async () => {
    status.get.mockResolvedValueOnce(syncedStatus('RECEPCION', 'ret-1', { status: 'SYNC_CONFLICT', openConflicts: [conflict] }));
    status.get.mockResolvedValue(syncedStatus('RECEPCION', 'ret-1', { serverConfirmedAt: '2026-10-19T16:00:00Z', stateVersion: 2 }));
    status.resolve.mockResolvedValue({ conflict: { ...conflict, status: 'RESOLVED' }, checklistStatus: 'SYNCED', serverConfirmedAt: '2026-10-19T16:00:00Z', openConflicts: 0 });
    renderScreen();
    await screen.findByTestId('sync-conflict-card');
    fireEvent.click(screen.getByRole('button', { name: 'Conservar del servidor' }));
    fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'Verificado con el supervisor de sede' } });
    fireEvent.click(screen.getByRole('checkbox'));
    // con el modal abierto el resto de la pagina queda aria-hidden (foco atrapado)
    expect(screen.getByRole('button', { name: 'Continuar a Resultado', hidden: true })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y resolver' }));
    await waitFor(() => expect(status.resolve).toHaveBeenCalledTimes(1));
    expect(status.resolve.mock.calls[0][2]).toMatchObject({ companyId: 'c1', branchId: 'b1', resolution: 'KEEP_SERVER', confirmed: true });
    await waitFor(() => expect(next()).toBeEnabled());
    expect(screen.queryByTestId('sync-conflict-card')).not.toBeInTheDocument();
    fireEvent.click(next());
    expect(await screen.findByText('pantalla resultado')).toBeInTheDocument();
  });

  it('sin permiso de supervisor no puede resolver y Continuar sigue bloqueado', async () => {
    setPermissions(BASE);
    status.get.mockResolvedValue(syncedStatus('RECEPCION', 'ret-1', { status: 'SYNC_CONFLICT', openConflicts: [conflict] }));
    renderScreen();
    const card = await screen.findByTestId('sync-conflict-card');
    expect(within(card).getByRole('button', { name: 'Conservar la mía' })).toBeDisabled();
    expect(within(card).getByRole('button', { name: 'Conservar del servidor' })).toBeDisabled();
    expect(next()).toBeDisabled();
  });

  it('412 al resolver recarga el estado del servidor y avisa en lenguaje de negocio', async () => {
    status.get.mockResolvedValue(syncedStatus('RECEPCION', 'ret-1', { status: 'SYNC_CONFLICT', openConflicts: [conflict] }));
    status.resolve.mockRejectedValue(new SyncCommandError(412, { code: 'SYNC_CONFLICT_VERSION_MISMATCH' }));
    renderScreen();
    await screen.findByTestId('sync-conflict-card');
    const before = status.get.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Conservar la mía' }));
    fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'Mi versión es la correcta' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y resolver' }));
    expect(await screen.findByText(/El conflicto cambió mientras lo revisabas/)).toBeInTheDocument();
    await waitFor(() => expect(status.get.mock.calls.length).toBeGreaterThan(before));
  });

  it('expediente que uso el flujo offline: SYNCED confirmado por el servidor + conteos habilita Continuar', async () => {
    status.get.mockResolvedValue(syncedStatus('RECEPCION', 'ret-1', { serverConfirmedAt: '2026-10-19T16:00:00Z', stateVersion: 3 }));
    renderScreen();
    expect(await screen.findByText('Confirmado por el servidor — recepción completa')).toBeInTheDocument();
    expect(next()).toBeEnabled();
  });

  it('respaldo: sin flujo offline (serverConfirmedAt nulo) rige el criterio de conteos', async () => {
    status.get.mockResolvedValue(syncedStatus('RECEPCION', 'ret-1'));
    listReturnEvidenceMock.mockResolvedValue(full().slice(1));
    renderScreen();
    expect(await screen.findByText(/Faltan 1 fotos/)).toBeInTheDocument();
    expect(next()).toBeDisabled();
  });

  it('si el estado /sync no se puede consultar, no se da por SYNCED (deny-by-default)', async () => {
    status.get.mockRejectedValue(new SyncCommandError(500, null));
    renderScreen();
    expect(await screen.findByText(/«Continuar a Resultado» se habilita cuando el servidor confirme/)).toBeInTheDocument();
    expect(next()).toBeDisabled();
  });
});
