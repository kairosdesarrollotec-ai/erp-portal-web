import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReturnsListScreen } from './ReturnsListScreen';
import { baseContext, makeReturn } from './test-utils';
import { setPermissions } from '../../test/permissions';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));

const RETURN_LIST = [
  'RETURN.READ', 'RETURN.CREATE', 'RETURN.RECEIVE_PROVISIONAL',
] as const;

const listReturnsMock = vi.fn();
const listRentalsMock = vi.fn();
const scheduleReturnMock = vi.fn();
const listRemindersMock = vi.fn();
const listAlertsMock = vi.fn();
const registerReminderMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./returns-client', async () => {
  const actual = await vi.importActual<typeof import('./returns-client')>('./returns-client');
  return {
    ...actual,
    listReturns: (...args: unknown[]) => listReturnsMock(...args),
    scheduleReturn: (...args: unknown[]) => scheduleReturnMock(...args),
    listReturnReminders: (...args: unknown[]) => listRemindersMock(...args),
    listReturnAlerts: (...args: unknown[]) => listAlertsMock(...args),
    registerReturnReminder: (...args: unknown[]) => registerReminderMock(...args),
  };
});
vi.mock('../rentals/rentals-client', async () => {
  const actual = await vi.importActual<typeof import('../rentals/rentals-client')>('../rentals/rentals-client');
  return { ...actual, listRentals: (...args: unknown[]) => listRentalsMock(...args) };
});

const activeRental = {
  id: 'rent-9',
  status: 'ACTIVE',
  branchId: 'b1',
  customerName: 'Luis Rojas',
  vehicleBrand: 'Kia',
  vehicleModel: 'Rio',
  vehiclePlate: 'K1A-111',
  expectedEndAt: '2026-10-06T10:00:00Z',
};

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/devoluciones', state: baseContext }]}>
      <Routes>
        <Route path="/devoluciones" element={<ReturnsListScreen />} />
        <Route path="/devoluciones/recepcion/:rentalId" element={<div>pantalla recepcion</div>} />
        <Route path="/devoluciones/:id/alcoholimetro" element={<div>pantalla alcoholimetro</div>} />
        <Route path="/devoluciones/:id/resultado" element={<div>pantalla resultado</div>} />
        <Route path="/devoluciones/:id/cierre" element={<div>pantalla cierre</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReturnsListScreen (DEV-01)', () => {
  beforeEach(() => {
    listReturnsMock.mockReset();
    listRentalsMock.mockReset();
    scheduleReturnMock.mockReset();
    listRemindersMock.mockReset();
    listAlertsMock.mockReset();
    registerReminderMock.mockReset();
    listRemindersMock.mockResolvedValue([]);
    listAlertsMock.mockResolvedValue([]);
    listRentalsMock.mockResolvedValue([]);
    sessionStorage.clear();
    setPermissions(RETURN_LIST);
  });

  it('muestra la bandeja con cliente, vehiculo, badge de etapa y fecha programada', async () => {
    listReturnsMock.mockResolvedValue([makeReturn({ status: 'RECEPCION_PROVISIONAL' })]);
    renderScreen();

    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(screen.getByText('D0Y-704')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Recepción')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
  });

  it('consulta el backend con el contexto empresa/sede del usuario (aislamiento por sede)', async () => {
    listReturnsMock.mockResolvedValue([makeReturn()]);
    renderScreen();
    await screen.findByText('Maria Quispe');
    expect(listReturnsMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', expect.objectContaining({ limit: 20 }));
  });

  it('nunca muestra devoluciones de otra sede aunque el backend las devolviera', async () => {
    listReturnsMock.mockResolvedValue([
      makeReturn({ id: 'mine', customerName: 'Cliente de mi sede' }),
      makeReturn({ id: 'other', branchId: 'b-otra', customerName: 'Cliente de otra sede' }),
    ]);
    renderScreen();
    expect(await screen.findByText('Cliente de mi sede')).toBeInTheDocument();
    expect(screen.queryByText('Cliente de otra sede')).not.toBeInTheDocument();
  });

  it('muestra el estado vacio', async () => {
    listReturnsMock.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('Todavía no hay devoluciones registradas.')).toBeInTheDocument();
  });

  it('muestra error recuperable en lenguaje de negocio', async () => {
    listReturnsMock.mockRejectedValue(new Error('boom'));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la bandeja de devoluciones');
  });

  it('Continuar retoma el expediente segun su estado (INSPECCION/CON_DANOS -> resultado, CERRADA -> cierre)', async () => {
    listReturnsMock.mockResolvedValue([makeReturn({ id: 'r-dmg', status: 'CON_DANOS' })]);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('pantalla resultado')).toBeInTheDocument();
  });

  it('una devolucion cerrada ofrece "Ver expediente"', async () => {
    listReturnsMock.mockResolvedValue([makeReturn({ id: 'r-closed', status: 'CERRADA' })]);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Ver expediente' }));
    expect(await screen.findByText('pantalla cierre')).toBeInTheDocument();
  });

  it('el filtro de estado se conserva en sesion y se envia al backend', async () => {
    listReturnsMock.mockResolvedValue([makeReturn()]);
    renderScreen();
    await screen.findByText('Maria Quispe');
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'CON_DANOS' } });
    await waitFor(() =>
      expect(listReturnsMock).toHaveBeenLastCalledWith(
        'fake-id-token',
        'c1',
        'b1',
        expect.objectContaining({ status: 'CON_DANOS' }),
      ),
    );
    expect(sessionStorage.getItem('kairos.devoluciones.filtro')).toBe('CON_DANOS');
  });

  it('lista los alquileres activos y "Iniciar devolución" lleva a la recepcion (1 accion)', async () => {
    listReturnsMock.mockResolvedValue([]);
    listRentalsMock.mockResolvedValue([activeRental]);
    renderScreen();
    fireEvent.click(await screen.findByRole('link', { name: 'Iniciar devolución de K1A-111' }));
    expect(await screen.findByText('pantalla recepcion')).toBeInTheDocument();
  });

  it('programar una devolucion llama a POST /returns y recarga la bandeja', async () => {
    listReturnsMock.mockResolvedValue([]);
    listRentalsMock.mockResolvedValue([activeRental]);
    scheduleReturnMock.mockResolvedValue(makeReturn({ status: 'PROGRAMADA' }));
    renderScreen();

    fireEvent.click(await screen.findByRole('button', { name: 'Programar devolución de K1A-111' }));
    fireEvent.change(screen.getByLabelText('Fecha y hora pactada'), { target: { value: '2026-10-06T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }));

    await waitFor(() =>
      expect(scheduleReturnMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', 'rent-9', expect.any(String)),
    );
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    listReturnsMock.mockResolvedValue([makeReturn()]);
    listRentalsMock.mockResolvedValue([activeRental]);
    const { container } = renderScreen();
    await screen.findByText('Maria Quispe');
    expect(await axe(container)).toHaveNoViolations();
  });
});

const REMINDER = {
  id: 'rem-1',
  status: 'PENDING' as const,
  dueAt: '2026-10-14T20:00:00Z',
  text: 'Hola Maria, te recordamos que tu devolucion es hoy a las 11:00 a. m.',
  generatedAt: '2026-10-14T15:00:00Z',
  sentAt: null,
  sentBy: null,
  note: null,
  attempts: 0,
  version: 1,
  etag: '"1"',
};
const INBOX_ITEM = {
  returnId: 'ret-1',
  rentalId: 'rent-1',
  returnStatus: 'PROGRAMADA' as const,
  scheduledAt: '2026-10-14T16:00:00Z',
  vehiclePlate: 'D0Y-704',
  customerName: 'Maria Quispe',
  customerPhone: '987654321',
  reminder: REMINDER,
};

describe('ReturnsListScreen (DEV-01) - recordatorios y alertas', () => {
  beforeEach(() => {
    listReturnsMock.mockReset();
    listRentalsMock.mockReset();
    listRemindersMock.mockReset();
    listAlertsMock.mockReset();
    registerReminderMock.mockReset();
    listRentalsMock.mockResolvedValue([]);
    listReturnsMock.mockResolvedValue([makeReturn()]);
    listAlertsMock.mockResolvedValue([]);
    listRemindersMock.mockResolvedValue([]);
    sessionStorage.clear();
    setPermissions(RETURN_LIST);
  });

  it('muestra el recordatorio con el texto de WhatsApp, enlace wa.me y la hora en Lima', async () => {
    listRemindersMock.mockResolvedValue([INBOX_ITEM]);
    renderScreen();
    expect(await screen.findByTestId('reminder-text')).toHaveTextContent(REMINDER.text);
    expect(listRemindersMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
    const link = screen.getByRole('link', { name: 'Abrir en WhatsApp' });
    expect(link).toHaveAttribute('href', `https://wa.me/51987654321?text=${encodeURIComponent(REMINDER.text)}`);
    expect(screen.getByText('Pendiente de envío')).toBeInTheDocument();
    // 16:00Z = 11:00 en Lima
    expect(screen.getByText(/Devolución pactada: 14\/10\/2026 11:00/)).toBeInTheDocument();
  });

  it('sin telefono no hay enlace de WhatsApp pero si boton de copiar', async () => {
    listRemindersMock.mockResolvedValue([{ ...INBOX_ITEM, customerPhone: null }]);
    renderScreen();
    await screen.findByTestId('reminder-text');
    expect(screen.queryByRole('link', { name: 'Abrir en WhatsApp' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar mensaje' })).toBeInTheDocument();
  });

  it('copia el mensaje al portapapeles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    listRemindersMock.mockResolvedValue([INBOX_ITEM]);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Copiar mensaje' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(REMINDER.text));
    expect(await screen.findByText('Mensaje copiado.')).toBeInTheDocument();
  });

  it('"Marcar enviado" registra SENT con el etag del recordatorio y recarga la bandeja', async () => {
    listRemindersMock.mockResolvedValueOnce([INBOX_ITEM]).mockResolvedValue([]);
    registerReminderMock.mockResolvedValue({ ...REMINDER, status: 'SENT' });
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar enviado' }));
    await waitFor(() =>
      expect(registerReminderMock).toHaveBeenCalledWith('fake-id-token', 'ret-1', 'c1', 'b1', '"1"', { result: 'SENT' }),
    );
    await waitFor(() => expect(screen.queryByTestId('reminder-text')).not.toBeInTheDocument());
  });

  it('"Marcar fallido" exige una nota y la envia', async () => {
    listRemindersMock.mockResolvedValue([INBOX_ITEM]);
    registerReminderMock.mockResolvedValue({ ...REMINDER, status: 'FAILED' });
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar fallido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar fallo' }));
    expect(await screen.findByText('Indica el motivo del fallo.')).toBeInTheDocument();
    expect(registerReminderMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Motivo del fallo (obligatorio)'), { target: { value: 'No contesta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar fallo' }));
    await waitFor(() =>
      expect(registerReminderMock).toHaveBeenCalledWith('fake-id-token', 'ret-1', 'c1', 'b1', '"1"', {
        result: 'FAILED',
        note: 'No contesta',
      }),
    );
  });

  it('un recordatorio FAILED admite reintento y muestra el motivo anterior; uno SENT es definitivo', async () => {
    listRemindersMock.mockResolvedValue([
      { ...INBOX_ITEM, reminder: { ...REMINDER, status: 'FAILED', note: 'Numero apagado', attempts: 1 } },
      {
        ...INBOX_ITEM,
        returnId: 'ret-2',
        customerName: 'Luis Rojas',
        reminder: { ...REMINDER, id: 'rem-2', status: 'SENT', sentAt: '2026-10-14T15:30:00Z' },
      },
    ]);
    renderScreen();
    expect(await screen.findByText(/Último intento fallido: Numero apagado/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Marcar enviado' })).toHaveLength(1);
    expect(screen.getByText(/Enviado el 14\/10\/2026 10:30/)).toBeInTheDocument();
  });

  it('si el recordatorio ya fue enviado (409) muestra el aviso de negocio y recarga', async () => {
    const { ReturnCommandError } = await import('./returns-client');
    listRemindersMock.mockResolvedValue([INBOX_ITEM]);
    registerReminderMock.mockRejectedValue(new ReturnCommandError(409, { code: 'RETURN_REMINDER_ALREADY_SENT' }));
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar enviado' }));
    expect(await screen.findByText(/ya fue registrado como enviado/)).toBeInTheDocument();
    expect(listRemindersMock).toHaveBeenCalledTimes(2);
  });

  it('sin permiso RETURN.CREATE no ofrece registrar el resultado', async () => {
    setPermissions(['RETURN.READ']);
    listRemindersMock.mockResolvedValue([INBOX_ITEM]);
    renderScreen();
    await screen.findByTestId('reminder-text');
    expect(screen.queryByRole('button', { name: 'Marcar enviado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar fallido' })).not.toBeInTheDocument();
  });

  it('un fallo al cargar recordatorios no bloquea la bandeja', async () => {
    listRemindersMock.mockRejectedValue(new Error('boom'));
    renderScreen();
    expect(await screen.findByText('Maria Quispe')).toBeInTheDocument();
    expect(await screen.findByText(/No pudimos cargar los recordatorios/)).toBeInTheDocument();
  });

  it('muestra banners de garantia por liberar e inmovilizacion y abre el expediente correspondiente', async () => {
    listAlertsMock.mockResolvedValue([
      {
        type: 'WARRANTY_RELEASE',
        returnId: 'ret-w',
        rentalId: 'rent-w',
        returnStatus: 'SIN_DANOS',
        returnVersion: 3,
        vehiclePlate: 'AAA-111',
        customerName: 'Ana Perez',
        receivedAt: '2026-10-13T16:00:00Z',
        warrantyRelease: { level: 'OVERDUE', deadlineAt: '2026-10-14T16:00:00Z', hoursRemaining: -2.5 },
        immobilization: null,
      },
      {
        type: 'IMMOBILIZATION',
        returnId: 'ret-i',
        rentalId: 'rent-i',
        returnStatus: 'CON_DANOS',
        returnVersion: 4,
        vehiclePlate: 'BBB-222',
        customerName: 'Pedro Diaz',
        receivedAt: '2026-10-12T16:00:00Z',
        warrantyRelease: null,
        immobilization: { since: '2026-10-12T16:00:00Z', hoursElapsed: 52, pendingDays: 2, dailyRate: 120, suggestedAmount: 240 },
      },
    ]);
    renderScreen();
    expect(await screen.findByText(/Garantía vencida: liberar ya — AAA-111 · Ana Perez/)).toBeInTheDocument();
    expect(screen.getByText(/venció el 14\/10\/2026 11:00 \(hace 2,5 h\)/)).toBeInTheDocument();
    expect(screen.getByText(/Inmovilización por más de 24 h sin cobrar — BBB-222/)).toBeInTheDocument();
    expect(screen.getByText(/2 días de paralización pendientes de cobro/)).toBeInTheDocument();
    expect(screen.getByText(/Monto sugerido: S\/ 240\.00 \(el cobro es manual\)/)).toBeInTheDocument();
    expect(listAlertsMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1');
  });

  it('las filas con alertas muestran una etiqueta', async () => {
    listReturnsMock.mockResolvedValue([
      makeReturn({
        status: 'SIN_DANOS',
        alerts: {
          warrantyRelease: { level: 'DUE_SOON', deadlineAt: '2026-10-14T16:00:00Z', hoursRemaining: 3 },
          immobilization: null,
        },
      }),
    ]);
    renderScreen();
    expect(await screen.findByText('Garantía por liberar')).toBeInTheDocument();
  });
});

