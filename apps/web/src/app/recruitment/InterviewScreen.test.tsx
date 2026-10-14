import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InterviewScreen } from './InterviewScreen';
import { baseContext, makeCandidate, makeInterview, setMobile, setupUser } from './flow-test-utils';
import { setPermissions } from '../../test/permissions';

const getCandidateMock = vi.fn();
const scheduleMock = vi.fn();
const recordMock = vi.fn();
const interviewersMock = vi.fn();
const ME = { id: 'me-uid', fullName: 'Yo Mismo' };
const OTHER = { id: 'user-2', fullName: 'Lucía Paredes' };

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { uid: 'me-uid', email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
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
    scheduleInterview: (...a: unknown[]) => scheduleMock(...a),
    recordInterviewResult: (...a: unknown[]) => recordMock(...a),
    listInterviewers: (...a: unknown[]) => interviewersMock(...a),
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
    interviewersMock.mockReset();
    interviewersMock.mockResolvedValue([OTHER, ME]);
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
    const combo = screen.getByRole('combobox', { name: 'Entrevistador' });
    await waitFor(() => expect(combo).toHaveValue('Yo Mismo'));
    expect(interviewersMock.mock.calls[0].slice(0, 3)).toEqual(['fake-id-token', { companyId: 'c1', branchId: 'b1' }, undefined]);
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

  it('el buscador filtra con q y envía el id del entrevistador elegido', async () => {
    const user = setupUser();
    getCandidateMock.mockResolvedValue(makeCandidate());
    scheduleMock.mockResolvedValue(makeInterview());
    renderScreen();

    const combo = await screen.findByRole('combobox', { name: 'Entrevistador' });
    await waitFor(() => expect(combo).toHaveValue('Yo Mismo'));
    interviewersMock.mockResolvedValue([OTHER]);
    await user.type(combo, 'luc');
    await waitFor(() => expect(interviewersMock.mock.calls.at(-1)?.[2]).toBe('luc'));
    const option = await screen.findByRole('option', { name: 'Lucía Paredes' });
    // Sin elegir nadie, no se puede agendar.
    await user.type(screen.getByLabelText('Fecha y hora'), '2026-10-10T09:00');
    await user.type(screen.getByLabelText('Enlace de la videollamada'), 'https://meet.google.com/xyz');
    expect(screen.getByRole('button', { name: 'Agendar entrevista' })).toBeDisabled();
    fireEvent.mouseDown(option);
    expect(combo).toHaveValue('Lucía Paredes');
    await user.click(screen.getByRole('button', { name: 'Agendar entrevista' }));
    await waitFor(() => expect(scheduleMock).toHaveBeenCalledTimes(1));
    expect(scheduleMock.mock.calls[0][3]).toMatchObject({ interviewerId: 'user-2' });
  });

  it('si el usuario actual no está en la lista no se preselecciona a nadie', async () => {
    interviewersMock.mockResolvedValue([OTHER]);
    getCandidateMock.mockResolvedValue(makeCandidate());
    renderScreen();
    const combo = await screen.findByRole('combobox', { name: 'Entrevistador' });
    await waitFor(() => expect(interviewersMock).toHaveBeenCalled());
    expect(combo).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Agendar entrevista' })).toBeDisabled();
  });

  it('lista vacía muestra un mensaje claro', async () => {
    interviewersMock.mockResolvedValue([]);
    getCandidateMock.mockResolvedValue(makeCandidate());
    renderScreen();
    expect(await screen.findByText('No hay entrevistadores disponibles en esta sede.')).toBeInTheDocument();
  });

  it('si falla la carga muestra el error y permite reintentar', async () => {
    const user = setupUser();
    interviewersMock.mockRejectedValueOnce(new Error('boom'));
    getCandidateMock.mockResolvedValue(makeCandidate());
    renderScreen();
    expect(await screen.findByText(/No pudimos cargar los entrevistadores/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Entrevistador' })).toHaveValue('Yo Mismo'));
    expect(screen.queryByText(/No pudimos cargar los entrevistadores/)).toBeNull();
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
