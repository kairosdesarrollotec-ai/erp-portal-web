import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { clearPermissions, setPermissions } from '../../test/permissions';
import { makeConflict } from './sync-test-utils';

vi.mock('../shared/AppHeader', () => ({ AppHeader: () => <header>cabecera</header> }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
const ctx = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' };
vi.mock('../admin/useWorkContextForAdmin', () => ({
  useWorkContextForAdmin: () => ({ context: ctx, loading: false }),
}));
const listMock = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('./sync-client', async (orig) => ({
  ...(await orig<typeof import('./sync-client')>()),
  listSyncConflicts: (...a: unknown[]) => listMock.fn(...a),
}));

import { SyncCenterScreen } from './SyncCenterScreen';

const SUPERVISOR = ['SYNC.SUPERVISE_CONFLICTS'];

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: '/sincronizacion', state: ctx }]}>
        <Routes>
          <Route path="/sincronizacion" element={<SyncCenterScreen />} />
          <Route path="/alquileres/:id/entrega-04" element={<div>pantalla entrega-04</div>} />
          <Route path="/devoluciones/:id/checklist" element={<div>pantalla dev-04</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const delivery = makeConflict({ id: 'a1', auditRef: 'SYNC-ERR-AAAA1111', createdAt: '2026-10-19T15:06:00Z' });
const reception = makeConflict({
  id: 'b2',
  auditRef: 'SYNC-ERR-BBBB2222',
  checklistType: 'RECEPCION',
  sourceId: 'ret-77777777-aaaa',
  rentalId: 'rent-9',
  kind: 'EVIDENCE',
  key: 'FRONTAL#2',
  detectedBy: 'uid-9',
  createdAt: '2026-10-19T17:00:00Z',
});

beforeEach(() => {
  clearPermissions();
  setPermissions(SUPERVISOR);
  listMock.fn.mockReset();
  listMock.fn.mockImplementation(async (_t: string, p: { checklistType: string; status?: string }) => {
    if (p.status === 'RESOLVED') return [makeConflict({ id: 'r1', auditRef: 'SYNC-ERR-RRRR3333', status: 'RESOLVED' })];
    return p.checklistType === 'ENTREGA' ? [delivery] : [reception];
  });
});

describe('SyncCenterScreen (TR-08)', () => {
  it('lista los conflictos pendientes de Entrega y Recepción con etiquetas de negocio, más recientes primero', async () => {
    const { container } = renderScreen();
    const rows = await screen.findAllByTestId('sync-center-row');
    expect(rows).toHaveLength(2);
    // la Recepción (17:00) va antes que la Entrega (15:06)
    expect(within(rows[0]).getByText('SYNC-ERR-BBBB2222')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Evidencia (foto o video)')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Toma Frontal n.º 2')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Recepción')).toBeInTheDocument();
    expect(within(rows[0]).getByText('N.º ret-7777')).toBeInTheDocument();
    expect(within(rows[0]).getByText('uid-9')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Pendiente')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Dato del checklist')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Notas')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Entrega')).toBeInTheDocument();
    expect(listMock.fn).toHaveBeenCalledWith('tok', { companyId: 'c1', branchId: 'b1', checklistType: 'ENTREGA', status: 'OPEN' });
    expect(listMock.fn).toHaveBeenCalledWith('tok', { companyId: 'c1', branchId: 'b1', checklistType: 'RECEPCION', status: 'OPEN' });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('«Abrir expediente» lleva a ENTREGA-04 (por alquiler) y a DEV-04 (por devolución)', async () => {
    renderScreen();
    const rows = await screen.findAllByTestId('sync-center-row');
    expect(within(rows[0]).getByRole('link', { name: /Abrir expediente de Recepción/ })).toHaveAttribute(
      'href',
      '/devoluciones/ret-77777777-aaaa/checklist',
    );
    const toDelivery = within(rows[1]).getByRole('link', { name: /Abrir expediente de Entrega/ });
    expect(toDelivery).toHaveAttribute('href', '/alquileres/rent-1/entrega-04');
    fireEvent.click(toDelivery);
    expect(await screen.findByText('pantalla entrega-04')).toBeInTheDocument();
  });

  it('el filtro por estado consulta Resueltos y Todos', async () => {
    renderScreen();
    await screen.findAllByTestId('sync-center-row');
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'RESOLVED' } });
    expect(await screen.findAllByText('Resuelto')).not.toHaveLength(0);
    expect(listMock.fn).toHaveBeenCalledWith('tok', expect.objectContaining({ status: 'RESOLVED', checklistType: 'ENTREGA' }));
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'ALL' } });
    await waitFor(() => expect(listMock.fn).toHaveBeenCalledWith('tok', expect.objectContaining({ status: 'OPEN', checklistType: 'RECEPCION' })));
  });

  it('estado vacío: «Estás al día»', async () => {
    listMock.fn.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText(/Estás al día: no hay conflictos pendientes/)).toBeInTheDocument();
    expect(screen.queryByTestId('sync-center-row')).not.toBeInTheDocument();
  });

  it('estado de error con reintento', async () => {
    listMock.fn.mockRejectedValueOnce(new Error('boom')).mockRejectedValueOnce(new Error('boom'));
    renderScreen();
    expect(await screen.findByText('No pudimos cargar los conflictos de sincronización.')).toBeInTheDocument();
    listMock.fn.mockResolvedValue([delivery]);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect((await screen.findAllByTestId('sync-center-row')).length).toBeGreaterThan(0);
  });

  it('sin permiso de supervisor no consulta nada y avisa', async () => {
    clearPermissions();
    setPermissions(['RENTAL.READ', 'RETURN.READ']);
    renderScreen();
    expect(await screen.findByText(/Solo Administración y Gerencia pueden ver el centro de sincronización/)).toBeInTheDocument();
    expect(listMock.fn).not.toHaveBeenCalled();
  });

  it('con permisos legacy (sin SYNC.SUPERVISE_CONFLICTS) no consulta nada y avisa', async () => {
    clearPermissions();
    setPermissions(['RENTAL.MANAGE_CONTRACT_TEMPLATES', 'RETURN.CLOSE']);
    renderScreen();
    expect(await screen.findByText(/Solo Administración y Gerencia pueden ver el centro de sincronización/)).toBeInTheDocument();
    expect(listMock.fn).not.toHaveBeenCalled();
  });
});
