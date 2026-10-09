import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FieldTripAuthorizationScreen } from './FieldTripAuthorizationScreen';
import { HrCommandError } from './hr-client';
import { baseContext, makeTrip } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getTripMock = vi.fn();
const authorizeMock = vi.fn();
const advanceMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./hr-client', async () => {
  const actual = await vi.importActual<typeof import('./hr-client')>('./hr-client');
  return {
    ...actual,
    getFieldTrip: (...a: unknown[]) => getTripMock(...a),
    authorizeFieldTrip: (...a: unknown[]) => authorizeMock(...a),
    advanceFieldTripTimeout: (...a: unknown[]) => advanceMock(...a),
  };
});

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000 + 500).toISOString();

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/campo/trip-1/autorizacion', state: baseContext }]}>
      <Routes>
        <Route path="/personal/campo/:tripId/autorizacion" element={<FieldTripAuthorizationScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FieldTripAuthorizationScreen (ADP-07)', () => {
  beforeEach(() => {
    getTripMock.mockReset();
    authorizeMock.mockReset();
    advanceMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.AUTHORIZE_FIELD_TRIP']);
  });

  it('muestra motivo, nivel actual "Nivel 1 de 3 · Fiorella" y el contador de 5 minutos', async () => {
    getTripMock.mockResolvedValue(makeTrip({ level1TimeoutAt: inMinutes(4) }));
    renderScreen();
    expect(await screen.findByText('Inspección técnica')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nivel 1 de 3 · Fiorella' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/0[34]:\d\d/);
    expect(screen.getByText(/Cada nivel tiene 5 minutos/)).toBeInTheDocument();
    expect(advanceMock).not.toHaveBeenCalled();
  });

  it('el foco inicial esta en el boton Aprobar y autoriza con el nivel pendiente', async () => {
    getTripMock.mockResolvedValue(makeTrip({ status: 'PENDIENTE_NIVEL_2', level2TimeoutAt: inMinutes(3) }));
    authorizeMock.mockResolvedValue(makeTrip({ status: 'AUTORIZADA', authorizationLevel: 2, authorizedByName: 'José' }));
    renderScreen();
    const approve = await screen.findByRole('button', { name: 'Aprobar' });
    await waitFor(() => expect(approve).toHaveFocus());
    expect(screen.getByRole('heading', { name: 'Nivel 2 de 3 · José' })).toBeInTheDocument();
    fireEvent.click(approve);
    await waitFor(() => expect(authorizeMock).toHaveBeenCalledWith('tok', 'trip-1', 2));
    expect(await screen.findByText(/Salida autorizada en el nivel 2 de 3 por José/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
  });

  it('nunca ofrece un cuarto nivel ni aprobacion automatica ni "Rechazar" que el contrato no tiene', async () => {
    getTripMock.mockResolvedValue(makeTrip({ status: 'PENDIENTE_NIVEL_3', level3TimeoutAt: inMinutes(2) }));
    renderScreen();
    await screen.findByRole('heading', { name: 'Nivel 3 de 3 · Cecilia' });
    expect(screen.queryByText(/nivel 4|4º|cuarto/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Rechazar/ })).not.toBeInTheDocument();
  });

  it('sin AUTHORIZE_FIELD_TRIP solo se ve el estado (sin boton)', async () => {
    setPermissions(['HR_ADMINISTRATION.REQUEST_FIELD_TRIP']);
    getTripMock.mockResolvedValue(makeTrip({ level1TimeoutAt: inMinutes(4) }));
    renderScreen();
    await screen.findByRole('heading', { name: 'Nivel 1 de 3 · Fiorella' });
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
  });

  it('al vencer el plazo pide al SERVIDOR que avance la cascada (no calcula el nivel en el cliente)', async () => {
    getTripMock.mockResolvedValue(makeTrip({ level1TimeoutAt: new Date(Date.now() - 1000).toISOString() }));
    advanceMock.mockResolvedValue(makeTrip({ status: 'PENDIENTE_NIVEL_2', level2TimeoutAt: inMinutes(5) }));
    renderScreen();
    await waitFor(() => expect(advanceMock).toHaveBeenCalledWith('tok', 'trip-1'));
    expect(await screen.findByRole('heading', { name: 'Nivel 2 de 3 · José' })).toBeInTheDocument();
    expect(advanceMock).toHaveBeenCalledTimes(1);
  });

  it('quien solo tiene REQUEST_FIELD_TRIP no pide avanzar la cascada (el servidor exige AUTHORIZE_FIELD_TRIP)', async () => {
    setPermissions(['HR_ADMINISTRATION.REQUEST_FIELD_TRIP']);
    getTripMock.mockResolvedValue(makeTrip({ level1TimeoutAt: new Date(Date.now() - 1000).toISOString() }));
    renderScreen();
    await screen.findByRole('heading', { name: 'Nivel 1 de 3 · Fiorella' });
    await new Promise((r) => setTimeout(r, 50));
    expect(advanceMock).not.toHaveBeenCalled();
  });

  it('si el servidor dice que el plazo aun no vence (reloj adelantado) reintenta sin mostrar error', async () => {
    getTripMock.mockResolvedValue(makeTrip({ level1TimeoutAt: new Date(Date.now() - 1000).toISOString() }));
    advanceMock.mockRejectedValue(new HrCommandError(409, { code: 'FIELD_TRIP_TIMEOUT_NOT_ELAPSED' }));
    renderScreen();
    await waitFor(() => expect(advanceMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('si los 3 niveles no responden muestra "Sin autorización" y ningun boton de aprobar', async () => {
    getTripMock.mockResolvedValue(makeTrip({ status: 'NO_AUTORIZADA' }));
    renderScreen();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sin autorización');
    expect(alert).toHaveTextContent('La persona no puede salir');
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('muestra el error de negocio si la salida ya no esta pendiente', async () => {
    getTripMock.mockResolvedValue(makeTrip({ level1TimeoutAt: inMinutes(4) }));
    authorizeMock.mockRejectedValue(new HrCommandError(409, { code: 'FIELD_TRIP_NOT_PENDING' }));
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ya no está esperando autorización/);
  });

  it('sin permisos de campo: acceso denegado', () => {
    setPermissions([]);
    renderScreen();
    expect(screen.getByText(/No tienes acceso a las autorizaciones/)).toBeInTheDocument();
    expect(getTripMock).not.toHaveBeenCalled();
  });

  it('carga y error recuperable', async () => {
    getTripMock.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderScreen();
    expect(await screen.findByText(/Cargando la solicitud/)).toBeInTheDocument();
    unmount();
    getTripMock.mockReset().mockRejectedValue(new Error('x'));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar la solicitud/);
  });
});
