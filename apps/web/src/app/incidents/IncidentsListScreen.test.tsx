import { describe, it, expect, vi, beforeEach } from 'vitest';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { IncidentsListScreen } from './IncidentsListScreen';
import { IncidentCommandError } from './incidents-client';
import { baseContext, makeDetail, makeIncident, setupUser } from './test-utils';
import { setPermissions, INCIDENT_ALL, INCIDENT_VIEW_ONLY } from '../../test/permissions';

const listIncidentsMock = vi.fn();
const resolveIncidentMock = vi.fn();
const createIncidentMock = vi.fn();
const listRentalsMock = vi.fn();
const listReturnsMock = vi.fn();

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
    listIncidents: (...args: unknown[]) => listIncidentsMock(...args),
    resolveIncident: (...args: unknown[]) => resolveIncidentMock(...args),
    createIncident: (...args: unknown[]) => createIncidentMock(...args),
  };
});
vi.mock('../rentals/rentals-client', async () => {
  const actual = await vi.importActual<typeof import('../rentals/rentals-client')>('../rentals/rentals-client');
  return { ...actual, listRentals: (...args: unknown[]) => listRentalsMock(...args) };
});
vi.mock('../returns/returns-client', async () => {
  const actual = await vi.importActual<typeof import('../returns/returns-client')>('../returns/returns-client');
  return { ...actual, listReturns: (...args: unknown[]) => listReturnsMock(...args) };
});

function renderScreen(path = '/incidencias') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path.split('?')[0], search: path.split('?')[1] ? `?${path.split('?')[1]}` : '', state: baseContext }]}>
      <Routes>
        <Route path="/incidencias" element={<IncidentsListScreen />} />
        <Route path="/incidencias/:id" element={<div>detalle de incidencia</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const leve = makeIncident({ id: 'inc-leve', rentalCode: 'ALQ-1001', severity: 'LEVE', status: 'ABIERTA', version: 3 });
const grave = makeIncident({ id: 'inc-grave', rentalCode: 'ALQ-1002', severity: 'GRAVE', status: 'ABIERTA', type: 'CRASH_OR_DAMAGE' });
const cerrada = makeIncident({ id: 'inc-cerrada', rentalCode: 'ALQ-1003', severity: 'LEVE', status: 'CERRADA' });

describe('IncidentsListScreen (INC-01)', () => {
  beforeEach(() => {
    listIncidentsMock.mockReset();
    resolveIncidentMock.mockReset();
    createIncidentMock.mockReset();
    listRentalsMock.mockReset();
    listReturnsMock.mockReset();
    listRentalsMock.mockResolvedValue([]);
    listReturnsMock.mockResolvedValue([]);
    sessionStorage.clear();
    setPermissions(INCIDENT_ALL);
  });

  it('muestra la tabla con tipo, severidad, expediente, estado y responsable', async () => {
    listIncidentsMock.mockResolvedValue([leve, grave]);
    renderScreen();

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Pérdida de llave')).toBeInTheDocument();
    expect(within(table).getByText('ALQ-1001')).toBeInTheDocument();
    expect(within(table).getByText('Leve')).toBeInTheDocument();
    expect(within(table).getByText('Grave')).toBeInTheDocument();
    expect(within(table).getAllByText('Abierta')).toHaveLength(2);
    expect(within(table).getAllByText('user-000')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Registrar incidencia' })).toBeInTheDocument();
  });

  it('consulta el backend con empresa/sede y filtros por tipo, severidad y estado', async () => {
    listIncidentsMock.mockResolvedValue([leve]);
    renderScreen();
    await screen.findByRole('table');
    expect(listIncidentsMock.mock.calls.at(-1)?.slice(1, 3)).toEqual(['c1', 'b1']);

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'TOWING' } });
    await waitFor(() => expect(listIncidentsMock.mock.calls.at(-1)?.[3]).toMatchObject({ type: 'TOWING' }));
    fireEvent.change(screen.getByLabelText('Severidad'), { target: { value: 'GRAVE' } });
    await waitFor(() => expect(listIncidentsMock.mock.calls.at(-1)?.[3]).toMatchObject({ type: 'TOWING', severity: 'GRAVE' }));
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'CERRADA' } });
    await waitFor(() =>
      expect(listIncidentsMock.mock.calls.at(-1)?.[3]).toMatchObject({ type: 'TOWING', severity: 'GRAVE', status: 'CERRADA' }),
    );
  });

  it('filtra por alquiler cuando llega ?rentalId= (entrada desde ALQ-10) y permite quitar el filtro', async () => {
    listIncidentsMock.mockResolvedValue([leve]);
    renderScreen('/incidencias?rentalId=rent-77');
    await screen.findByRole('table');
    expect(listIncidentsMock.mock.calls.at(-1)?.[3]).toMatchObject({ rentalId: 'rent-77' });
    expect(screen.getByText(/Mostrando las incidencias de un alquiler/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver todas' }));
    await waitFor(() => expect(listIncidentsMock.mock.calls.at(-1)?.[3].rentalId).toBeUndefined());
  });

  it('"Resolver" directo aparece SOLO en severidad Leve y estado Abierta', async () => {
    listIncidentsMock.mockResolvedValue([leve, grave, cerrada]);
    renderScreen();
    await screen.findByRole('table');

    expect(screen.getByRole('button', { name: 'Resolver incidencia de ALQ-1001' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resolver incidencia de ALQ-1002/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Resolver incidencia de ALQ-1003/ })).toBeNull();
    // Todas las filas conservan "Abrir".
    expect(screen.getAllByRole('button', { name: /^Abrir incidencia/ })).toHaveLength(3);
  });

  it('distingue Abierta de Cerrada sin depender del color (icono + texto + estilo)', async () => {
    listIncidentsMock.mockResolvedValue([leve, cerrada, makeIncident({ id: 'inc-legal', status: 'VIA_LEGAL', rentalCode: 'ALQ-1004' })]);
    renderScreen();
    await screen.findByRole('table');
    const table = screen.getByRole('table');
    expect(within(table).getByText('Abierta').closest('[data-status]')).toHaveAttribute('data-status', 'ABIERTA');
    expect(within(table).getByText('Cerrada').closest('[data-status]')?.querySelector('svg')).not.toBeNull();
    expect(within(table).getByText('Vía legal')).toBeInTheDocument();
  });

  it('Resolver pide resumen, lo exige y llama a resolve con la version (If-Match)', async () => {
    const user = setupUser();
    listIncidentsMock.mockResolvedValue([leve]);
    resolveIncidentMock.mockResolvedValue(
      makeDetail({ id: 'inc-leve', rentalCode: 'ALQ-1001', status: 'CERRADA', resolutionSummary: 'Llave recuperada', version: 4 }),
    );
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Resolver incidencia de ALQ-1001' }));

    const dialog = screen.getByRole('dialog', { name: /Resolver incidencia/ });
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar resolución' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Resumen de la resolución'), '  Llave recuperada  ');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() =>
      expect(resolveIncidentMock).toHaveBeenCalledWith('fake-id-token', 'inc-leve', 3, 'c1', 'b1', 'Llave recuperada'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Incidencia de ALQ-1001 resuelta.');
    // La fila pasa a Cerrada y deja de ofrecer Resolver.
    expect(screen.queryByRole('button', { name: /Resolver incidencia/ })).toBeNull();
    expect(within(screen.getByRole('table')).getByText('Cerrada')).toBeInTheDocument();
  });

  it('un 409 al resolver muestra el aviso y recarga la bandeja', async () => {
    const user = setupUser();
    listIncidentsMock.mockResolvedValue([leve]);
    resolveIncidentMock.mockRejectedValue(new IncidentCommandError(409, { code: 'VERSION_CONFLICT' }));
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Resolver incidencia de ALQ-1001' }));
    await user.type(screen.getByLabelText('Resumen de la resolución'), 'ok');
    const calls = listIncidentsMock.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Confirmar resolución' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Otra persona modificó/);
    await waitFor(() => expect(listIncidentsMock.mock.calls.length).toBeGreaterThan(calls));
  });

  it('un 422 al resolver explica que solo las leves se resuelven desde la bandeja', async () => {
    const user = setupUser();
    listIncidentsMock.mockResolvedValue([leve]);
    resolveIncidentMock.mockRejectedValue(new IncidentCommandError(422, { code: 'INCIDENT_DIRECT_RESOLVE_NOT_ALLOWED' }));
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Resolver incidencia de ALQ-1001' }));
    await user.type(screen.getByLabelText('Resumen de la resolución'), 'ok');
    await user.click(screen.getByRole('button', { name: 'Confirmar resolución' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Solo las incidencias leves/);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Registrar incidencia valida los obligatorios y crea con los datos del formulario', async () => {
    const user = setupUser();
    listIncidentsMock.mockResolvedValue([leve]);
    listRentalsMock.mockResolvedValue([
      { id: 'rent-9', branchId: 'b1', vehiclePlate: 'K1A-111', customerName: 'Luis Rojas', status: 'ACTIVE' },
    ]);
    listReturnsMock.mockResolvedValue([
      { id: 'ret-9', branchId: 'b1', rentalId: 'rent-9', status: 'INSPECCION', vehiclePlate: 'K1A-111', scheduledAt: '2026-10-05T09:00:00Z' },
    ]);
    createIncidentMock.mockResolvedValue(makeIncident({ id: 'inc-new', rentalCode: 'ALQ-2000' }));
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Registrar incidencia' }));

    const dialog = screen.getByRole('dialog', { name: 'Registrar incidencia' });
    await user.click(within(dialog).getByRole('button', { name: 'Registrar incidencia' }));
    expect(within(dialog).getByText('Selecciona el alquiler relacionado.')).toBeInTheDocument();
    expect(within(dialog).getByText('Describe lo ocurrido.')).toBeInTheDocument();
    expect(createIncidentMock).not.toHaveBeenCalled();

    await within(dialog).findByRole('option', { name: 'K1A-111 — Luis Rojas' });
    await user.selectOptions(within(dialog).getByLabelText('Alquiler'), 'rent-9');
    await user.selectOptions(within(dialog).getByLabelText(/Devolución/), 'ret-9');
    await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'CRASH_OR_DAMAGE');
    await user.selectOptions(within(dialog).getByLabelText('Severidad'), 'MODERADA');
    await user.type(within(dialog).getByLabelText('Descripción de la observación'), 'Golpe en parachoques');
    await user.type(within(dialog).getByLabelText(/Sugerencia/), 'Derivar a Motrix');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar incidencia' }));

    await waitFor(() =>
      expect(createIncidentMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', {
        rentalId: 'rent-9',
        returnId: 'ret-9',
        type: 'CRASH_OR_DAMAGE',
        severity: 'MODERADA',
        description: 'Golpe en parachoques',
        suggestion: 'Derivar a Motrix',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Incidencia registrada para ALQ-2000.');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Conductor no autorizado fuerza severidad Grave, muestra el aviso y envia el tipo', async () => {
    const user = setupUser();
    listIncidentsMock.mockResolvedValue([leve]);
    listRentalsMock.mockResolvedValue([
      { id: 'rent-9', branchId: 'b1', vehiclePlate: 'K1A-111', customerName: 'Luis Rojas', status: 'ACTIVE' },
    ]);
    listReturnsMock.mockResolvedValue([]);
    createIncidentMock.mockResolvedValue(makeIncident({ id: 'inc-new', rentalCode: 'ALQ-2000' }));
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Registrar incidencia' }));
    const dialog = screen.getByRole('dialog', { name: 'Registrar incidencia' });
    await within(dialog).findByRole('option', { name: 'K1A-111 — Luis Rojas' });
    await user.selectOptions(within(dialog).getByLabelText('Alquiler'), 'rent-9');
    await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'UNAUTHORIZED_DRIVER');
    expect(within(dialog).getByLabelText('Severidad')).toHaveValue('GRAVE');
    expect(within(dialog).getByLabelText('Severidad')).toBeDisabled();
    expect(within(dialog).getByTestId('unauthorized-driver-notice')).toHaveTextContent(/La decisión \(retener garantía, resolver el contrato o ninguna\) la toma Gerencia caso por caso/);
    await user.type(within(dialog).getByLabelText('Descripción de la observación'), 'Manejaba un familiar');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar incidencia' }));
    await waitFor(() =>
      expect(createIncidentMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', expect.objectContaining({ type: 'UNAUTHORIZED_DRIVER', severity: 'GRAVE' })),
    );
  });

  it('abre el formulario preseleccionado con ?registrar=1&rentalId= (entrada desde Devolucion)', async () => {
    listIncidentsMock.mockResolvedValue([]);
    listRentalsMock.mockResolvedValue([
      { id: 'rent-9', branchId: 'b1', vehiclePlate: 'K1A-111', customerName: 'Luis Rojas', status: 'ACTIVE' },
    ]);
    renderScreen('/incidencias?rentalId=rent-9&registrar=1');
    const dialog = await screen.findByRole('dialog', { name: 'Registrar incidencia' });
    await within(dialog).findByRole('option', { name: 'K1A-111 — Luis Rojas' });
    expect(within(dialog).getByLabelText('Alquiler')).toHaveValue('rent-9');
  });

  it('"Abrir" lleva al detalle de la incidencia', async () => {
    listIncidentsMock.mockResolvedValue([grave]);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir incidencia de ALQ-1002' }));
    expect(await screen.findByText('detalle de incidencia')).toBeInTheDocument();
  });

  it('estado EMPTY, LOADING y paginacion keyset (Cargar más)', async () => {
    listIncidentsMock.mockResolvedValueOnce([]);
    const { unmount } = renderScreen();
    expect(screen.getByText('Cargando incidencias…')).toBeInTheDocument();
    expect(await screen.findByText('Todavía no hay incidencias registradas.')).toBeInTheDocument();
    unmount();

    const page = Array.from({ length: 20 }, (_, i) => makeIncident({ id: `inc-${i}`, createdAt: `2026-10-05T10:${String(i).padStart(2, '0')}:00Z` }));
    listIncidentsMock.mockReset();
    listIncidentsMock.mockResolvedValueOnce(page).mockResolvedValueOnce([makeIncident({ id: 'inc-last' })]);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más' }));
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(22));
    expect(listIncidentsMock.mock.calls[1][3].cursor).toEqual({ createdAt: page[19].createdAt, id: 'inc-19' });
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
  });

  it('oculta "Registrar incidencia" y "Resolver" a quien solo tiene INCIDENT.VIEW', async () => {
    setPermissions(INCIDENT_VIEW_ONLY);
    listIncidentsMock.mockResolvedValue([leve]);
    renderScreen();
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'Registrar incidencia' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Resolver incidencia/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Abrir incidencia/ })).toBeInTheDocument();
  });

  it('no tiene violaciones de accesibilidad (axe) en READY ni con el dialogo abierto', async () => {
    listIncidentsMock.mockResolvedValue([leve, grave, cerrada]);
    const { container } = renderScreen();
    await screen.findByRole('table');
    expect(await axe(container)).toHaveNoViolations();

    fireEvent.click(screen.getByRole('button', { name: 'Resolver incidencia de ALQ-1001' }));
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
