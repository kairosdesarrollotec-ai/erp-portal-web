/** ENTREGA-04 - SYNC_CONFLICT (TR-08 / sync.yaml): misma pantalla de conflicto que DEV-04, permiso RENTAL.MANAGE_CONTRACT_TEMPLATES. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Stage4ChecklistScreen } from './Stage4ChecklistScreen';
import { setPermissions } from '../../test/permissions';
import { makeConflict, syncedStatus } from '../sync/sync-test-utils';

const status = vi.hoisted(() => ({ get: vi.fn(), resolve: vi.fn() }));
vi.mock('../sync/sync-client', async (orig) => ({
  ...(await orig<typeof import('../sync/sync-client')>()),
  getChecklistSyncStatus: (...a: unknown[]) => status.get(...a),
  resolveSyncConflict: (...a: unknown[]) => status.resolve(...a),
}));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('t') } }),
}));
const wizard = vi.fn();
vi.mock('./useRentalWizard', () => ({ useRentalWizard: () => wizard() }));
const listEvidence = vi.fn();
vi.mock('./rentals-client', async () => ({
  ...(await vi.importActual<typeof import('./rentals-client')>('./rentals-client')),
  listRentalEvidence: (...a: unknown[]) => listEvidence(...a),
}));
vi.mock('../../offline/queue/evidence-upload-queue', () => ({ addEvidenceToQueue: vi.fn() }));
vi.mock('../../offline/queue/sync-draft-store', () => ({ saveFieldEdit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../offline/synchronization/use-sync-manager', () => ({
  useSyncManager: () => ({ syncing: false, pendingCount: 0, failedCount: 0, triggerSync: vi.fn(), refreshCounts: vi.fn().mockResolvedValue(undefined) }),
}));

const ctx = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede' };
const conflict = makeConflict();
const ev = (type: 'PHOTO' | 'VIDEO', i: number) => ({ id: `${type}${i}`, rentalId: 'rent-1', type, zone: 'FRONTAL', objectUrl: 'u', uploadedBy: 'x', uploadedAt: '2026-10-19T10:00:00Z' });
const full = () => [...Array.from({ length: 35 }, (_, i) => ev('PHOTO', i)), ...Array.from({ length: 3 }, (_, i) => ev('VIDEO', i))];

function renderScreen() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[{ pathname: '/alquileres/rent-1/entrega-04', state: ctx }]}>
        <Routes>
          <Route path="/alquileres/:id/entrega-04" element={<Stage4ChecklistScreen />} />
          <Route path="/alquileres/:id/entrega-05" element={<div>etapa 5</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const next = () => screen.getByRole('button', { name: /^Continuar/ });

beforeEach(() => {
  [wizard, listEvidence, status.get, status.resolve].forEach((m) => m.mockReset());
  sessionStorage.clear();
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  setPermissions(['RENTAL.READ', 'RENTAL.UPLOAD_EVIDENCE', 'SYNC.SUPERVISE_CONFLICTS']);
  wizard.mockReturnValue({
    id: 'rent-1', state: 'READY', context: ctx, getIdToken: vi.fn().mockResolvedValue('tok'), setRental: vi.fn(), reload: vi.fn(),
    rental: { id: 'rent-1', status: 'PENDING_DELIVERY', customerName: 'Ana', customerDocNumber: '1', vehicleBrand: 'T', vehicleModel: 'Y', vehiclePlate: 'B2C-456', alcoholTestResult: 'FAVORABLE', version: 4, notaryEvaluation: null, contract: null, deposit: null },
  });
  listEvidence.mockResolvedValue(full());
  sessionStorage.setItem('kairos.alquiler.rent-1.checklist', JSON.stringify({ rnc_kilometraje: 50000, rnc_nivel_combustible_lineas: 8, technicalMinutes: 40, documentaryMinutes: 20, notes: '', exceptionReason: '' }));
});

describe('ENTREGA-04 Stage4ChecklistScreen + sync.yaml', () => {
  it('conflicto: misma tarjeta de TR-08, Continuar deshabilitado con 35+3 hasta que el servidor confirme', async () => {
    status.get.mockResolvedValueOnce(syncedStatus('ENTREGA', 'rent-1', { status: 'SYNC_CONFLICT', openConflicts: [conflict] }));
    status.get.mockResolvedValue(syncedStatus('ENTREGA', 'rent-1', { serverConfirmedAt: '2026-10-19T16:00:00Z' }));
    status.resolve.mockResolvedValue({ conflict: { ...conflict, status: 'RESOLVED' }, checklistStatus: 'SYNCED', serverConfirmedAt: '2026-10-19T16:00:00Z', openConflicts: 0 });
    renderScreen();
    const card = await screen.findByTestId('sync-conflict-card');
    expect(within(card).getByRole('group', { name: 'Tu versión (este dispositivo)' })).toBeInTheDocument();
    expect(within(card).getByRole('group', { name: 'Versión del servidor' })).toBeInTheDocument();
    expect(next()).toBeDisabled();
    expect(await axe(document.body)).toHaveNoViolations();

    fireEvent.click(within(card).getByRole('button', { name: 'Conservar la mía' }));
    fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'Confirmé la nota en sitio' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y resolver' }));
    await waitFor(() => expect(status.resolve).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(next()).toBeEnabled());
    expect(screen.queryByTestId('sync-conflict-card')).not.toBeInTheDocument();
  });

  it('sin SYNC.SUPERVISE_CONFLICTS no se puede resolver', async () => {
    setPermissions(['RENTAL.READ', 'RENTAL.UPLOAD_EVIDENCE']);
    status.get.mockResolvedValue(syncedStatus('ENTREGA', 'rent-1', { status: 'SYNC_CONFLICT', openConflicts: [conflict] }));
    renderScreen();
    const card = await screen.findByTestId('sync-conflict-card');
    expect(within(card).getByRole('button', { name: 'Conservar la mía' })).toBeDisabled();
    expect(next()).toBeDisabled();
  });

  it('respaldo: expediente sin flujo offline y 35+3 sigue habilitando Continuar', async () => {
    status.get.mockResolvedValue(syncedStatus('ENTREGA', 'rent-1'));
    renderScreen();
    await waitFor(() => expect(next()).toBeEnabled());
  });

  it('si /sync no responde no se habilita Continuar', async () => {
    status.get.mockRejectedValue(new Error('network'));
    renderScreen();
    expect(await screen.findByText(/se habilita cuando el servidor confirme/)).toBeInTheDocument();
    expect(next()).toBeDisabled();
  });
});
