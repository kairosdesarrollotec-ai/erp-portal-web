import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { IncidentDetailScreen } from './IncidentDetailScreen';
import { IncidentCommandError } from './incidents-client';
import { baseContext, makeDetail, setupUser } from './test-utils';
import { useWorkSession } from '../shared/useWorkSession';

const getIncidentMock = vi.fn();
const addActionMock = vi.fn();
const closeMock = vi.fn();
const referLegalMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./incidents-client', async () => {
  const actual = await vi.importActual<typeof import('./incidents-client')>('./incidents-client');
  return {
    ...actual,
    getIncident: (...args: unknown[]) => getIncidentMock(...args),
    addIncidentAction: (...args: unknown[]) => addActionMock(...args),
    closeIncident: (...args: unknown[]) => closeMock(...args),
    referIncidentToLegal: (...args: unknown[]) => referLegalMock(...args),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/incidencias/inc-1', state: baseContext }]}>
      <Routes>
        <Route path="/incidencias" element={<div>bandeja de incidencias</div>} />
        <Route path="/incidencias/:id" element={<IncidentDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

function setMobile(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('IncidentDetailScreen (INC-02)', () => {
  beforeEach(() => {
    getIncidentMock.mockReset();
    addActionMock.mockReset();
    closeMock.mockReset();
    referLegalMock.mockReset();
    useWorkSession.setState({ role: 'GERENCIA' });
    setMobile(false);
  });

  it('muestra los datos de la incidencia y el timeline cronologico', async () => {
    getIncidentMock.mockResolvedValue(makeDetail({ suggestion: 'Duplicar la llave' }));
    renderScreen();

    expect(await screen.findByRole('heading', { level: 1, name: /Pérdida de llave/ })).toBeInTheDocument();
    expect(getIncidentMock).toHaveBeenCalledWith('fake-id-token', 'inc-1', 'c1', 'b1');
    expect(screen.getByText('Duplicar la llave')).toBeInTheDocument();
    const entries = within(screen.getByRole('list', { name: 'Historial de acciones' })).getAllByRole('listitem');
    expect(entries).toHaveLength(2);
    expect(entries[1]).toHaveTextContent('Se llamó al cliente para que busque la llave.');
  });

  it('el historial es solo lectura: ninguna entrada tiene botones de editar o eliminar', async () => {
    getIncidentMock.mockResolvedValue(makeDetail());
    renderScreen();
    const timeline = await screen.findByRole('list', { name: 'Historial de acciones' });

    expect(within(timeline).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /editar|eliminar|borrar/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /editar|eliminar|borrar/i })).toBeNull();
  });

  it('el foco inicial queda en "Agregar nueva acción"', async () => {
    getIncidentMock.mockResolvedValue(makeDetail());
    renderScreen();
    const field = await screen.findByLabelText('Agregar nueva acción');
    await waitFor(() => expect(field).toHaveFocus());
  });

  it('agrega una acción con If-Match (version) y actualiza el timeline', async () => {
    const user = setupUser();
    getIncidentMock.mockResolvedValue(makeDetail());
    const newEntry = {
      id: 'act-3',
      kind: 'ACTION' as const,
      description: 'Cliente devolvió la llave',
      authorUserId: 'user-0001-bbbb',
      createdAt: '2026-10-05T12:00:00Z',
    };
    addActionMock.mockResolvedValue(makeDetail({ version: 4, actions: [...makeDetail().actions, newEntry] }));
    renderScreen();

    const field = await screen.findByLabelText('Agregar nueva acción');
    const add = screen.getByRole('button', { name: 'Agregar' });
    expect(add).toBeDisabled();
    await user.type(field, '  Cliente devolvió la llave ');
    await user.click(add);

    await waitFor(() =>
      expect(addActionMock).toHaveBeenCalledWith('fake-id-token', 'inc-1', 3, 'c1', 'b1', 'Cliente devolvió la llave'),
    );
    expect(await screen.findByText('Cliente devolvió la llave')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Acción agregada al historial.');
    expect(screen.getByLabelText('Agregar nueva acción')).toHaveValue('');
  });

  it('"Cerrar incidencia" queda deshabilitado hasta tener resumen y cierra con If-Match', async () => {
    const user = setupUser();
    getIncidentMock.mockResolvedValue(makeDetail());
    closeMock.mockResolvedValue(makeDetail({ status: 'CERRADA', resolutionSummary: 'Llave recuperada', version: 4 }));
    renderScreen();

    const closeButton = await screen.findByRole('button', { name: 'Cerrar incidencia' });
    expect(closeButton).toBeDisabled();
    await user.type(screen.getByLabelText('Resumen de resolución'), '   ');
    expect(closeButton).toBeDisabled();
    await user.type(screen.getByLabelText('Resumen de resolución'), 'Llave recuperada');
    expect(closeButton).toBeEnabled();
    await user.click(closeButton);

    await waitFor(() =>
      expect(closeMock).toHaveBeenCalledWith('fake-id-token', 'inc-1', 3, 'c1', 'b1', 'Llave recuperada'),
    );
    expect(await screen.findByText(/el historial es de solo lectura/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar incidencia' })).toBeNull();
    expect(screen.queryByLabelText('Agregar nueva acción')).toBeNull();
    expect(screen.getByText('Llave recuperada')).toBeInTheDocument();
  });

  it('deriva a vía legal pidiendo motivo', async () => {
    const user = setupUser();
    getIncidentMock.mockResolvedValue(makeDetail({ severity: 'GRAVE' }));
    referLegalMock.mockResolvedValue(makeDetail({ severity: 'GRAVE', status: 'VIA_LEGAL', version: 4 }));
    renderScreen();

    await user.click(await screen.findByRole('button', { name: 'Derivar a vía legal' }));
    const dialog = screen.getByRole('dialog', { name: 'Derivar a vía legal' });
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar derivación' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Motivo de la derivación'), 'Vehículo no devuelto');
    await user.click(confirm);

    await waitFor(() =>
      expect(referLegalMock).toHaveBeenCalledWith('fake-id-token', 'inc-1', 3, 'c1', 'b1', 'Vehículo no devuelto'),
    );
    expect(await screen.findByText(/derivada a vía legal: el historial es de solo lectura/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('un 409 recarga la incidencia y avisa que la versión estaba desactualizada', async () => {
    const user = setupUser();
    getIncidentMock
      .mockResolvedValueOnce(makeDetail())
      .mockResolvedValueOnce(makeDetail({ version: 5, description: 'Descripción actualizada por otro usuario' }));
    addActionMock.mockRejectedValue(new IncidentCommandError(409, { code: 'VERSION_CONFLICT' }));
    renderScreen();

    await user.type(await screen.findByLabelText('Agregar nueva acción'), 'Nueva acción');
    await user.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Otra persona modificó esta incidencia/);
    expect(await screen.findByText('Descripción actualizada por otro usuario')).toBeInTheDocument();
    expect(getIncidentMock).toHaveBeenCalledTimes(2);
    // El texto que el usuario estaba escribiendo se conserva.
    expect(screen.getByLabelText('Agregar nueva acción')).toHaveValue('Nueva acción');
  });

  it('un 422 muestra el mensaje de regla de negocio sin recargar', async () => {
    const user = setupUser();
    getIncidentMock.mockResolvedValue(makeDetail());
    closeMock.mockRejectedValue(new IncidentCommandError(422, { code: 'SOME_RULE', detail: 'x' }));
    renderScreen();

    await user.type(await screen.findByLabelText('Resumen de resolución'), 'Resumen');
    await user.click(screen.getByRole('button', { name: 'Cerrar incidencia' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La operación no cumple las reglas de negocio vigentes.');
    expect(getIncidentMock).toHaveBeenCalledTimes(1);
  });

  it('estado NOT_FOUND y vuelta a la bandeja', async () => {
    getIncidentMock.mockRejectedValue(Object.assign(new Error('nf'), { status: 404 }));
    renderScreen();
    expect(await screen.findByText('No encontramos esta incidencia en tu empresa y sede.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Volver a la bandeja/ }));
    expect(await screen.findByText('bandeja de incidencias')).toBeInTheDocument();
  });

  it('roles sin permiso de cierre no ven el formulario de acciones ni "Cerrar incidencia" (Campo)', async () => {
    useWorkSession.setState({ role: 'CAMPO' });
    getIncidentMock.mockResolvedValue(makeDetail());
    renderScreen();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByLabelText('Agregar nueva acción')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cerrar incidencia' })).toBeNull();
  });

  it('en móvil el timeline es colapsable (empieza colapsado y se expande con el botón)', async () => {
    setMobile(true);
    getIncidentMock.mockResolvedValue(makeDetail());
    renderScreen();

    const toggle = await screen.findByRole('button', { name: 'Ver historial (2)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list', { name: 'Historial de acciones' })).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Ocultar historial' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list', { name: 'Historial de acciones' })).toBeInTheDocument();
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    getIncidentMock.mockResolvedValue(makeDetail());
    const { container } = renderScreen();
    await screen.findByRole('heading', { level: 1 });
    expect(await axe(container)).toHaveNoViolations();
  });
});
