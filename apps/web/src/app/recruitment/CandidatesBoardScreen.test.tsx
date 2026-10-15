import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CandidatesBoardScreen } from './CandidatesBoardScreen';
import { RecruitmentApiError, RecruitmentCommandError, type CandidateResponse } from './recruitment-client';
import { setPermissions } from '../../test/permissions';

const listCandidatesMock = vi.fn();
const getVacancyMock = vi.fn();
const changeStageMock = vi.fn();
const registerMock = vi.fn();
const uploadCvMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') },
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
    listCandidates: (...a: unknown[]) => listCandidatesMock(...a),
    getVacancy: (...a: unknown[]) => getVacancyMock(...a),
    changeCandidateStage: (...a: unknown[]) => changeStageMock(...a),
    registerCandidate: (...a: unknown[]) => registerMock(...a),
    uploadCandidateCv: (...a: unknown[]) => uploadCvMock(...a),
  };
});

const ctx = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Central' };

function cand(o: Partial<CandidateResponse> = {}): CandidateResponse {
  return {
    id: 'cand-1', vacancyId: 'vac-1', fullName: 'Ana Pérez', documentType: 'DNI', documentNumber: '12345678',
    stage: 'NUEVO', version: 2, createdAt: '2026-10-01T10:00:00Z', ...o,
  };
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reclutamiento/vacantes/vac-1/candidatos', state: ctx }]}>
      <Routes>
        <Route path="/reclutamiento/vacantes/:id/candidatos" element={<CandidatesBoardScreen />} />
        <Route path="/reclutamiento/candidatos/:id" element={<div>ficha</div>} />
        <Route path="/reclutamiento/candidatos/:id/decision" element={<div>pantalla decision</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CandidatesBoardScreen (REC-03)', () => {
  beforeEach(() => {
    [listCandidatesMock, getVacancyMock, changeStageMock, registerMock].forEach((m) => m.mockReset());
    getVacancyMock.mockResolvedValue({ title: 'Mecánico senior' });
    listCandidatesMock.mockResolvedValue([
      cand(),
      cand({ id: 'cand-2', fullName: 'Luis Rojas', stage: 'ENTREVISTA' }),
      cand({ id: 'cand-3', fullName: 'Marta Díaz', stage: 'DECISION', decision: 'RECHAZADO' }),
      cand({ id: 'cand-4', fullName: 'Pedro Sol', stage: 'DECISION' }),
    ]);
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE', 'RECRUITMENT.REGISTER_CANDIDATE', 'RECRUITMENT.DECIDE_CANDIDATE']);
  });

  it('muestra columnas, título de la vacante y no muestra puntajes ni filtro automático', async () => {
    renderScreen();
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /Mecánico senior/ })).toHaveTextContent('Mecánico senior');
    for (const s of ['Nuevo', 'Contactado', 'Entrevista', 'Decisión']) {
      expect(screen.getByRole('heading', { level: 2, name: new RegExp(`^${s}`) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /filtrar autom|match|puntaje/i })).toBeNull();
    expect(screen.queryByText(/\bmatch\b/i)).toBeNull();
  });

  it('mover ofrece solo etapas hacia adelante y llama al cliente con la versión', async () => {
    changeStageMock.mockResolvedValue(cand({ stage: 'CONTACTADO', version: 3 }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Mover a… Ana Pérez' }));
    const menu = screen.getByRole('list', { name: /Etapas disponibles para Ana/ });
    expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(['Contactado', 'Entrevista', 'Decisión']);
    fireEvent.click(within(menu).getByRole('button', { name: 'Contactado' }));
    await waitFor(() => expect(changeStageMock).toHaveBeenCalledWith('tok', 'cand-1', 2, { companyId: 'c1', branchId: 'b1' }, 'CONTACTADO'));
    expect(await screen.findByText(/Ana Pérez pasó a Contactado/)).toBeInTheDocument();
  });

  it('en la última etapa o con decisión no hay menú de mover', async () => {
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.queryByRole('button', { name: 'Mover a… Pedro Sol' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mover a… Marta Díaz' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Mover a… Luis Rojas' })).toBeInTheDocument();
  });

  it('sin REGISTER_CANDIDATE no hay crear ni mover', async () => {
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE']);
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.queryByRole('button', { name: 'Crear candidato' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Mover a…/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Abrir ficha de Ana Pérez' })).toBeInTheDocument();
  });

  it('"Ir a decisión" solo con DECIDE_CANDIDATE y en etapa Decisión sin decidir', async () => {
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.getAllByRole('button', { name: /Ir a decisión/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ir a decisión de Pedro Sol' }));
    expect(await screen.findByText('pantalla decision')).toBeInTheDocument();
  });

  it('en conflicto de versión recarga y avisa', async () => {
    changeStageMock.mockRejectedValue(new RecruitmentCommandError(409, { code: 'VERSION_CONFLICT' }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Mover a… Ana Pérez' }));
    fireEvent.click(screen.getByRole('button', { name: 'Entrevista' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Otra persona modificó/);
    await waitFor(() => expect(listCandidatesMock).toHaveBeenCalledTimes(2));
  });

  it('crear candidato exige campos y envía con DNI por defecto', async () => {
    registerMock.mockResolvedValue(cand({ id: 'cand-9', fullName: 'Nuevo Uno' }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Crear candidato' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear candidato' }));
    expect(registerMock).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Nombre completo'), { target: { value: 'Nuevo Uno' } });
    fireEvent.change(within(dialog).getByLabelText('Número de documento'), { target: { value: '99999999' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear candidato' }));
    await waitFor(() => expect(registerMock).toHaveBeenCalled());
    expect(registerMock.mock.calls[0][3]).toMatchObject({ fullName: 'Nuevo Uno', documentType: 'DNI', documentNumber: '99999999' });
    expect(registerMock.mock.calls[0][3]).not.toHaveProperty('cvDocumentId');
    expect(uploadCvMock).not.toHaveBeenCalled();
    expect(await screen.findByText('Nuevo Uno')).toBeInTheDocument();
  });

  it('crear candidato con CV lo sube justo después usando la versión devuelta', async () => {
    registerMock.mockResolvedValue(cand({ id: 'cand-9', fullName: 'Nuevo Uno', version: 1 }));
    uploadCvMock.mockResolvedValue(cand({ id: 'cand-9', fullName: 'Nuevo Uno', version: 2 }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Crear candidato' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Nombre completo'), { target: { value: 'Nuevo Uno' } });
    fireEvent.change(within(dialog).getByLabelText('Número de documento'), { target: { value: '99999999' } });
    const file = new File(['x'], 'cv.pdf', { type: 'application/pdf' });
    fireEvent.change(within(dialog).getByLabelText('CV (opcional)'), { target: { files: [file] } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear candidato' }));
    await waitFor(() => expect(uploadCvMock).toHaveBeenCalledWith('tok', 'cand-9', 1, { companyId: 'c1', branchId: 'b1' }, file));
    expect(registerMock.mock.calls[0][3]).not.toHaveProperty('cvFile');
    expect(await screen.findByText(/con su CV/)).toBeInTheDocument();
  });

  it('un CV inválido bloquea el alta y, si falla la subida, el candidato queda creado con aviso', async () => {
    registerMock.mockResolvedValue(cand({ id: 'cand-9', fullName: 'Nuevo Uno', version: 1 }));
    uploadCvMock.mockRejectedValue(new RecruitmentCommandError(400, { code: 'CANDIDATE_CV_INVALID_FILE' }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Crear candidato' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Nombre completo'), { target: { value: 'Nuevo Uno' } });
    fireEvent.change(within(dialog).getByLabelText('Número de documento'), { target: { value: '99999999' } });
    fireEvent.change(within(dialog).getByLabelText('CV (opcional)'), { target: { files: [new File(['x'], 'a.zip', { type: 'application/zip' })] } });
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/PDF, Word/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear candidato' }));
    expect(registerMock).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('CV (opcional)'), { target: { files: [new File(['x'], 'cv.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear candidato' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/se creó, pero el CV no se pudo subir/);
    expect(await screen.findByText('Nuevo Uno')).toBeInTheDocument();
  });

  it('403 muestra sin acceso; vacío muestra mensaje', async () => {
    listCandidatesMock.mockRejectedValue(new RecruitmentApiError(403));
    const { unmount } = renderScreen();
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument();
    unmount();
    listCandidatesMock.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText(/aún no tiene candidatos/)).toBeInTheDocument();
  });

  it('el filtro por etapa muestra solo esa columna', async () => {
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.change(screen.getByLabelText('Etapa'), { target: { value: 'ENTREVISTA' } });
    expect(screen.queryByText('Ana Pérez')).toBeNull();
    expect(screen.getByText('Luis Rojas')).toBeInTheDocument();
  });
});
