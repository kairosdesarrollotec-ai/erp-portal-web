import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VacancyProfileScreen } from './VacancyProfileScreen';
import { RecruitmentCommandError } from './recruitment-client';
import { setPermissions } from '../../test/permissions';

const getVacancyMock = vi.fn();
const publishVacancyMock = vi.fn();
const pauseVacancyMock = vi.fn();
const resumeVacancyMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
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
    getVacancy: (...args: unknown[]) => getVacancyMock(...args),
    publishVacancy: (...args: unknown[]) => publishVacancyMock(...args),
    pauseVacancy: (...args: unknown[]) => pauseVacancyMock(...args),
    resumeVacancy: (...args: unknown[]) => resumeVacancyMock(...args),
  };
});

const ctx = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' };

function makeDetail(over: Record<string, unknown> = {}) {
  return {
    id: 'v1', code: 'VAC-001', title: 'Asesor', department: 'Ventas', source: 'CRECIMIENTO',
    status: 'NECESIDAD_REGISTRADA', isMechanic: false, version: 4, createdAt: '2026-10-05T10:00:00Z',
    profileDescription: null, baseSalary: null, scheduleDetails: null, publishedChannels: [], candidatesCount: 0, ...over,
  };
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reclutamiento/vacantes/v1', state: ctx }]}>
      <Routes>
        <Route path="/reclutamiento/vacantes/:id" element={<VacancyProfileScreen />} />
        <Route path="/reclutamiento/vacantes/:id/candidatos" element={<div>tablero de candidatos</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillBasics() {
  fireEvent.change(screen.getByLabelText('Funciones principales'), { target: { value: 'Atender clientes' } });
  fireEvent.change(screen.getByLabelText('Sueldo base (S/)'), { target: { value: '1500' } });
  fireEvent.change(screen.getByLabelText('Horario'), { target: { value: 'L-V 9 a 6' } });
}

describe('VacancyProfileScreen (REC-02)', () => {
  beforeEach(() => {
    getVacancyMock.mockReset();
    publishVacancyMock.mockReset();
    pauseVacancyMock.mockReset();
    resumeVacancyMock.mockReset();
    setPermissions(['RECRUITMENT.VIEW_VACANCY', 'RECRUITMENT.PUBLISH_VACANCY']);
  });

  it('muestra los datos de la vacante y oculta institutos tecnicos si no es mecanico', async () => {
    getVacancyMock.mockResolvedValue(makeDetail());
    renderScreen();
    expect(await screen.findByText('VAC-001')).toBeInTheDocument();
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Institutos técnicos/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pausar/ })).not.toBeInTheDocument();
  });

  it('para mecanico exige institutos tecnicos antes de publicar', async () => {
    getVacancyMock.mockResolvedValue(makeDetail({ isMechanic: true }));
    renderScreen();
    await screen.findByText('VAC-001');
    fillBasics();
    fireEvent.click(screen.getByLabelText('Facebook'));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(publishVacancyMock).not.toHaveBeenCalled();
    expect(screen.getByText(/debe publicarse también en institutos técnicos/)).toBeInTheDocument();
  });

  it('publica enviando la version del detalle y muestra el aviso', async () => {
    getVacancyMock.mockResolvedValue(makeDetail({ isMechanic: true }));
    publishVacancyMock.mockResolvedValue(
      makeDetail({ isMechanic: true, status: 'PUBLICADA', version: 5, publishedChannels: ['Facebook', 'Institutos técnicos'] }),
    );
    renderScreen();
    await screen.findByText('VAC-001');
    fillBasics();
    fireEvent.click(screen.getByLabelText('Facebook'));
    fireEvent.click(screen.getByLabelText(/Institutos técnicos/));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() =>
      expect(publishVacancyMock).toHaveBeenCalledWith(
        'fake-id-token',
        'v1',
        4,
        { companyId: 'c1', branchId: 'b1' },
        {
          profileDescription: 'Atender clientes',
          baseSalary: 1500,
          scheduleDetails: 'L-V 9 a 6',
          channels: ['Facebook', 'Institutos técnicos'],
        },
      ),
    );
    expect(await screen.findByText('Vacante publicada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
  });

  it('conflicto de version: informa y recarga el detalle', async () => {
    getVacancyMock.mockResolvedValue(makeDetail());
    publishVacancyMock.mockRejectedValue(new RecruitmentCommandError(409, { code: 'VERSION_CONFLICT' }));
    renderScreen();
    await screen.findByText('VAC-001');
    fillBasics();
    fireEvent.click(screen.getByLabelText('Facebook'));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    expect(await screen.findByText(/Otra persona modificó este registro/)).toBeInTheDocument();
    await waitFor(() => expect(getVacancyMock).toHaveBeenCalledTimes(2));
  });

  it('vacante publicada: solo lectura con enlace a candidatos', async () => {
    getVacancyMock.mockResolvedValue(
      makeDetail({ status: 'PUBLICADA', profileDescription: 'Atender', baseSalary: 1500, scheduleDetails: 'L-V', publishedChannels: ['Facebook'] }),
    );
    renderScreen();
    expect(await screen.findByText('Vacante publicada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver candidatos' }));
    expect(await screen.findByText('tablero de candidatos')).toBeInTheDocument();
  });

  it('sin PUBLISH_VACANCY no hay boton Publicar; error de carga es recuperable', async () => {
    setPermissions(['RECRUITMENT.VIEW_VACANCY']);
    getVacancyMock.mockResolvedValueOnce(makeDetail());
    const { unmount } = renderScreen();
    await screen.findByText('VAC-001');
    expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
    unmount();
    getVacancyMock.mockRejectedValueOnce(new Error('x'));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar la vacante/);
  });

  it('pausa y reanuda una vacante publicada con confirmación y avisa el resultado', async () => {
    getVacancyMock.mockResolvedValue(makeDetail({ status: 'PUBLICADA', baseSalary: 1500 }));
    pauseVacancyMock.mockResolvedValue(makeDetail({ status: 'PAUSADA', version: 5 }));
    resumeVacancyMock.mockResolvedValue(makeDetail({ status: 'PUBLICADA', version: 6 }));
    renderScreen();
    await screen.findByText('VAC-001');
    fireEvent.click(screen.getByRole('button', { name: 'Pausar Asesor' }));
    let dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pausar vacante' }));
    expect(await screen.findByText('La vacante quedó pausada.')).toBeInTheDocument();
    expect(pauseVacancyMock).toHaveBeenCalledWith('fake-id-token', 'v1', 4, { companyId: 'c1', branchId: 'b1' }, undefined);
    expect(screen.getByText('Pausada')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reanudar Asesor' }));
    dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reanudar vacante' }));
    expect(await screen.findByText(/se reanudó/)).toBeInTheDocument();
    expect(resumeVacancyMock).toHaveBeenCalledWith('fake-id-token', 'v1', 5, { companyId: 'c1', branchId: 'b1' });
  });

  it('sin PUBLISH_VACANCY no se ofrece pausar', async () => {
    setPermissions(['RECRUITMENT.VIEW_VACANCY']);
    getVacancyMock.mockResolvedValue(makeDetail({ status: 'PUBLICADA' }));
    renderScreen();
    await screen.findByText('VAC-001');
    expect(screen.queryByRole('button', { name: /Pausar|Reanudar/ })).toBeNull();
  });
});
