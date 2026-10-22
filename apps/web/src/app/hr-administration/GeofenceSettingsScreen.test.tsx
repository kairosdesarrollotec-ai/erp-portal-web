import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { GeofenceSettingsScreen } from './GeofenceSettingsScreen';
import { HrApiError, HrCommandError } from './hr-client';
import { baseContext } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getMock = vi.fn();
const setMock = vi.fn();
const delMock = vi.fn();

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
    getBranchGeofence: (...a: unknown[]) => getMock(...a),
    setBranchGeofence: (...a: unknown[]) => setMock(...a),
    deleteBranchGeofence: (...a: unknown[]) => delMock(...a),
  };
});

const configured = { branchId: 'b', branchName: 'Sede Lima', configured: true, latitude: -12.04, longitude: -77.04, radiusMeters: 150 };
const none = { branchId: 'b', branchName: 'Sede Lima', configured: false };

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/geocerca', state: baseContext }]}>
      <Routes>
        <Route path="/personal/geocerca" element={<GeofenceSettingsScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GeofenceSettingsScreen', () => {
  beforeEach(() => {
    getMock.mockReset().mockResolvedValue(none);
    setMock.mockReset().mockResolvedValue(configured);
    delMock.mockReset().mockResolvedValue(none);
    setPermissions(['HR_ADMINISTRATION.MANAGE_GEOFENCE']);
  });

  it('sin geocerca: lo dice y valida los rangos antes de guardar', async () => {
    renderScreen();
    expect(await screen.findByTestId('geofence-current')).toHaveTextContent('todavía no tiene geocerca');
    fireEvent.change(screen.getByLabelText(/Latitud/), { target: { value: '95' } });
    fireEvent.change(screen.getByLabelText(/Radio permitido/), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar geocerca' }));
    expect(await screen.findByText(/latitud válida/)).toBeInTheDocument();
    expect(screen.getByText(/longitud válida/)).toBeInTheDocument();
    expect(screen.getByText(/entre 10 y 5000/)).toBeInTheDocument();
    expect(setMock).not.toHaveBeenCalled();
  });

  it('guarda centro y radio', async () => {
    renderScreen();
    await screen.findByTestId('geofence-current');
    fireEvent.change(screen.getByLabelText(/Latitud/), { target: { value: '-12.04' } });
    fireEvent.change(screen.getByLabelText(/Longitud/), { target: { value: '-77.04' } });
    fireEvent.change(screen.getByLabelText(/Radio permitido/), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar geocerca' }));
    await waitFor(() => expect(setMock).toHaveBeenCalledWith('tok', expect.anything(), { latitude: -12.04, longitude: -77.04, radiusMeters: 150 }));
    expect(await screen.findByText('Geocerca guardada.')).toBeInTheDocument();
  });

  it('quitar pide confirmacion', async () => {
    getMock.mockResolvedValue(configured);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Quitar geocerca' }));
    expect(delMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, quitar' }));
    await waitFor(() => expect(delMock).toHaveBeenCalled());
  });

  it('INVALID_GEOFENCE del servidor se muestra en español', async () => {
    setMock.mockRejectedValue(new HrCommandError(422, { code: 'INVALID_GEOFENCE' }));
    renderScreen();
    await screen.findByTestId('geofence-current');
    fireEvent.change(screen.getByLabelText(/Latitud/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Longitud/), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar geocerca' }));
    expect(await screen.findByText(/La geocerca no es válida/)).toBeInTheDocument();
  });

  it('403: sin permiso', async () => {
    getMock.mockRejectedValue(new HrApiError(403));
    renderScreen();
    expect(await screen.findByText(/No tienes permiso para ver la geocerca/)).toBeInTheDocument();
  });
});
