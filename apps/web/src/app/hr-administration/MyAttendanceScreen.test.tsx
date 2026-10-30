import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MyAttendanceScreen } from './MyAttendanceScreen';
import { HrApiError, HrCommandError } from './hr-client';
import { baseContext, makeRecord } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';
import { limaToday } from './hr-domain';
import { kairosDb } from '../../offline/database/kairos-db';

const getMyMock = vi.fn();
const logMock = vi.fn();
const uploadMock = vi.fn();
const locationMock = vi.fn();

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./attendance-location', async () => {
  const actual = await vi.importActual<typeof import('./attendance-location')>('./attendance-location');
  return { ...actual, captureAttendanceLocation: (...a: unknown[]) => locationMock(...a) };
});
vi.mock('./hr-client', async () => {
  const actual = await vi.importActual<typeof import('./hr-client')>('./hr-client');
  return {
    ...actual,
    getMyAttendance: (...a: unknown[]) => getMyMock(...a),
    logMyAttendance: (...a: unknown[]) => logMock(...a),
    uploadAttendanceEvidence: (...a: unknown[]) => uploadMock(...a),
  };
});

const GEOFENCE = { configured: true, latitude: -12.0464, longitude: -77.0428, radiusMeters: 200 };

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/mi-asistencia', state: baseContext }]}>
      <Routes>
        <Route path="/mi-asistencia" element={<MyAttendanceScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

const photo = () => new File(['x'], 'yo.jpg', { type: 'image/jpeg' });

describe('MyAttendanceScreen (mi asistencia, 22-oct #9)', () => {
  beforeEach(async () => {
    await kairosDb.open();
    await kairosDb.attendance_queue.clear();
    getMyMock.mockReset().mockResolvedValue({ employeeId: 'emp-9', geofence: GEOFENCE, items: [] });
    logMock.mockReset().mockResolvedValue(makeRecord({ requiresReview: false }));
    uploadMock.mockReset().mockResolvedValue({ storageRef: 'gs://x/yo.jpg' });
    locationMock.mockReset().mockResolvedValue({ latitude: -12.0464, longitude: -77.0428, accuracy: 12 });
    setPermissions(['HR_ADMINISTRATION.LOG_OWN_ATTENDANCE']);
  });

  it('estado vacio: sin marcas todavia', async () => {
    renderScreen();
    expect(await screen.findByText('Todavía no tienes marcas este mes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar entrada' })).toBeInTheDocument();
  });

  it('exige ubicacion y foto antes de marcar la entrada', async () => {
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar entrada' }));
    expect(await screen.findByText('Obtén tu ubicación antes de marcar.')).toBeInTheDocument();
    expect(screen.getByText('La foto es obligatoria para marcar la entrada.')).toBeInTheDocument();
    expect(logMock).not.toHaveBeenCalled();
  });

  it('marca la entrada con foto, ubicacion y capturedAt; muestra "dentro de la sede"', async () => {
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Obtener mi ubicación/ }));
    expect(await screen.findByTestId('geofence-indicator')).toHaveAttribute('data-verdict', 'INSIDE');
    fireEvent.change(screen.getByLabelText(/Foto de tu entrada/), { target: { files: [photo()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar entrada' }));
    await waitFor(() => expect(logMock).toHaveBeenCalled());
    expect(uploadMock).toHaveBeenCalledWith('tok', 'emp-9', expect.any(File));
    const input = logMock.mock.calls[0][2];
    expect(input).toMatchObject({
      type: 'CHECK_IN',
      status: 'PRESENTE',
      latitude: -12.0464,
      longitude: -77.0428,
      accuracy: 12,
      evidence: { kind: 'SELF_PHOTO', storageRef: 'gs://x/yo.jpg' },
    });
    expect(typeof input.capturedAt).toBe('string');
    expect(await screen.findByText('Entrada registrada.')).toBeInTheDocument();
  });

  it('fuera de la geocerca: avisa y la marca queda pendiente de revision', async () => {
    locationMock.mockResolvedValue({ latitude: -12.0, longitude: -77.0, accuracy: 20 });
    logMock.mockResolvedValue(makeRecord({ requiresReview: true }));
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Obtener mi ubicación/ }));
    expect(await screen.findByTestId('geofence-indicator')).toHaveAttribute('data-verdict', 'OUTSIDE');
    fireEvent.change(screen.getByLabelText(/Foto de tu entrada/), { target: { files: [photo()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar entrada' }));
    expect(await screen.findByText(/fuera de la geocerca de la sede, por eso un responsable la revisará/)).toBeInTheDocument();
  });

  it('con la entrada hecha ofrece la salida (sin foto)', async () => {
    getMyMock.mockResolvedValue({
      employeeId: 'emp-9',
      geofence: GEOFENCE,
      items: [makeRecord({ date: limaToday(), checkInTime: new Date().toISOString(), checkOutTime: null })],
    });
    renderScreen();
    expect(await screen.findByRole('button', { name: 'Marcar salida' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Foto de tu entrada/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Obtener mi ubicación/ }));
    await screen.findByText(/Ubicación obtenida/);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar salida' }));
    await waitFor(() => expect(logMock).toHaveBeenCalled());
    expect(logMock.mock.calls[0][2]).toMatchObject({ type: 'CHECK_OUT' });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('si no se puede obtener la ubicacion, lo dice y no marca', async () => {
    locationMock.mockResolvedValue(null);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Obtener mi ubicación/ }));
    expect(await screen.findByText(/No pudimos obtener tu ubicación/)).toBeInTheDocument();
  });

  it('muestra el error de negocio del servidor (EMPLOYEE_NOT_LINKED)', async () => {
    logMock.mockRejectedValue(new HrCommandError(404, { code: 'EMPLOYEE_NOT_LINKED' }));
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Obtener mi ubicación/ }));
    await screen.findByText(/Ubicación obtenida/);
    fireEvent.change(screen.getByLabelText(/Foto de tu entrada/), { target: { files: [photo()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar entrada' }));
    expect(await screen.findByText(/no está vinculado a una ficha/)).toBeInTheDocument();
  });

  it('sin conexion: avisa modo offline y permite encolar la marca localmente', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    renderScreen();
    expect(await screen.findByTestId('my-attendance-offline')).toBeInTheDocument();
    
    // El botón está habilitado para marcar sin conexión
    const button = screen.getByRole('button', { name: 'Marcar entrada (sin conexión)' });
    expect(button).not.toBeDisabled();

    fireEvent.click(await screen.findByRole('button', { name: /Obtener mi ubicación/ }));
    await screen.findByText(/Ubicación obtenida/);
    fireEvent.change(screen.getByLabelText(/Foto de tu entrada/), { target: { files: [photo()] } });
    fireEvent.click(button);

    // No llama a los servicios de red
    expect(uploadMock).not.toHaveBeenCalled();
    expect(logMock).not.toHaveBeenCalled();

    // Muestra aviso de guardado local
    expect(await screen.findByText(/Marca guardada en el dispositivo \(sin conexión\)/)).toBeInTheDocument();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('al recuperar la señal, sincroniza automáticamente la marca en cola', async () => {
    // Pre-insertar una marca pendiente en la cola de Dexie
    await kairosDb.attendance_queue.add({
      employeeId: 'emp-9',
      companyId: 'comp-1',
      branchId: 'branch-1',
      type: 'CHECK_IN',
      status: 'PRESENTE',
      date: limaToday(),
      capturedAt: new Date().toISOString(),
      latitude: -12.0464,
      longitude: -77.0428,
      accuracy: 10,
      queueStatus: 'pending',
      errorMessage: null,
      createdAt: Date.now(),
      photoBlob: new Blob(['photo'], { type: 'image/jpeg' }),
      photoMimeType: 'image/jpeg',
    });

    renderScreen();

    // Al montar con online=true y una marca pendiente, el efecto dispara la sincronización
    await waitFor(() => expect(uploadMock).toHaveBeenCalled());
    await waitFor(() => expect(logMock).toHaveBeenCalled());
    expect(await screen.findByText(/Marca sincronizada con el servidor/)).toBeInTheDocument();

    const queued = await kairosDb.attendance_queue.toArray();
    expect(queued[0].queueStatus).toBe('synced');
  });

  it('403 al cargar: sin permiso', async () => {
    getMyMock.mockRejectedValue(new HrApiError(403));
    renderScreen();
    expect(await screen.findByText(/No tienes permiso para ver tu asistencia/)).toBeInTheDocument();
  });

  it('V-24: 404 sin ficha vinculada indica cómo resolverlo (pedir a Personal que vincule la cuenta)', async () => {
    getMyMock.mockRejectedValue(new HrApiError(404));
    renderScreen();
    expect(await screen.findByText(/No encontramos tu asistencia en tu empresa y sede\./)).toBeInTheDocument();
    expect(screen.getByText(/Pide a Personal \(RR\. HH\.\) que vincule tu cuenta a tu ficha de colaborador/)).toBeInTheDocument();
  });
});
