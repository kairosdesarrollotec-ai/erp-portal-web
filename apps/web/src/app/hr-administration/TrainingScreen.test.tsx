import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TrainingScreen } from './TrainingScreen';
import { HrCommandError } from './hr-client';
import { baseContext, makeEmployee } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const listEmployeesMock = vi.fn();
const listTrainingsMock = vi.fn();
const registerMock = vi.fn();

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
    listEmployees: (...a: unknown[]) => listEmployeesMock(...a),
    listTrainings: (...a: unknown[]) => listTrainingsMock(...a),
    registerTraining: (...a: unknown[]) => registerMock(...a),
  };
});

const training = {
  id: 'tr-1',
  topic: 'Manejo defensivo',
  heldOn: '2026-10-08',
  durationMinutes: 60,
  comprehensionNotes: 'Buena comprensión general',
  attendees: [{ employeeId: 'emp-1', fullName: 'Carlos Pérez' }],
  createdAt: '2026-10-08T10:00:00Z',
};

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/capacitacion', state: baseContext }]}>
      <TrainingScreen />
    </MemoryRouter>,
  );
}

describe('TrainingScreen (ADP-10)', () => {
  beforeEach(() => {
    listEmployeesMock.mockReset().mockResolvedValue({
      items: [makeEmployee(), makeEmployee({ id: 'emp-2', fullName: 'Rosa Díaz' }), makeEmployee({ id: 'emp-3', fullName: 'Ex Colaborador', status: 'TERMINADO' })],
      total: 3,
    });
    listTrainingsMock.mockReset().mockResolvedValue([training]);
    registerMock.mockReset();
    setPermissions(['HR_ADMINISTRATION.REGISTER_TRAINING', 'HR_ADMINISTRATION.VIEW_EMPLOYEES']);
  });

  it('foco en el tema, duracion solo como referencia y nota cualitativa (no es evaluacion formal)', async () => {
    renderScreen();
    const topic = await screen.findByLabelText('Tema');
    await waitFor(() => expect(topic).toHaveFocus());
    expect(screen.getByText(/~1 hora/)).toBeInTheDocument();
    expect(screen.getByText(/no una evaluación formal de desempeño/)).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.getByText('Manejo defensivo')).toBeInTheDocument();
  });

  it('no ofrece como asistentes a quien ya termino su relacion laboral', async () => {
    renderScreen();
    await screen.findByLabelText('Tema');
    expect(screen.getByLabelText(/Rosa Díaz/)).toBeInTheDocument();
    expect(screen.queryByText(/Ex Colaborador/)).not.toBeInTheDocument();
  });

  it('valida tema y asistentes antes de enviar', async () => {
    renderScreen();
    await screen.findByLabelText('Tema');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar taller' }));
    expect(await screen.findByText('Indica el tema del taller.')).toBeInTheDocument();
    expect(screen.getByText('Selecciona al menos un asistente.')).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('registra el taller con los asistentes elegidos y lo suma a la lista', async () => {
    registerMock.mockResolvedValue({ ...training, id: 'tr-2', topic: 'Primeros auxilios', attendees: [{ employeeId: 'emp-2', fullName: 'Rosa Díaz' }] });
    renderScreen();
    fireEvent.change(await screen.findByLabelText('Tema'), { target: { value: ' Primeros auxilios ' } });
    fireEvent.click(screen.getByLabelText(/Rosa Díaz/));
    fireEvent.change(screen.getByLabelText('Notas sobre comprensión general'), { target: { value: 'Entendieron lo básico' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar taller' }));
    await waitFor(() =>
      expect(registerMock).toHaveBeenCalledWith(
        'tok',
        { companyId: 'c1', branchId: 'b1' },
        expect.objectContaining({ topic: 'Primeros auxilios', attendeeIds: ['emp-2'], comprehensionNotes: 'Entendieron lo básico' }),
      ),
    );
    expect(await screen.findByText(/Taller registrado/)).toBeInTheDocument();
    expect(screen.getAllByText('Primeros auxilios').length).toBeGreaterThan(0);
  });

  it('muestra el error de negocio si hay asistentes invalidos', async () => {
    registerMock.mockRejectedValue(new HrCommandError(422, { code: 'TRAINING_ATTENDEES_INVALID' }));
    renderScreen();
    fireEvent.change(await screen.findByLabelText('Tema'), { target: { value: 'Tema' } });
    fireEvent.click(screen.getByLabelText(/Rosa Díaz/));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar taller' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no pertenecen a esta empresa/);
  });

  it('sin REGISTER_TRAINING no se muestra el formulario', () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    renderScreen();
    expect(screen.getByRole('alert')).toHaveTextContent(/No tienes permiso para registrar capacitaciones/);
    expect(screen.queryByRole('button', { name: 'Registrar taller' })).not.toBeInTheDocument();
    expect(listTrainingsMock).not.toHaveBeenCalled();
  });
});
