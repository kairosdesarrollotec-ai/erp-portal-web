import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CandidateFileScreen } from './CandidateFileScreen';
import { RecruitmentApiError, RecruitmentCommandError, type CandidateDetail } from './recruitment-client';
import { setPermissions } from '../../test/permissions';

const getCandidateMock = vi.fn();
const changeStageMock = vi.fn();
const decideMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') },
  }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./recruitment-client', async () => {
  const actual = await vi.importActual<typeof import('./recruitment-client')>('./recruitment-client');
  return {
    ...actual,
    getCandidate: (...a: unknown[]) => getCandidateMock(...a),
    changeCandidateStage: (...a: unknown[]) => changeStageMock(...a),
    decideCandidate: (...a: unknown[]) => decideMock(...a),
  };
});

const ctx = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Central' };
const ALL = ['VIEW_CANDIDATE', 'VIEW_CANDIDATE_SENSITIVE_DATA', 'REGISTER_CANDIDATE', 'DECIDE_CANDIDATE'].map((a) => `RECRUITMENT.${a}`);

function detail(o: Partial<CandidateDetail> = {}): CandidateDetail {
  return {
    id: 'cand-1', vacancyId: 'vac-1', fullName: 'Ana Pérez', documentType: 'DNI', documentNumber: '12345678',
    stage: 'NUEVO', version: 4, createdAt: '2026-10-01T10:00:00Z',
    email: 'ana@correo.pe', phone: '999111222', cvDocumentId: 'abcdef12-0000-0000-0000-000000000000',
    salaryExpectation: 2500, isRestrictedView: false, interviews: [],
    ...o,
  } as CandidateDetail;
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reclutamiento/candidatos/cand-1', state: ctx }]}>
      <Routes>
        <Route path="/reclutamiento/candidatos/:id" element={<CandidateFileScreen />} />
        <Route path="/reclutamiento/candidatos/:id/entrevista" element={<div>pantalla entrevista</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CandidateFileScreen (REC-04)', () => {
  beforeEach(() => {
    [getCandidateMock, changeStageMock, decideMock].forEach((m) => m.mockReset());
    getCandidateMock.mockResolvedValue(detail());
    setPermissions(ALL);
  });

  it('muestra datos generales y sensibles con permiso, con foco en el título', async () => {
    renderScreen();
    const title = await screen.findByRole('heading', { level: 1, name: 'Ana Pérez' });
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByText('ana@correo.pe')).toBeInTheDocument();
    expect(screen.getByText('999111222')).toBeInTheDocument();
    expect(screen.getByText(/código abcdef12/)).toBeInTheDocument();
    expect(screen.getByText(/2.?500/)).toBeInTheDocument();
  });

  it('enmascara datos sensibles si la vista es restringida y deja el resto visible', async () => {
    getCandidateMock.mockResolvedValue(detail({ isRestrictedView: true, email: null, phone: null, salaryExpectation: null, cvDocumentId: null }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.getAllByText(/Este dato requiere permiso adicional/)).toHaveLength(4);
    expect(screen.getByText(/12345678/)).toBeInTheDocument();
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('enmascara si falta el permiso sensible aunque el back envíe datos', async () => {
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE']);
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.queryByText('ana@correo.pe')).toBeNull();
    expect(screen.getAllByText(/Este dato requiere permiso adicional/)).toHaveLength(4);
  });

  it('Acordar y continuar mueve a Entrevista y navega', async () => {
    changeStageMock.mockResolvedValue({});
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Acordar y continuar' }));
    expect(await screen.findByText('pantalla entrevista')).toBeInTheDocument();
    expect(changeStageMock).toHaveBeenCalledWith('tok', 'cand-1', 4, { companyId: 'c1', branchId: 'b1' }, 'ENTREVISTA');
  });

  it('si ya está en Entrevista solo navega, y sin permiso no aparece', async () => {
    getCandidateMock.mockResolvedValue(detail({ stage: 'ENTREVISTA' }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Acordar y continuar' }));
    expect(await screen.findByText('pantalla entrevista')).toBeInTheDocument();
    expect(changeStageMock).not.toHaveBeenCalled();
  });

  it('sin REGISTER_CANDIDATE no hay Acordar; sin DECIDE_CANDIDATE no hay Descartar', async () => {
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE']);
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.queryByRole('button', { name: 'Acordar y continuar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
  });

  it('con conflicto de versión al acordar recarga y avisa sin navegar', async () => {
    changeStageMock.mockRejectedValue(new RecruitmentCommandError(409, { code: 'VERSION_CONFLICT' }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Acordar y continuar' }));
    await waitFor(() => expect(getCandidateMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Otra persona modificó/)).toBeInTheDocument();
    expect(screen.queryByText('pantalla entrevista')).toBeNull();
  });

  it('Descartar exige motivo, avisa que es irreversible y llama a decidir RECHAZADO', async () => {
    decideMock.mockResolvedValue(detail({ decision: 'RECHAZADO', version: 5 }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/irreversible/)).toBeInTheDocument();
    const confirm = within(dialog).getByRole('button', { name: 'Descartar candidato' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Motivo del descarte'), { target: { value: 'No cumple el perfil' } });
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(decideMock).toHaveBeenCalledWith('tok', 'cand-1', 4, { companyId: 'c1', branchId: 'b1' }, 'RECHAZADO', 'No cumple el perfil'),
    );
    expect(await screen.findByText('No contratado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
  });

  it('con decisión existente no se puede descartar', async () => {
    getCandidateMock.mockResolvedValue(detail({ decision: 'CONTRATADO' }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
  });

  it('403 y 404 muestran su pantalla', async () => {
    getCandidateMock.mockRejectedValue(new RecruitmentApiError(403));
    const { unmount } = renderScreen();
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument();
    unmount();
    getCandidateMock.mockRejectedValue(new RecruitmentApiError(404));
    renderScreen();
    expect(await screen.findByText('No encontramos al candidato')).toBeInTheDocument();
  });

  it('lista las entrevistas realizadas en solo lectura', async () => {
    getCandidateMock.mockResolvedValue(detail({
      interviews: [{ id: 'i1', candidateId: 'cand-1', scheduledAt: '2026-10-03T15:00:00Z', isVirtual: true, result: 'AVANZA', createdAt: '2026-10-01T00:00:00Z' }],
    }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.getByRole('heading', { name: 'Entrevistas' })).toBeInTheDocument();
    expect(screen.getByText(/Virtual · Avanza/)).toBeInTheDocument();
  });
});
