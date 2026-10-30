import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TerminationScreen } from './TerminationScreen';
import { HrCommandError } from './hr-client';
import { baseContext, makeDetail } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getEmployeeMock = vi.fn();
const terminateMock = vi.fn();
const mfaRequestMock = vi.fn();

vi.mock('../auth/useMfaStepUp', async () => {
  const actual = await vi.importActual<typeof import('../auth/useMfaStepUp')>('../auth/useMfaStepUp');
  return { ...actual, useMfaStepUp: () => ({ request: () => mfaRequestMock(), challenge: { state: 'CLOSED' } }) };
});
vi.mock('../auth/MfaChallengeModal', () => ({ MfaChallengeModal: () => null }));

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
    getEmployee: (...a: unknown[]) => getEmployeeMock(...a),
    terminateEmployment: (...a: unknown[]) => terminateMock(...a),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/emp-1/termino', state: baseContext }]}>
      <Routes>
        <Route path="/personal/:id/termino" element={<TerminationScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

const termination = (o = {}) => ({
  id: 't1', employeeId: 'emp-1', reason: 'RENUNCIA', noticeDays: 0, finalSettlementPaid: true, settlementAmount: 0,
  terminatedAt: '2026-10-09T10:00:00Z', createdAt: '2026-10-09T10:00:00Z', vacancyCreatedId: 'vac-77', ...o,
});

describe('TerminationScreen (ADP-09)', () => {
  beforeEach(() => {
    getEmployeeMock.mockReset().mockResolvedValue(makeDetail());
    terminateMock.mockReset();
    mfaRequestMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.TERMINATE_EMPLOYMENT']);
  });

  it('el foco inicial esta en el selector de tipo y no hay campos hasta elegir', async () => {
    renderScreen();
    const renuncia = await screen.findByLabelText('Renuncia');
    await waitFor(() => expect(renuncia).toHaveFocus());
    expect(screen.queryByTestId('form-renuncia')).not.toBeInTheDocument();
    expect(screen.queryByTestId('form-despido')).not.toBeInTheDocument();
  });

  it('renuncia y despido son formularios distintos, no el mismo disfrazado', async () => {
    renderScreen();
    fireEvent.click(await screen.findByLabelText('Renuncia'));
    const renuncia = screen.getByTestId('form-renuncia');
    expect(within(renuncia).getByLabelText(/Fecha de aviso/)).toBeInTheDocument();
    expect(within(renuncia).getByLabelText('Último día trabajado')).toBeInTheDocument();
    expect(screen.queryByLabelText('Motivo del despido')).not.toBeInTheDocument();
    expect(screen.queryByText('Sanciones previas registradas')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Despido'));
    expect(screen.queryByLabelText('Último día trabajado')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Motivo del despido')).toBeInTheDocument();
    expect(screen.getByText('Sanciones previas registradas')).toBeInTheDocument();
    expect(screen.getByLabelText(/Con aviso de 15 días/)).toBeInTheDocument();
  });

  it('valida los campos propios de cada tipo antes de confirmar', async () => {
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar término' }));
    expect(await screen.findByText('Elige si es una renuncia o un despido.')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Despido'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar término' }));
    expect(await screen.findByText(/Indica el motivo del despido/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirmacion reforzada: aviso de vacante, irreversible y checkbox antes de confirmar', async () => {
    terminateMock.mockResolvedValue(termination());
    renderScreen();
    fireEvent.click(await screen.findByLabelText('Renuncia'));
    fireEvent.change(screen.getByLabelText('Último día trabajado'), { target: { value: '2026-10-09' } });
    fireEvent.click(screen.getByLabelText(/Se pagó la quincena pendiente/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar término' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/genera automáticamente una nueva vacante en Reclutamiento/)).toBeInTheDocument();
    expect(within(dialog).getByText(/no se puede deshacer/)).toBeInTheDocument();
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar' });
    expect(confirm).toBeDisabled();
    fireEvent.click(within(dialog).getByLabelText(/irreversible/));
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(terminateMock).toHaveBeenCalledWith('tok', 'emp-1', expect.objectContaining({ reason: 'RENUNCIA', noticeDays: 0, finalSettlementPaid: true })),
    );
    // Con `vacancyCreatedId` en la respuesta se enlaza a la vacante creada.
    expect(await screen.findByText(/Reclutamiento ya creó la vacante/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver la vacante creada' })).toHaveAttribute('href', '/reclutamiento/vacantes/vac-77');
  });

  it('si la vacante aún no existe (creación asíncrona) lo dice con verdad y enlaza a Reclutamiento', async () => {
    terminateMock.mockResolvedValue(termination({ vacancyCreatedId: null }));
    renderScreen();
    fireEvent.click(await screen.findByLabelText('Renuncia'));
    fireEvent.change(screen.getByLabelText('Último día trabajado'), { target: { value: '2026-10-09' } });
    fireEvent.click(screen.getByLabelText(/Se pagó la quincena pendiente/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar término' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/irreversible/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText(/se crea automáticamente en Reclutamiento/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Reclutamiento' })).toHaveAttribute('href', '/reclutamiento');
    expect(screen.queryByRole('link', { name: 'Ver la vacante creada' })).not.toBeInTheDocument();
  });

  it('despido con aviso envia 15 dias y el motivo', async () => {
    terminateMock.mockResolvedValue(termination({ reason: 'DESPIDO', noticeDays: 15 }));
    renderScreen();
    fireEvent.click(await screen.findByLabelText('Despido'));
    fireEvent.change(screen.getByLabelText('Motivo del despido'), { target: { value: 'Reincidencia en faltas' } });
    fireEvent.click(screen.getByLabelText(/Con aviso de 15 días/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar término' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/irreversible/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(terminateMock).toHaveBeenCalledWith('tok', 'emp-1', expect.objectContaining({ reason: 'DESPIDO', noticeDays: 15, notes: 'Motivo del despido: Reincidencia en faltas' })),
    );
  });

  it('una renuncia exige la quincena pagada (FINAL_SETTLEMENT_REQUIRED)', async () => {
    renderScreen();
    fireEvent.click(await screen.findByLabelText('Renuncia'));
    fireEvent.change(screen.getByLabelText('Último día trabajado'), { target: { value: '2026-10-09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar término' }));
    expect(await screen.findByText('Para registrar una renuncia debe estar pagada la quincena pendiente.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('un despido exige el motivo (al menos 5 letras) y el aviso es 0 o 15 dias', async () => {
    renderScreen();
    fireEvent.click(await screen.findByLabelText('Despido'));
    fireEvent.change(screen.getByLabelText('Motivo del despido'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar término' }));
    expect(await screen.findByText(/Indica el motivo del despido/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Con aviso de 15 días/)).toBeInTheDocument();
  });

  it('Esc cierra la confirmacion sin registrar nada', async () => {
    renderScreen();
    fireEvent.click(await screen.findByLabelText('Renuncia'));
    fireEvent.change(screen.getByLabelText('Último día trabajado'), { target: { value: '2026-10-09' } });
    fireEvent.click(screen.getByLabelText(/Se pagó la quincena pendiente/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar término' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(terminateMock).not.toHaveBeenCalled();
  });

  it('MFA_RECENT_REQUIRED: pide verificar MFA y reintenta una vez con el token renovado', async () => {
    terminateMock
      .mockRejectedValueOnce(new HrCommandError(403, { code: 'MFA_RECENT_REQUIRED' }))
      .mockResolvedValueOnce(termination());
    mfaRequestMock.mockResolvedValue('fresh');
    renderScreen();
    fireEvent.click(await screen.findByLabelText('Renuncia'));
    fireEvent.change(screen.getByLabelText('Último día trabajado'), { target: { value: '2026-10-09' } });
    fireEvent.click(screen.getByLabelText(/Se pagó la quincena pendiente/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar término' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/irreversible/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/MFA/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Verificar MFA' }));
    await waitFor(() => expect(terminateMock).toHaveBeenLastCalledWith('fresh', 'emp-1', expect.objectContaining({ reason: 'RENUNCIA' })));
    expect(await screen.findByText(/Reclutamiento ya creó la vacante/)).toBeInTheDocument();
  });

  it('ya terminado: muestra el error de negocio', async () => {
    terminateMock.mockRejectedValue(new HrCommandError(409, { code: 'EMPLOYMENT_ALREADY_TERMINATED' }));
    renderScreen();
    fireEvent.click(await screen.findByLabelText('Renuncia'));
    fireEvent.change(screen.getByLabelText('Último día trabajado'), { target: { value: '2026-10-09' } });
    fireEvent.click(screen.getByLabelText(/Se pagó la quincena pendiente/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar término' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/irreversible/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/ya fue terminada/);
  });

  it('una persona ya terminada no muestra el formulario', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail({ status: 'TERMINADO', terminatedAt: '2026-09-01T00:00:00Z' }));
    renderScreen();
    expect(await screen.findByText(/ya terminó/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar término' })).not.toBeInTheDocument();
  });

  it('sin TERMINATE_EMPLOYMENT no hay acceso', () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    renderScreen();
    expect(screen.getByText(/No tienes permiso para registrar el término/)).toBeInTheDocument();
    expect(getEmployeeMock).not.toHaveBeenCalled();
  });
});
