import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FieldTripRequestScreen, OFFLINE_MESSAGE } from './FieldTripRequestScreen';
import { baseContext, makeDetail, makeTrip } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getEmployeeMock = vi.fn();
const requestMock = vi.fn();

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
    getEmployee: (...a: unknown[]) => getEmployeeMock(...a),
    requestFieldTrip: (...a: unknown[]) => requestMock(...a),
  };
});

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value });
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/emp-1/salida-a-campo', state: baseContext }]}>
      <Routes>
        <Route path="/personal/:id/salida-a-campo" element={<FieldTripRequestScreen />} />
        <Route path="/personal/campo/:tripId/autorizacion" element={<div>cola de autorizacion</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FieldTripRequestScreen (ADP-06)', () => {
  beforeEach(() => {
    setOnline(true);
    getEmployeeMock.mockReset().mockResolvedValue(makeDetail());
    requestMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.REQUEST_FIELD_TRIP']);
  });
  afterEach(() => setOnline(true));

  it('muestra el area heredada de solo lectura y foco inicial en el tema', async () => {
    renderScreen();
    const area = await screen.findByLabelText('Área');
    expect(area).toHaveValue('Operaciones');
    expect(area).toHaveAttribute('readonly');
    await waitFor(() => expect(screen.getByLabelText('Tema de la salida')).toHaveFocus());
  });

  it('sin conexion el formulario se reemplaza por un bloqueo explicito y no hay borrador', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    setOnline(false);
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(OFFLINE_MESSAGE);
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).not.toBeInTheDocument();
    expect(screen.queryByText(/borrador/i)).not.toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('al perder la conexion se bloquea y al volver se habilita', async () => {
    renderScreen();
    await screen.findByLabelText('Tema de la salida');
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(OFFLINE_MESSAGE);
    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(await screen.findByRole('button', { name: 'Enviar solicitud' })).toBeInTheDocument();
  });

  it('valida los campos obligatorios y que el retorno sea posterior a la salida', async () => {
    renderScreen();
    await screen.findByLabelText('Tema de la salida');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('Indica el tema de la salida.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Hora de salida (hoy)'), { target: { value: '15:00' } });
    fireEvent.change(screen.getByLabelText('Hora estimada de retorno'), { target: { value: '14:00' } });
    expect(await screen.findByText('La hora de retorno debe ser posterior a la de salida.')).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('envia la solicitud y pasa a la cola de autorizacion', async () => {
    requestMock.mockResolvedValue(makeTrip());
    renderScreen();
    await screen.findByLabelText('Tema de la salida');
    fireEvent.change(screen.getByLabelText('Tema de la salida'), { target: { value: 'Inspección técnica' } });
    fireEvent.change(screen.getByLabelText('Destino'), { target: { value: 'Taller Central' } });
    fireEvent.change(screen.getByLabelText('Hora de salida (hoy)'), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText('Hora estimada de retorno'), { target: { value: '17:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('cola de autorizacion')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith(
      'tok',
      'emp-1',
      expect.objectContaining({ destination: 'Taller Central', objective: 'Inspección técnica', estimatedDeparture: expect.any(String), estimatedReturn: expect.any(String) }),
    );
  });

  it('si la ficha no se puede leer igual permite solicitar', async () => {
    getEmployeeMock.mockRejectedValue(new Error('403'));
    renderScreen();
    expect(await screen.findByLabelText('Área')).toHaveValue('No disponible');
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeInTheDocument();
  });

  it('sin REQUEST_FIELD_TRIP no hay formulario', () => {
    setPermissions([]);
    renderScreen();
    expect(screen.getByText(/No tienes permiso para solicitar salidas a campo/)).toBeInTheDocument();
  });
});
