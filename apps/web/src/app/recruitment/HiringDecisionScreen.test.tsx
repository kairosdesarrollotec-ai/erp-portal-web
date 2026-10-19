import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HiringDecisionScreen } from './HiringDecisionScreen';
import { RecruitmentCommandError } from './recruitment-client';
import { baseContext, makeCandidate, makeInterview, setMobile, setupUser } from './flow-test-utils';
import { setPermissions } from '../../test/permissions';

const getCandidateMock = vi.fn();
const decideMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { uid: 'me', email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
// AppHeader incluye la busqueda global (React Query); aqui no se prueba.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./recruitment-client', async () => {
  const actual = await vi.importActual<typeof import('./recruitment-client')>('./recruitment-client');
  return {
    ...actual,
    getCandidate: (...a: unknown[]) => getCandidateMock(...a),
    decideCandidate: (...a: unknown[]) => decideMock(...a),
  };
});

const interviews = [makeInterview({ result: 'AVANZA', qualitativeNotes: 'Excelente actitud' })];

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reclutamiento/candidatos/cand-1/decision', state: baseContext }]}>
      <Routes>
        <Route path="/reclutamiento/candidatos/:id/decision" element={<HiringDecisionScreen />} />
        <Route path="/reclutamiento/candidatos/:id/incorporacion" element={<div>pantalla de incorporacion</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HiringDecisionScreen (REC-06)', () => {
  beforeEach(() => {
    getCandidateMock.mockReset();
    decideMock.mockReset();
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE', 'RECRUITMENT.DECIDE_CANDIDATE']);
    setMobile(false);
  });

  it('muestra el resumen con entrevistas y notas en solo lectura', async () => {
    getCandidateMock.mockResolvedValue(makeCandidate({ interviews }));
    renderScreen();
    expect(await screen.findByText('Excelente actitud')).toBeInTheDocument();
    expect(screen.getByText('12345678', { exact: false })).toBeInTheDocument();
  });

  it('sin DECIDE_CANDIDATE los botones están deshabilitados y se avisa que es solo lectura', async () => {
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE']);
    getCandidateMock.mockResolvedValue(makeCandidate({ interviews }));
    renderScreen();
    expect(await screen.findByRole('button', { name: 'Contratar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'No contratar' })).toBeDisabled();
    expect(screen.getByText(/Solo Gerencia o RR\.HH\. pueden decidir/)).toBeInTheDocument();
  });

  it('con permiso, "Contratar" pide confirmación reforzada y decide con If-Match', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(makeCandidate({ interviews }));
    decideMock.mockResolvedValue(makeCandidate({ decision: 'CONTRATADO' }));
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Contratar' }));
    expect(decideMock).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('¿Confirmar contratación de Ana Torres?')).toBeInTheDocument();
    expect(within(dialog).getByText(/no se puede deshacer/)).toBeInTheDocument();

    getCandidateMock.mockResolvedValue(
      makeCandidate({ interviews, decision: 'CONTRATADO', decidedAt: '2026-10-06T12:00:00Z', version: 5 }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar contratación' }));
    await waitFor(() =>
      expect(decideMock).toHaveBeenCalledWith('fake-id-token', 'cand-1', 4, { companyId: 'c1', branchId: 'b1' }, 'CONTRATADO', undefined),
    );
    await user.click(await screen.findByRole('button', { name: 'Ir a incorporación' }));
    expect(await screen.findByText('pantalla de incorporacion')).toBeInTheDocument();
  });

  it('BDD-REC §11.6: sin entrevista registrada (En negociación) no se puede contratar, pero sí no contratar', async () => {
    getCandidateMock.mockResolvedValue(makeCandidate({ processState: 'EN_NEGOCIACION' }));
    renderScreen();
    const hire = await screen.findByRole('button', { name: 'Contratar' });
    expect(hire).toBeDisabled();
    expect(screen.getByText(/primero registra el resultado de la entrevista/)).toBeInTheDocument();
    expect(hire).toHaveAccessibleDescription(/primero registra el resultado de la entrevista/);
    expect(screen.getByRole('button', { name: 'No contratar' })).toBeEnabled();
  });

  it('con la entrevista registrada (Entrevistado) se puede contratar y no aparece el aviso', async () => {
    getCandidateMock.mockResolvedValue(makeCandidate({ processState: 'ENTREVISTADO', interviews }));
    renderScreen();
    expect(await screen.findByRole('button', { name: 'Contratar' })).toBeEnabled();
    expect(screen.queryByText(/primero registra el resultado de la entrevista/)).toBeNull();
  });

  it('un 422 CANDIDATE_STATE_TRANSITION_INVALID se explica en lenguaje de negocio', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(makeCandidate({ interviews }));
    decideMock.mockRejectedValue(new RecruitmentCommandError(422, { code: 'CANDIDATE_STATE_TRANSITION_INVALID' }));
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Contratar' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar contratación' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('primero registra el resultado de la entrevista');
  });

  it('"No contratar" confirma con su propio botón', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(makeCandidate({ interviews }));
    decideMock.mockResolvedValue(makeCandidate({ decision: 'RECHAZADO' }));
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'No contratar' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar que no se contrata' }));
    await waitFor(() => expect(decideMock).toHaveBeenCalled());
    expect(decideMock.mock.calls[0][4]).toBe('RECHAZADO');
  });

  it('con decisión previa no se puede volver a decidir y se muestra el resultado', async () => {
    getCandidateMock.mockResolvedValue(
      makeCandidate({ interviews, decision: 'RECHAZADO', processState: 'DESCARTADO', decidedAt: '2026-10-06T12:00:00Z' }),
    );
    renderScreen();
    expect(await screen.findByText('No contratado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Contratar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ir a incorporación' })).toBeNull();
  });

  it('un conflicto de versión (409) recarga la ficha y avisa', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(makeCandidate({ interviews }));
    decideMock.mockRejectedValue(new RecruitmentCommandError(409, { code: 'VERSION_CONFLICT' }));
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Contratar' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar contratación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Otra persona modificó este registro');
    await waitFor(() => expect(getCandidateMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
