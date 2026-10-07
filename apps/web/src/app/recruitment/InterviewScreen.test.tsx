import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InterviewScreen } from './InterviewScreen';
import { baseContext, makeCandidate, makeInterview, setMobile, setupUser } from './flow-test-utils';
import { setPermissions } from '../../test/permissions';

const getCandidateMock = vi.fn();
const scheduleMock = vi.fn();
const recordMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { uid: 'me-uid', email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
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
    scheduleInterview: (...a: unknown[]) => scheduleMock(...a),
    recordInterviewResult: (...a: unknown[]) => recordMock(...a),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reclutamiento/candidatos/cand-1/entrevista', state: baseContext }]}>
      <Routes>
        <Route path="/reclutamiento/candidatos/:id/entrevista" element={<InterviewScreen />} />
        <Route path="/reclutamiento/candidatos/:id/decision" element={<div>pantalla de decision</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InterviewScreen (REC-05)', () => {
  beforeEach(() => {
    getCandidateMock.mockReset();
    scheduleMock.mockReset();
    recordMock.mockReset();
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE', 'RECRUITMENT.MANAGE_INTERVIEW']);
    setMobile(false);
  });

  it('no ofrece puntaje numérico: notas libres y Avanza / No avanza; foco inicial en las notas', async () => {
    getCandidateMock.mockResolvedValue(makeCandidate({ interviews: [makeInterview()] }));
    renderScreen();

    const notes = await screen.findByLabelText('Notas de la entrevista');
    await waitFor(() => expect(notes).toHaveFocus());
    expect(screen.getByRole('radio', { name: 'Avanza' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'No avanza' })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByText(/puntaje|calificaci/i)).toBeNull();
    expect(document.querySelector('input[type="number"], input[type="range"]')).toBeNull();
  });

  it('"Registrar resultado" exige notas y resultado, y llama al cliente', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(makeCandidate({ interviews: [makeInterview()] }));
    recordMock.mockResolvedValue(makeInterview({ result: 'AVANZA' }));
    renderScreen();

    const submit = await screen.findByRole('button', { name: 'Registrar resultado' });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('Notas de la entrevista'), '  Buen perfil ');
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Avanza' }));
    expect(submit).toBeEnabled();
    getCandidateMock.mockResolvedValue(
      makeCandidate({ interviews: [makeInterview({ result: 'AVANZA', qualitativeNotes: 'Buen perfil' })] }),
    );
    await user.click(submit);

    await waitFor(() =>
      expect(recordMock).toHaveBeenCalledWith('fake-id-token', 'int-1', { companyId: 'c1', branchId: 'b1' }, 'AVANZA', 'Buen perfil'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Resultado registrado.');
    await user.click(await screen.findByRole('button', { name: 'Ir a la decisión' }));
    expect(await screen.findByText('pantalla de decision')).toBeInTheDocument();
  });

  it('agenda una videollamada con el usuario actual como entrevistador y duración solo referencial', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(makeCandidate());
    scheduleMock.mockResolvedValue(makeInterview());
    renderScreen();

    const button = await screen.findByRole('button', { name: 'Agendar entrevista' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/~15 min/)).toBeInTheDocument();
    expect(screen.getByLabelText('Entrevistador (código de usuario)')).toHaveValue('me-uid');
    await user.type(screen.getByLabelText('Fecha y hora'), '2026-10-10T09:00');
    await user.type(screen.getByLabelText('Enlace de la videollamada'), 'https://meet.google.com/xyz');
    expect(button).toBeEnabled();
    await user.click(button);

    await waitFor(() => expect(scheduleMock).toHaveBeenCalledTimes(1));
    const [, id, scope, input] = scheduleMock.mock.calls[0];
    expect(id).toBe('cand-1');
    expect(scope).toEqual({ companyId: 'c1', branchId: 'b1' });
    expect(input).toMatchObject({ isVirtual: true, meetUrl: 'https://meet.google.com/xyz', interviewerId: 'me-uid' });
    expect(new Date(input.scheduledAt).toString()).not.toBe('Invalid Date');
  });

  it('presencial pide dirección en lugar del enlace', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(makeCandidate());
    renderScreen();
    await user.click(await screen.findByRole('radio', { name: 'Presencial' }));
    expect(screen.getByLabelText('Dirección')).toBeInTheDocument();
    expect(screen.queryByLabelText('Enlace de la videollamada')).toBeNull();
  });

  it('sin MANAGE_INTERVIEW no hay formularios de agendar ni de resultado', async () => {
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE']);
    getCandidateMock.mockResolvedValue(makeCandidate({ interviews: [makeInterview()] }));
    renderScreen();
    expect(await screen.findByRole('list', { name: 'Agenda de entrevistas' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agendar entrevista' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Registrar resultado' })).toBeNull();
  });
});
