import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProbationScreen } from './ProbationScreen';
import { RecruitmentCommandError } from './recruitment-client';
import { baseContext, makeCandidate, makeOnboarding, setMobile, setupUser } from './flow-test-utils';
import { setPermissions } from '../../test/permissions';

const getCandidateMock = vi.fn();
const evaluateMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { uid: 'me', email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
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
    evaluateProbation: (...a: unknown[]) => evaluateMock(...a),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reclutamiento/candidatos/cand-1/periodo-de-prueba', state: baseContext }]}>
      <Routes>
        <Route path="/reclutamiento/candidatos/:id/periodo-de-prueba" element={<ProbationScreen />} />
        <Route path="/reclutamiento/candidatos/:id/incorporacion" element={<div>pantalla de incorporacion</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const withOnboarding = (o = {}) => makeCandidate({ decision: 'CONTRATADO', onboarding: makeOnboarding(o) });
function recentStart(): string {
  const start = new Date();
  start.setDate(start.getDate() - 10);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
}

describe('ProbationScreen (REC-08)', () => {
  beforeEach(() => {
    getCandidateMock.mockReset();
    evaluateMock.mockReset();
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE', 'RECRUITMENT.EVALUATE_PROBATION']);
    setMobile(false);
  });

  it('sin incorporación completada no hay evaluación', async () => {
    getCandidateMock.mockResolvedValue(makeCandidate({ decision: 'CONTRATADO' }));
    renderScreen();
    expect(await screen.findByText(/empieza cuando se confirma el ingreso/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Evaluación cualitativa')).toBeNull();
  });

  it('muestra los días que faltan, sin honorarios, y "Pasar a planilla" deshabilitado', async () => {
    getCandidateMock.mockResolvedValue(withOnboarding({ startDate: recentStart() }));
    renderScreen();
    expect(await screen.findByText(/Mes 3 \(faltan \d+ días\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pasar a planilla' })).toBeDisabled();
    expect(screen.getByText('Disponible tras la evaluación del mes 3')).toBeInTheDocument();
    expect(screen.queryByText(/honorario/i)).toBeNull();
  });

  it('antes de los 3 meses pide confirmación extra y tras evaluar positivo muestra "Pasó a planilla"', async () => {
    const user = setupUser();
    const iso = recentStart();
    getCandidateMock.mockResolvedValue(withOnboarding({ startDate: iso }));
    evaluateMock.mockResolvedValue(makeOnboarding());
    renderScreen();

    const positive = await screen.findByRole('button', { name: 'Registrar evaluación positiva' });
    expect(positive).toBeDisabled();
    await user.type(screen.getByLabelText('Evaluación cualitativa'), 'Muy buen desempeño');
    await user.click(positive);
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar evaluación positiva' });
    expect(confirm).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox'));
    expect(confirm).toBeEnabled();
    getCandidateMock.mockResolvedValue(
      withOnboarding({ startDate: iso, probationPassed: true, probationEvaluation: 'Muy buen desempeño', probationEvaluatedAt: '2026-10-07T10:00:00Z' }),
    );
    await user.click(confirm);
    await waitFor(() =>
      expect(evaluateMock).toHaveBeenCalledWith('fake-id-token', 'cand-1', { companyId: 'c1', branchId: 'b1' }, true, 'Muy buen desempeño'),
    );
    expect(await screen.findByText('Pasó a planilla')).toBeInTheDocument();
    expect(screen.getByText('Positiva')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pasar a planilla' })).toBeNull();
    expect(screen.queryByLabelText('Evaluación cualitativa')).toBeNull();
  });

  it('cumplidos los 3 meses no pide confirmación extra y la negativa envía passed=false', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(withOnboarding({ startDate: '2025-01-01' }));
    evaluateMock.mockResolvedValue(makeOnboarding());
    renderScreen();
    await user.type(await screen.findByLabelText('Evaluación cualitativa'), 'No cumple');
    await user.click(screen.getByRole('button', { name: 'Registrar evaluación negativa' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar evaluación negativa' }));
    await waitFor(() => expect(evaluateMock).toHaveBeenCalled());
    expect(evaluateMock.mock.calls[0][3]).toBe(false);
  });

  it('ya evaluada negativa: badge con texto y sin formulario', async () => {
    getCandidateMock.mockResolvedValue(
      withOnboarding({ startDate: '2025-01-01', probationPassed: false, probationEvaluation: 'No cumple', probationEvaluatedAt: '2026-10-07T10:00:00Z' }),
    );
    renderScreen();
    expect(await screen.findByText('Negativa')).toBeInTheDocument();
    expect(screen.getByText('No cumple')).toBeInTheDocument();
    expect(screen.queryByLabelText('Evaluación cualitativa')).toBeNull();
    expect(screen.getByRole('button', { name: 'Pasar a planilla' })).toBeDisabled();
  });

  it('sin EVALUATE_PROBATION no se puede evaluar', async () => {
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE']);
    getCandidateMock.mockResolvedValue(withOnboarding({ startDate: '2025-01-01' }));
    renderScreen();
    expect(await screen.findByText(/Solo el personal autorizado puede evaluar/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar evaluación positiva' })).toBeNull();
  });

  it('PROBATION_ALREADY_EVALUATED se muestra en lenguaje de negocio', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(withOnboarding({ startDate: '2025-01-01' }));
    evaluateMock.mockRejectedValue(new RecruitmentCommandError(422, { code: 'PROBATION_ALREADY_EVALUATED' }));
    renderScreen();
    await user.type(await screen.findByLabelText('Evaluación cualitativa'), 'ok');
    await user.click(screen.getByRole('button', { name: 'Registrar evaluación positiva' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar evaluación positiva' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El periodo de prueba ya fue evaluado.');
  });
});
