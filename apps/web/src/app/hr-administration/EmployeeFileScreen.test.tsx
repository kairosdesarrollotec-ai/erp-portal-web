import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EmployeeFileScreen } from './EmployeeFileScreen';
import { HrApiError } from './hr-client';
import { baseContext, makeDetail } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getEmployeeMock = vi.fn();
const linkMock = vi.fn();

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./hr-client', async () => {
  const actual = await vi.importActual<typeof import('./hr-client')>('./hr-client');
  return { ...actual, getEmployee: (...a: unknown[]) => getEmployeeMock(...a), linkEmployeeAccount: (...a: unknown[]) => linkMock(...a) };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/emp-1', state: baseContext }]}>
      <Routes>
        <Route path="/personal/:id" element={<EmployeeFileScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

const ALL = [
  'HR_ADMINISTRATION.VIEW_EMPLOYEES',
  'HR_ADMINISTRATION.SCHEDULE_VACATION',
  'HR_ADMINISTRATION.REQUEST_FIELD_TRIP',
  'HR_ADMINISTRATION.TERMINATE_EMPLOYMENT',
];

describe('EmployeeFileScreen (ADP-01 ficha)', () => {
  beforeEach(() => {
    getEmployeeMock.mockReset();
    setPermissions(ALL);
  });

  it('muestra los datos laborales y las acciones permitidas', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail());
    renderScreen();
    expect(await screen.findByRole('heading', { name: 'Carlos Pérez' })).toBeInTheDocument();
    expect(screen.getByText('Planilla')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Asistencia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar vacaciones' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar salida a campo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar renuncia o despido' })).toBeInTheDocument();
  });

  it('sin permisos puntuales no hay botones de accion', async () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    getEmployeeMock.mockResolvedValue(makeDetail());
    renderScreen();
    await screen.findByRole('heading', { name: 'Carlos Pérez' });
    expect(screen.queryByRole('button', { name: 'Solicitar vacaciones' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar salida a campo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar renuncia o despido' })).not.toBeInTheDocument();
  });

  it('la referencia a Reclutamiento es un enlace; la ficha no se fusiona con el candidato', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail({ candidateId: 'cand-9' }));
    renderScreen();
    const link = await screen.findByRole('link', { name: /Ver su proceso en Reclutamiento/ });
    expect(link).toHaveAttribute('href', '/reclutamiento/candidatos/cand-9');
    expect(screen.getByText(/no se fusiona con la de candidato/)).toBeInTheDocument();
  });

  it('una persona terminada no ofrece solicitudes ni nuevo termino', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail({ status: 'TERMINADO', terminatedAt: '2026-10-01T00:00:00Z', terminationReason: 'RENUNCIA' }));
    renderScreen();
    expect(await screen.findByText(/La relación laboral terminó/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar renuncia o despido' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar vacaciones' })).not.toBeInTheDocument();
  });

  it('estados 404 y error recuperable', async () => {
    getEmployeeMock.mockRejectedValueOnce(new HrApiError(404));
    const { unmount } = renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No encontramos la ficha/);
    unmount();
    getEmployeeMock.mockRejectedValueOnce(new Error('x'));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar la ficha/);
  });

  it('muestra los memos de advertencia (generados por el sistema) y las capacitaciones de la persona', async () => {
    getEmployeeMock.mockResolvedValue(
      makeDetail({
        recentMemos: [{ id: 'm1', employeeId: 'emp-1', kind: 'TARDANZA_CAMPO', violationNumber: 4, reason: 'Cuarta tardanza al regresar de campo', issuedOn: '2026-10-09', generatedBy: 'SISTEMA', createdAt: '2026-10-09T10:00:00Z' }],
        recentTrainings: [{ id: 't1', topic: 'Manejo defensivo', heldOn: '2026-10-01', durationMinutes: 60, attendees: [], createdAt: '2026-10-01T10:00:00Z' }],
      }),
    );
    renderScreen();
    expect(await screen.findByRole('heading', { name: 'Memos de advertencia' })).toBeInTheDocument();
    expect(screen.getByText('Cuarta tardanza al regresar de campo')).toBeInTheDocument();
    expect(screen.getByText(/generado automáticamente/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Capacitaciones' })).toBeInTheDocument();
    expect(screen.getByText(/Manejo defensivo/)).toBeInTheDocument();
  });

  describe('vinculo usuario-ficha por correo', () => {
    it('sin vincular con correo y MANAGE_EMPLOYEES: boton Vincular cuenta; al vincular recarga', async () => {
      setPermissions([...ALL, 'HR_ADMINISTRATION.MANAGE_EMPLOYEES']);
      getEmployeeMock.mockResolvedValueOnce(makeDetail({ accountLinked: false })).mockResolvedValue(makeDetail({ accountLinked: true }));
      linkMock.mockResolvedValue({});
      renderScreen();
      expect(await screen.findByTestId('account-link-status')).toHaveTextContent('Sin vincular (por correo)');
      fireEvent.click(screen.getByRole('button', { name: 'Vincular cuenta' }));
      await waitFor(() => expect(linkMock).toHaveBeenCalledWith('tok', 'emp-1'));
      await waitFor(() => expect(screen.getByTestId('account-link-status')).toHaveTextContent('Cuenta vinculada (por correo)'));
      expect(screen.queryByRole('button', { name: 'Vincular cuenta' })).not.toBeInTheDocument();
    });

    it('sin permiso MANAGE_EMPLOYEES o sin correo no hay boton', async () => {
      getEmployeeMock.mockResolvedValue(makeDetail({ accountLinked: false }));
      const { unmount } = renderScreen();
      await screen.findByTestId('account-link-status');
      expect(screen.queryByRole('button', { name: 'Vincular cuenta' })).not.toBeInTheDocument();
      unmount();
      setPermissions([...ALL, 'HR_ADMINISTRATION.MANAGE_EMPLOYEES']);
      getEmployeeMock.mockResolvedValue(makeDetail({ accountLinked: false, email: undefined }));
      renderScreen();
      await screen.findByTestId('account-link-status');
      expect(screen.queryByRole('button', { name: 'Vincular cuenta' })).not.toBeInTheDocument();
      expect(screen.getByText(/Registra un correo en la ficha/)).toBeInTheDocument();
    });

    it('traduce 404 USER_ACCOUNT_NOT_FOUND', async () => {
      const { HrCommandError } = await import('./hr-client');
      setPermissions([...ALL, 'HR_ADMINISTRATION.MANAGE_EMPLOYEES']);
      getEmployeeMock.mockResolvedValue(makeDetail({ accountLinked: false }));
      linkMock.mockRejectedValue(new HrCommandError(404, { code: 'USER_ACCOUNT_NOT_FOUND' }));
      renderScreen();
      fireEvent.click(await screen.findByRole('button', { name: 'Vincular cuenta' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/No existe una cuenta de usuario/);
    });
  });

  it('HU-35: si el back enmascara el documento (documentNumber null) la ficha no muestra la fila Documento', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail({ documentNumber: null, restrictedFields: ['documentNumber'] }));
    renderScreen();
    expect(await screen.findByRole('heading', { name: 'Carlos Pérez' })).toBeInTheDocument();
    expect(screen.queryByText('Documento')).not.toBeInTheDocument();
    expect(screen.queryByText(/45678912/)).not.toBeInTheDocument();
  });

  it('HU-35: con documentNumber presente sí lo muestra', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail());
    renderScreen();
    expect(await screen.findByText(/45678912/)).toBeInTheDocument();
  });

  it('HU-35: muestra datos bancarios y de contrato cuando están disponibles', async () => {
    getEmployeeMock.mockResolvedValue(
      makeDetail({
        baseSalary: 2800,
        bankName: 'BCP',
        bankAccountNumber: '191-12345678-0-12',
        bankAccountCci: '00219100123456780012',
        contractType: 'PLAZO_INDETERMINADO',
        contractUrl: 'https://storage.veloxrent.pe/contratos/emp-1.pdf',
        contractNotes: 'Contrato firmado a tiempo indeterminado',
      }),
    );
    renderScreen();
    expect(await screen.findByText('S/ 2,800.00')).toBeInTheDocument();
    expect(screen.getByText('BCP')).toBeInTheDocument();
    expect(screen.getByText('191-12345678-0-12')).toBeInTheDocument();
    expect(screen.getByText('00219100123456780012')).toBeInTheDocument();
    expect(screen.getByText('PLAZO_INDETERMINADO')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver contrato' })).toHaveAttribute(
      'href',
      'https://storage.veloxrent.pe/contratos/emp-1.pdf',
    );
    expect(screen.getByText('Contrato firmado a tiempo indeterminado')).toBeInTheDocument();
  });

  it('HU-35: muestra indicador [Restringido] cuando los campos sensibles están en restrictedFields', async () => {
    getEmployeeMock.mockResolvedValue(
      makeDetail({
        baseSalary: null,
        bankName: null,
        bankAccountNumber: null,
        bankAccountCci: null,
        contractType: null,
        contractUrl: null,
        contractNotes: null,
        restrictedFields: [
          'baseSalary',
          'bankName',
          'bankAccountNumber',
          'bankAccountCci',
          'contractType',
          'contractUrl',
          'contractNotes',
        ],
      }),
    );
    renderScreen();
    await screen.findByRole('heading', { name: 'Carlos Pérez' });
    const restrictedBadges = screen.getAllByText('Restringido');
    expect(restrictedBadges.length).toBeGreaterThanOrEqual(6);
  });
});

