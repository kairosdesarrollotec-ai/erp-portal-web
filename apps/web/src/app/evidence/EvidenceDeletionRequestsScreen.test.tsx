import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { clearPermissions, setPermissions } from '../../test/permissions';
import { makeDeletionRequest } from './evidence-test-utils';
import { EvidenceDeletionError } from './evidence-client';

vi.mock('../shared/AppHeader', () => ({ AppHeader: () => <header>cabecera</header> }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { uid: 'me', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
const ctx = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' };
vi.mock('../admin/useWorkContextForAdmin', () => ({
  useWorkContextForAdmin: () => ({ context: ctx, loading: false }),
}));
const m = vi.hoisted(() => ({ list: vi.fn(), approve: vi.fn(), reject: vi.fn() }));
vi.mock('./evidence-client', async (orig) => ({
  ...(await orig<typeof import('./evidence-client')>()),
  listEvidenceDeletionRequests: (...a: unknown[]) => m.list(...a),
  approveEvidenceDeletion: (...a: unknown[]) => m.approve(...a),
  rejectEvidenceDeletion: (...a: unknown[]) => m.reject(...a),
}));

import { EvidenceDeletionRequestsScreen } from './EvidenceDeletionRequestsScreen';

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: '/evidencia/solicitudes', state: ctx }]}>
        <Routes>
          <Route path="/evidencia/solicitudes" element={<EvidenceDeletionRequestsScreen />} />
          <Route path="/alquileres/:id/entrega-04" element={<div>pantalla entrega-04</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const toDecide = makeDeletionRequest({ id: 'r-pending' });
const secondStep = makeDeletionRequest({
  id: 'r-second',
  evidenceId: 'ev-2',
  evidence: { type: 'VIDEO', zone: 'POSTERIOR', uploadedBy: 'u', uploadedAt: '2026-10-22T10:00:00Z' },
  status: 'APPROVED_1',
  firstApprovedBy: 'uid-a',
  firstApprovedAt: '2026-10-22T11:00:00Z',
});
const mineClosed = makeDeletionRequest({
  id: 'r-mine',
  evidenceId: 'ev-3',
  requestedBy: 'me',
  status: 'REJECTED',
  rejectionReason: 'No procede',
  viewer: { canApprove: false, canReject: false },
});

beforeEach(() => {
  clearPermissions();
  setPermissions(['EVIDENCE.APPROVE_DELETION']);
  Object.values(m).forEach((fn) => fn.mockReset());
  m.list.mockResolvedValue([toDecide, secondStep, mineClosed]);
});

describe('EvidenceDeletionRequestsScreen', () => {
  it('muestra por defecto las solicitudes pendientes de mi decisión', async () => {
    const { container } = renderScreen();
    const rows = await screen.findAllByTestId('evidence-request-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Pendiente de 1.ª aprobación')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Falta la 2.ª aprobación')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('link', { name: 'Abrir expediente' })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('"Mis solicitudes" muestra las propias aunque ya estén cerradas', async () => {
    renderScreen();
    await screen.findAllByTestId('evidence-request-row');
    fireEvent.click(screen.getByRole('tab', { name: 'Mis solicitudes' }));
    const rows = await screen.findAllByTestId('evidence-request-row');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('Rechazada')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/Rechazo: No procede/)).toBeInTheDocument();
    expect(within(rows[0]).queryByRole('button', { name: /Aprobar/ })).not.toBeInTheDocument();
  });

  it('la primera aprobación pide confirmación reforzada y avisa que falta la segunda', async () => {
    m.approve.mockResolvedValue({ ...toDecide, status: 'APPROVED_1' });
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Aprobar eliminación de FRONTAL/ }));
    expect(screen.getByText(/PRIMERA aprobación/)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Aprobar' });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Entiendo/));
    fireEvent.click(confirm);
    await waitFor(() => expect(m.approve).toHaveBeenCalledWith('tok', 'r-pending', { companyId: 'c1', branchId: 'b1' }));
    expect(await screen.findByText(/Falta la aprobación de una segunda persona/)).toBeInTheDocument();
  });

  it('la segunda aprobación advierte que la eliminación es definitiva', async () => {
    m.approve.mockResolvedValue({ ...secondStep, status: 'EXECUTED' });
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Aprobar eliminación de POSTERIOR/ }));
    expect(screen.getByText(/SEGUNDA aprobación/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Entiendo/));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y eliminar' }));
    expect(await screen.findByText(/la evidencia fue eliminada/)).toBeInTheDocument();
  });

  it('rechazar exige motivo', async () => {
    m.reject.mockResolvedValue({ ...toDecide, status: 'REJECTED' });
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Rechazar eliminación de FRONTAL/ }));
    const submit = screen.getByRole('button', { name: 'Rechazar solicitud' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Motivo del rechazo/), { target: { value: 'La foto sí sirve' } });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(m.reject).toHaveBeenCalledWith('tok', 'r-pending', { companyId: 'c1', branchId: 'b1', reason: 'La foto sí sirve' }),
    );
    expect(await screen.findByText(/Solicitud rechazada/)).toBeInTheDocument();
  });

  it('traduce el 403 de segundo aprobador repetido', async () => {
    m.approve.mockRejectedValue(new EvidenceDeletionError(403, { code: 'EVIDENCE_DELETION_SAME_APPROVER', detail: 'x' }));
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Aprobar eliminación de POSTERIOR/ }));
    fireEvent.click(screen.getByLabelText(/Entiendo/));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y eliminar' }));
    expect(await screen.findByText(/debe darla una persona distinta/)).toBeInTheDocument();
  });

  it('estado EMPTY cuando no hay nada por decidir', async () => {
    m.list.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText(/no hay solicitudes esperando tu decisión/)).toBeInTheDocument();
  });

  it('estado ERROR con reintento', async () => {
    m.list.mockRejectedValueOnce(new EvidenceDeletionError(500, null)).mockResolvedValue([toDecide]);
    renderScreen();
    expect(await screen.findByText('No pudimos cargar las solicitudes.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findAllByTestId('evidence-request-row')).toHaveLength(1);
  });

  it('estado FORBIDDEN sin permisos de evidencia (no consulta al back)', async () => {
    setPermissions([]);
    renderScreen();
    expect(await screen.findByText(/No tienes permiso para ver las solicitudes/)).toBeInTheDocument();
    expect(m.list).not.toHaveBeenCalled();
  });

  it('estado FORBIDDEN si el back responde 403', async () => {
    m.list.mockRejectedValue(new EvidenceDeletionError(403, { code: 'ROLE_NOT_ALLOWED', detail: 'x' }));
    renderScreen();
    expect(await screen.findByText(/No tienes permiso para ver las solicitudes/)).toBeInTheDocument();
  });
});
