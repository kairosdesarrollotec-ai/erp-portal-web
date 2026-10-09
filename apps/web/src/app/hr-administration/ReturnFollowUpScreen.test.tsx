import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReturnFollowUpScreen } from './ReturnFollowUpScreen';
import { baseContext, makeDetail, makeTrip } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getTripMock = vi.fn();
const getEmployeeMock = vi.fn();
const evaluateMock = vi.fn();

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
    getEmployee: (...a: unknown[]) => getEmployeeMock(...a),
    evaluateFieldTripReturn: (...a: unknown[]) => evaluateMock(...a),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/campo/trip-1/regreso', state: baseContext }]}>
      <Routes>
        <Route path="/personal/campo/:tripId/regreso" element={<ReturnFollowUpScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

const ESTIMATED = '2026-10-09T17:00:00';
const trip = (o = {}) => makeTrip({ status: 'AUTORIZADA', estimatedReturn: new Date(ESTIMATED).toISOString(), ...o });
const setActual = (value: string) => fireEvent.change(screen.getByLabelText('Hora real de regreso'), { target: { value } });

describe('ReturnFollowUpScreen (ADP-08)', () => {
  beforeEach(() => {
    getTripMock.mockReset().mockResolvedValue(trip());
    getEmployeeMock.mockReset().mockResolvedValue(makeDetail({ fieldTripLateCount: 2 }));
    evaluateMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.EVALUATE_FIELD_TRIP_RETURN', 'HR_ADMINISTRATION.VIEW_EMPLOYEES']);
  });

  it('el contador de incumplimientos esta visible antes de decidir', async () => {
    renderScreen();
    const counter = await screen.findByTestId('contador-incumplimientos');
    expect(counter).toHaveTextContent('2 tardanzas previas');
    expect(counter).toHaveTextContent('la 4ª pasa a observado');
    expect(screen.getByText(/Esperando el regreso/)).toBeInTheDocument();
  });

  it('a tiempo: el boton es "Cerrar"', async () => {
    renderScreen();
    await screen.findByLabelText('Hora real de regreso');
    setActual('2026-10-09T16:50');
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

  it('3ª tardanza: advertencia; foco en el boton de accion', async () => {
    renderScreen();
    await screen.findByLabelText('Hora real de regreso');
    setActual('2026-10-09T17:45');
    const button = screen.getByRole('button', { name: 'Registrar esta tardanza como advertencia (3ª)' });
    await waitFor(() => expect(button).toHaveFocus());
    expect(screen.getByText(/Llegó 45 min tarde: sería la 3ª tardanza/)).toBeInTheDocument();
  });

  it('4ª tardanza: pasa a observado', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail({ fieldTripLateCount: 3 }));
    evaluateMock.mockResolvedValue(trip({ status: 'OBSERVADA', lateMinutes: 10 }));
    renderScreen();
    await screen.findByLabelText('Hora real de regreso');
    setActual('2026-10-09T17:10');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar tardanza (4ª) y marcar como observado' }));
    await waitFor(() => expect(evaluateMock).toHaveBeenCalledWith('tok', 'trip-1', new Date('2026-10-09T17:10').toISOString(), undefined));
    expect(await screen.findByText(/La persona queda observada/)).toBeInTheDocument();
  });

  it('sin permiso de evaluar solo se ve el seguimiento (sin formulario)', async () => {
    setPermissions(['HR_ADMINISTRATION.REQUEST_FIELD_TRIP']);
    renderScreen();
    await screen.findByTestId('contador-incumplimientos');
    expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument();
  });

  it('si no se puede leer el contador, no se decide', async () => {
    getEmployeeMock.mockRejectedValue(new Error('403'));
    renderScreen();
    const counter = await screen.findByTestId('contador-incumplimientos');
    expect(counter).toHaveTextContent(/No pudimos obtener el contador/);
    expect(await screen.findByRole('button', { name: 'Cerrar' })).toBeDisabled();
  });

  it('una salida ya cerrada o sin autorizar no ofrece registrar regreso', async () => {
    getTripMock.mockResolvedValue(makeTrip({ status: 'CERRADA_NORMAL', actualReturn: '2026-10-09T16:55:00Z' }));
    renderScreen();
    await screen.findByTestId('contador-incumplimientos');
    expect(screen.queryByLabelText('Hora real de regreso')).not.toBeInTheDocument();
  });

  it('avisa si la salida aun no fue autorizada', async () => {
    getTripMock.mockResolvedValue(makeTrip({ status: 'PENDIENTE_NIVEL_1' }));
    renderScreen();
    expect(await screen.findByText(/todavía no fue autorizada/)).toBeInTheDocument();
  });

  it('error recuperable', async () => {
    getTripMock.mockReset().mockRejectedValue(new Error('x'));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar la salida/);
  });
});
