import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProbationScreen } from './ProbationScreen';
import { RecruitmentCommandError } from './recruitment-client';
import { baseContext, makeCandidate, makeOnboarding, setMobile, setupUser } from './flow-test-utils';
import { setPermissions } from '../../test/permissions';

const getCandidateMock = vi.fn();
const evaluateMock = vi.fn();
const setFeesMock = vi.fn();

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
    evaluateProbation: (...a: unknown[]) => evaluateMock(...a),
    setProbationFees: (...a: unknown[]) => setFeesMock(...a),
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
    setFeesMock.mockReset();
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE', 'RECRUITMENT.EVALUATE_PROBATION', 'RECRUITMENT.TERMINATE_PROBATION']);
    setMobile(false);
  });

  it('sin incorporación completada no hay evaluación', async () => {
    getCandidateMock.mockResolvedValue(makeCandidate({ decision: 'CONTRATADO' }));
    renderScreen();
    expect(await screen.findByText(/empieza cuando se confirma el ingreso/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Evaluación cualitativa')).toBeNull();
  });

  it('muestra los días que faltan, "Pasar a planilla" deshabilitado', async () => {
    getCandidateMock.mockResolvedValue(withOnboarding({ startDate: recentStart() }));
    renderScreen();
    expect(await screen.findByText(/Mes 3 \(faltan \d+ días\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pasar a planilla' })).toBeDisabled();
    expect(screen.getByText('Disponible tras la evaluación del mes 3')).toBeInTheDocument();
    expect(screen.getByText('Todavía no se registraron los honorarios de la prueba.')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Registrar término por prueba negativa' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar evaluación negativa' }));
    await waitFor(() => expect(evaluateMock).toHaveBeenCalled());
    expect(evaluateMock.mock.calls[0][3]).toBe(false);
  });

  it('sin TERMINATE_PROBATION (solo Gerencia General) no ofrece registrar el término, pero sí la evaluación positiva', async () => {
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE', 'RECRUITMENT.EVALUATE_PROBATION']);
    getCandidateMock.mockResolvedValue(withOnboarding({ startDate: '2025-01-01' }));
    renderScreen();
    expect(await screen.findByRole('button', { name: 'Registrar evaluación positiva' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar término por prueba negativa' })).toBeNull();
    expect(screen.getByText(/término por prueba negativa lo registra Gerencia General/)).toBeInTheDocument();
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

  describe('Honorarios de la prueba', () => {
    const SENSITIVE = ['RECRUITMENT.VIEW_CANDIDATE', 'RECRUITMENT.EVALUATE_PROBATION', 'RECRUITMENT.VIEW_CANDIDATE_SENSITIVE_DATA'];

    it('sin permiso financiero solo muestra el candado y ningún monto', async () => {
      getCandidateMock.mockResolvedValue(withOnboarding({ startDate: recentStart(), feesRestricted: true }));
      renderScreen();
      const card = (await screen.findByRole('heading', { name: 'Honorarios de la prueba' })).closest('section') as HTMLElement;
      expect(within(card).getByText(/Este dato requiere permiso adicional/)).toBeInTheDocument();
      expect(within(card).queryByRole('button')).toBeNull();
    });

    it('con permiso muestra los honorarios registrados', async () => {
      setPermissions(SENSITIVE);
      getCandidateMock.mockResolvedValue(withOnboarding({
        startDate: recentStart(), probationMonthlyFee: 1800, postProbationMonthlySalary: 2300,
        probationFeeNotes: 'Medio tiempo', probationFeesRecordedAt: '2026-10-07T10:00:00Z',
      }));
      renderScreen();
      const card = (await screen.findByRole('heading', { name: 'Honorarios de la prueba' })).closest('section') as HTMLElement;
      expect(within(card).getByText(/1.?800/)).toBeInTheDocument();
      expect(within(card).getByText(/2.?300/)).toBeInTheDocument();
      expect(within(card).getByText('Medio tiempo')).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: 'Editar honorarios' })).toBeInTheDocument();
    });

    it('captura honorarios con la versión de la incorporación y recarga', async () => {
      setPermissions(SENSITIVE);
      getCandidateMock.mockResolvedValue(withOnboarding({ startDate: recentStart(), version: 3 }));
      setFeesMock.mockResolvedValue(makeOnboarding({ version: 4, probationMonthlyFee: 1800 }));
      renderScreen();
      fireEvent.click(await screen.findByRole('button', { name: 'Registrar honorarios' }));
      fireEvent.click(screen.getByRole('button', { name: 'Guardar honorarios' }));
      expect(screen.getByText(/Indica los honorarios mensuales/)).toBeInTheDocument();
      expect(setFeesMock).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText('Honorarios mensuales (S/)'), { target: { value: '1800' } });
      fireEvent.change(screen.getByLabelText('Jornada o notas (opcional)'), { target: { value: ' Medio tiempo ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar honorarios' }));
      await waitFor(() => expect(setFeesMock).toHaveBeenCalled());
      expect(setFeesMock).toHaveBeenCalledWith('fake-id-token', 'cand-1', 3, { companyId: 'c1', branchId: 'b1' }, {
        probationMonthlyFee: 1800, probationFeeNotes: 'Medio tiempo',
      });
      expect(await screen.findByText('Honorarios del periodo de prueba registrados.')).toBeInTheDocument();
      await waitFor(() => expect(getCandidateMock).toHaveBeenCalledTimes(2));
    });

    it('sin VIEW_CANDIDATE_SENSITIVE_DATA no se ofrece capturar; evaluada queda en solo lectura', async () => {
      getCandidateMock.mockResolvedValue(withOnboarding({ startDate: recentStart() }));
      const { unmount } = renderScreen();
      await screen.findByRole('heading', { name: 'Honorarios de la prueba' });
      expect(screen.queryByRole('button', { name: 'Registrar honorarios' })).toBeNull();
      unmount();
      setPermissions(SENSITIVE);
      getCandidateMock.mockResolvedValue(withOnboarding({
        startDate: recentStart(), probationPassed: true, probationEvaluation: 'ok', probationMonthlyFee: 1800,
      }));
      renderScreen();
      await screen.findByText(/no se pueden modificar/);
      expect(screen.queryByRole('button', { name: 'Editar honorarios' })).toBeNull();
    });

    it('muestra el error del servidor al guardar', async () => {
      setPermissions(SENSITIVE);
      getCandidateMock.mockResolvedValue(withOnboarding({ startDate: recentStart() }));
      setFeesMock.mockRejectedValue(new RecruitmentCommandError(403, { code: 'ROLE_NOT_ALLOWED' }));
      renderScreen();
      fireEvent.click(await screen.findByRole('button', { name: 'Registrar honorarios' }));
      fireEvent.change(screen.getByLabelText('Honorarios mensuales (S/)'), { target: { value: '1500' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar honorarios' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/rol no puede/);
    });
  });
});
