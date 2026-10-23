import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FieldTripsListScreen } from './FieldTripsListScreen';
import { baseContext, makeTrip } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const listMock = vi.fn();

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./hr-client', async () => {
  const actual = await vi.importActual<typeof import('./hr-client')>('./hr-client');
  return { ...actual, listFieldTrips: (...a: unknown[]) => listMock(...a) };
});

function renderScreen(search = '') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/campo', search, state: baseContext }]}>
      <Routes>
        <Route path="/personal/campo" element={<FieldTripsListScreen />} />
        <Route path="/personal/campo/:tripId/autorizacion" element={<div>pantalla autorización</div>} />
        <Route path="/personal/campo/:tripId/regreso" element={<div>pantalla regreso</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FieldTripsListScreen', () => {
  beforeEach(() => {
    listMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.AUTHORIZE_FIELD_TRIP', 'HR_ADMINISTRATION.EVALUATE_FIELD_TRIP_RETURN']);
  });

  it('agrupa por autorizar, en campo y cerradas con enlaces a ADP-07 y ADP-08', async () => {
    listMock.mockResolvedValue([
      makeTrip({ id: 't1', employeeName: 'Ana', status: 'PENDIENTE_NIVEL_2', createdAt: '2026-10-09T10:00:00Z' }),
      makeTrip({ id: 't2', employeeName: 'Beto', status: 'AUTORIZADA', createdAt: '2026-10-09T09:00:00Z' }),
      makeTrip({ id: 't3', employeeName: 'Cleo', status: 'NO_AUTORIZADA', createdAt: '2026-10-09T08:00:00Z' }),
    ]);
    renderScreen();
    const pending = await screen.findByRole('region', { name: 'Por autorizar' });
    expect(within(pending).getByText('Ana', { exact: false })).toBeInTheDocument();
    expect(within(pending).getByRole('link', { name: /Abrir: Ana/ })).toHaveAttribute('href', '/personal/campo/t1/autorizacion');
    const out = screen.getByRole('region', { name: 'En campo, esperando el regreso' });
    expect(within(out).getByRole('link', { name: /Registrar regreso: Beto/ })).toHaveAttribute('href', '/personal/campo/t2/regreso');
    expect(screen.getByRole('region', { name: 'Cerradas o sin autorización' })).toHaveTextContent('Sin autorización');
  });

  it('sin permiso de evaluar el regreso no ofrece Registrar regreso', async () => {
    setPermissions(['HR_ADMINISTRATION.AUTHORIZE_FIELD_TRIP']);
    listMock.mockResolvedValue([makeTrip({ id: 't2', employeeName: 'Beto', status: 'AUTORIZADA' })]);
    renderScreen();
    await screen.findByRole('region', { name: 'En campo, esperando el regreso' });
    expect(screen.queryByRole('link', { name: /Registrar regreso/ })).not.toBeInTheDocument();
  });

  it('estado vacio, carga y acceso denegado', async () => {
    listMock.mockResolvedValueOnce([]);
    const { unmount } = renderScreen();
    expect(await screen.findByText(/Todavía no hay solicitudes de salida a campo/)).toBeInTheDocument();
    unmount();
    setPermissions([]);
    renderScreen();
    expect(screen.getByText(/No tienes acceso a las salidas a campo/)).toBeInTheDocument();
  });

  it('error recuperable', async () => {
    listMock.mockRejectedValue(new Error('x'));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar las salidas a campo/);
  });

  it('el deep link ?tripId= abre directamente la solicitud pendiente de autorización', async () => {
    listMock.mockResolvedValue([makeTrip({ id: 't1', employeeName: 'Ana', status: 'PENDIENTE_NIVEL_2' })]);
    renderScreen('?tripId=t1');
    expect(await screen.findByText('pantalla autorización')).toBeInTheDocument();
  });

  it('el deep link sin tripId (o con un id desconocido) deja la lista visible con las salidas por autorizar', async () => {
    listMock.mockResolvedValue([makeTrip({ id: 't1', employeeName: 'Ana', status: 'PENDIENTE_NIVEL_2' })]);
    renderScreen('?tripId=otro');
    expect(await screen.findByRole('region', { name: 'Por autorizar' })).toHaveTextContent('Ana');
  });
});
