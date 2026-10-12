import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VacanciesListScreen } from './VacanciesListScreen';
import { setPermissions } from '../../test/permissions';

const listVacanciesMock = vi.fn();
const registerVacancyMock = vi.fn();
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
    listVacancies: (...args: unknown[]) => listVacanciesMock(...args),
    registerVacancy: (...args: unknown[]) => registerVacancyMock(...args),
    pauseVacancy: (...args: unknown[]) => pauseVacancyMock(...args),
    resumeVacancy: (...args: unknown[]) => resumeVacancyMock(...args),
  };
});

const ctx = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' };

function makeVacancy(over: Record<string, unknown> = {}) {
  return {
    id: 'v1', code: 'VAC-001', title: 'Mecánico', department: 'Taller', source: 'RENUNCIA',
    status: 'NECESIDAD_REGISTRADA', isMechanic: true, version: 1, createdAt: '2026-10-05T10:00:00Z', ...over,
  };
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reclutamiento', state: ctx }]}>
      <Routes>
        <Route path="/reclutamiento" element={<VacanciesListScreen />} />
        <Route path="/reclutamiento/vacantes/:id" element={<div>perfil de vacante</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VacanciesListScreen (REC-01)', () => {
  beforeEach(() => {
    listVacanciesMock.mockReset();
    registerVacancyMock.mockReset();
    pauseVacancyMock.mockReset();
    resumeVacancyMock.mockReset();
    setPermissions(['RECRUITMENT.VIEW_VACANCY', 'RECRUITMENT.CREATE_VACANCY']);
  });

  it('muestra la tabla con puesto, area, fuente (texto) y estado', async () => {
    listVacanciesMock.mockResolvedValue([makeVacancy(), makeVacancy({ id: 'v2', title: 'Asesor', source: 'NUEVA_AREA', status: 'PUBLICADA' })]);
    renderScreen();
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Mecánico')).toBeInTheDocument();
    expect(within(table).getByText('Renuncia')).toBeInTheDocument();
    expect(within(table).getByText('Área nueva')).toBeInTheDocument();
    expect(within(table).getByText('Publicada')).toBeInTheDocument();
  });

  it('sin CREATE_VACANCY no hay boton Crear necesidad', async () => {
    setPermissions(['RECRUITMENT.VIEW_VACANCY']);
    listVacanciesMock.mockResolvedValue([makeVacancy()]);
    renderScreen();
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'Crear necesidad' })).not.toBeInTheDocument();
  });

  it('sin VIEW_VACANCY muestra acceso denegado', () => {
    setPermissions([]);
    renderScreen();
    expect(screen.getByText(/No tienes acceso/)).toBeInTheDocument();
    expect(listVacanciesMock).not.toHaveBeenCalled();
  });

  it('estado vacio y error recuperable', async () => {
    listVacanciesMock.mockResolvedValueOnce([]);
    const { unmount } = renderScreen();
    expect(await screen.findByText(/Todavía no hay necesidades/)).toBeInTheDocument();
    unmount();
    listVacanciesMock.mockRejectedValueOnce(new Error('x'));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar/);
  });

  it('filtra por estado enviando el estado al servicio', async () => {
    listVacanciesMock.mockResolvedValue([makeVacancy()]);
    renderScreen();
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'PUBLICADA' } });
    await waitFor(() =>
      expect(listVacanciesMock).toHaveBeenLastCalledWith('fake-id-token', { companyId: 'c1', branchId: 'b1' }, expect.objectContaining({ status: 'PUBLICADA' })),
    );
  });

  it('crear necesidad exige fuente y navega al perfil', async () => {
    listVacanciesMock.mockResolvedValue([makeVacancy()]);
    registerVacancyMock.mockResolvedValue(makeVacancy({ id: 'nuevo' }));
    renderScreen();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Crear necesidad' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuar a perfil' }));
    expect(registerVacancyMock).not.toHaveBeenCalled();
    expect(within(dialog).getByText('Elige el motivo de la necesidad.')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByLabelText('Crecimiento'));
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^Área/ }), { target: { value: 'Ventas' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^Puesto/ }), { target: { value: 'Asesor' } });
    fireEvent.click(within(dialog).getByLabelText('Es puesto de mecánico'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuar a perfil' }));

    expect(await screen.findByText('perfil de vacante')).toBeInTheDocument();
    expect(registerVacancyMock).toHaveBeenCalledWith(
      'fake-id-token',
      { companyId: 'c1', branchId: 'b1' },
      { title: 'Asesor', department: 'Ventas', source: 'CRECIMIENTO', isMechanic: true },
    );
  });

  describe('Pausar / Reanudar', () => {
    beforeEach(() => {
      setPermissions(['RECRUITMENT.VIEW_VACANCY', 'RECRUITMENT.PUBLISH_VACANCY']);
    });

    it('ofrece Pausar solo en vacantes publicadas y actualiza la fila al confirmar', async () => {
      listVacanciesMock.mockResolvedValue([
        makeVacancy({ id: 'v1', status: 'PUBLICADA', version: 2 }),
        makeVacancy({ id: 'v2', title: 'Asesor', status: 'NECESIDAD_REGISTRADA' }),
      ]);
      pauseVacancyMock.mockResolvedValue({ ...makeVacancy({ id: 'v1', status: 'PAUSADA', version: 3 }) });
      renderScreen();
      await screen.findByRole('table');
      expect(screen.queryByRole('button', { name: 'Pausar Asesor' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Pausar Mecánico' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Pausar vacante' }));
      await waitFor(() =>
        expect(pauseVacancyMock).toHaveBeenCalledWith('fake-id-token', 'v1', 2, { companyId: 'c1', branchId: 'b1' }, undefined),
      );
      expect(await within(screen.getByRole('table')).findByText('Pausada')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reanudar Mecánico' })).toBeInTheDocument();
    });

    it('sin PUBLISH_VACANCY no aparece la acción', async () => {
      setPermissions(['RECRUITMENT.VIEW_VACANCY']);
      listVacanciesMock.mockResolvedValue([makeVacancy({ status: 'PUBLICADA' })]);
      renderScreen();
      await screen.findByRole('table');
      expect(screen.queryByRole('button', { name: /Pausar|Reanudar/ })).toBeNull();
    });

    it('el filtro de estado incluye Pausada', async () => {
      listVacanciesMock.mockResolvedValue([makeVacancy()]);
      renderScreen();
      await screen.findByRole('table');
      expect(within(screen.getByLabelText('Estado')).getByRole('option', { name: 'Pausada' })).toBeInTheDocument();
    });
  });
});
