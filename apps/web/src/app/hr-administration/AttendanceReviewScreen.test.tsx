import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AttendanceReviewScreen } from './AttendanceReviewScreen';
import { HrApiError, HrCommandError } from './hr-client';
import { baseContext, makeRecord } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const listMock = vi.fn();
const reviewMock = vi.fn();

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
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
    listAttendancePendingReview: (...a: unknown[]) => listMock(...a),
    reviewAttendance: (...a: unknown[]) => reviewMock(...a),
  };
});

const pending = () =>
  makeRecord({
    id: 'att-1',
    employeeName: 'Luis Soto',
    outsideGeofence: true,
    distanceMeters: 540,
    geofenceRadiusMeters: 200,
    reviewStatus: 'PENDING',
    requiresReview: true,
    latitude: -12.0,
    longitude: -77.0,
  });

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/asistencia/revision', state: baseContext }]}>
      <Routes>
        <Route path="/personal/asistencia/revision" element={<AttendanceReviewScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AttendanceReviewScreen (marcas fuera de la geocerca)', () => {
  beforeEach(() => {
    listMock.mockReset().mockResolvedValue([pending()]);
    reviewMock.mockReset().mockResolvedValue(makeRecord());
    setPermissions(['HR_ADMINISTRATION.REVIEW_ATTENDANCE']);
  });

  it('lista las marcas con distancia, radio y enlace al mapa', async () => {
    renderScreen();
    expect(await screen.findByText('Luis Soto')).toBeInTheDocument();
    expect(screen.getByText(/Fuera de la geocerca \(a 540 m de 200 m permitidos\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ubicación en el mapa' })).toHaveAttribute('href', expect.stringContaining('-12,-77'));
  });

  it('estado vacio', async () => {
    listMock.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByTestId('review-empty')).toBeInTheDocument();
  });

  it('aprueba tal cual', async () => {
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar la marca de Luis Soto' }));
    await waitFor(() => expect(reviewMock).toHaveBeenCalledWith('tok', 'att-1', { decision: 'APPROVE' }));
    expect(await screen.findByText('Marca de Luis Soto aprobada.')).toBeInTheDocument();
  });

  it('corregir exige nota y minutos si es tardanza', async () => {
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Corregir la marca de Luis Soto' }));
    fireEvent.change(screen.getByLabelText('Resultado correcto'), { target: { value: 'TARDANZA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar corrección' }));
    expect(await screen.findByText(/al menos 3 caracteres/)).toBeInTheDocument();
    expect(screen.getByText('Indica los minutos de tardanza.')).toBeInTheDocument();
    expect(reviewMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Minutos de tardanza'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText(/Nota de la corrección/), { target: { value: 'Llegó tarde' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar corrección' }));
    await waitFor(() => expect(reviewMock).toHaveBeenCalledWith('tok', 'att-1', { decision: 'CORRECT', status: 'TARDANZA', minutesLate: 15, note: 'Llegó tarde' }));
  });

  it('si otra persona ya la reviso (409) muestra el aviso y recarga', async () => {
    reviewMock.mockRejectedValue(new HrCommandError(409, { code: 'ATTENDANCE_NOT_PENDING_REVIEW' }));
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar la marca de Luis Soto' }));
    expect(await screen.findByText(/ya fue revisada por otra persona/)).toBeInTheDocument();
    await waitFor(() => expect(listMock.mock.calls.length).toBeGreaterThan(1));
  });

  it('403: sin permiso', async () => {
    listMock.mockRejectedValue(new HrApiError(403));
    renderScreen();
    expect(await screen.findByText(/No tienes permiso para ver las marcas por revisar/)).toBeInTheDocument();
  });
});
