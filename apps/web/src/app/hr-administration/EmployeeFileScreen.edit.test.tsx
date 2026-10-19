import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EmployeeFileScreen } from './EmployeeFileScreen';
import { HrCommandError } from './hr-client';
import { baseContext, makeDetail } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getEmployeeMock = vi.fn();
const updateMock = vi.fn();
const listAreasMock = vi.fn();
const CATALOG = [
  { code: 'ADMINISTRACION', name: 'Administración', description: null, sortOrder: 10 },
  { code: 'ATENCION_AL_CLIENTE', name: 'Atención al cliente', description: null, sortOrder: 50 },
  { code: 'OPERACIONES', name: 'Operaciones', description: 'Órgano de línea', sortOrder: 70 },
];

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./hr-client', async () => {
  const actual = await vi.importActual<typeof import('./hr-client')>('./hr-client');
  return { ...actual, getEmployee: (...a: unknown[]) => getEmployeeMock(...a), updateEmployee: (...a: unknown[]) => updateMock(...a), listHrAreas: (...a: unknown[]) => listAreasMock(...a) };
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

const MANAGE = ['HR_ADMINISTRATION.VIEW_EMPLOYEES', 'HR_ADMINISTRATION.MANAGE_EMPLOYEES'];
const linked = () => makeDetail({ accountLinked: true, email: 'carlos@veloxrent.pe', version: 3 });

/** Mientras carga el catalogo el area es un input de solo lectura (tambien con rol combobox): se espera al selector. */
async function areaSelect(dialog: HTMLElement) {
  await within(dialog).findByRole('option', { name: 'Otra (texto libre)' });
  return within(dialog).getByRole('combobox', { name: 'Área' });
}

async function openDialog() {
  fireEvent.click(await screen.findByRole('button', { name: 'Editar ficha' }));
  return screen.findByRole('dialog');
}

describe('EmployeeFileScreen - edicion de ficha (contrato 0.6.0)', () => {
  beforeEach(() => {
    getEmployeeMock.mockReset();
    updateMock.mockReset();
    listAreasMock.mockReset().mockResolvedValue(CATALOG);
    setPermissions(MANAGE);
  });

  it('el boton Editar ficha solo existe con MANAGE_EMPLOYEES y si la persona no esta terminada', async () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    getEmployeeMock.mockResolvedValue(makeDetail());
    const { unmount } = renderScreen();
    await screen.findByRole('heading', { name: 'Carlos Pérez' });
    expect(screen.queryByRole('button', { name: 'Editar ficha' })).not.toBeInTheDocument();
    unmount();
    setPermissions(MANAGE);
    getEmployeeMock.mockResolvedValue(makeDetail({ status: 'TERMINADO' }));
    renderScreen();
    await screen.findByText(/La relación laboral terminó/);
    expect(screen.queryByRole('button', { name: 'Editar ficha' })).not.toBeInTheDocument();
  });

  it('guarda solo los campos cambiados enviando la version leida (If-Match) y recarga la ficha', async () => {
    getEmployeeMock.mockResolvedValueOnce(makeDetail({ version: 3 })).mockResolvedValue(makeDetail({ version: 4, jobTitle: 'Jefe de flota' }));
    updateMock.mockResolvedValue({ ...makeDetail({ version: 4 }), jobTitle: 'Jefe de flota' });
    renderScreen();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Cargo'), { target: { value: ' Jefe de flota ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith('tok', 'emp-1', { jobTitle: 'Jefe de flota' }, 3));
    expect(await screen.findByTestId('edit-saved-notice')).toHaveTextContent('Ficha actualizada.');
    expect(screen.queryByTestId('relink-notice')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('sin cambios o con datos invalidos no llama al servidor', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail());
    renderScreen();
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    expect(await within(dialog).findByText('No hay cambios para guardar.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Nombre completo'), { target: { value: '  ' } });
    fireEvent.change(within(dialog).getByLabelText('Correo'), { target: { value: 'no-es-correo' } });
    fireEvent.change(within(dialog).getByLabelText('Sueldo base'), { target: { value: '-5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    expect(await within(dialog).findByText('Indica el nombre completo.')).toBeInTheDocument();
    expect(within(dialog).getByText('Indica un correo válido.')).toBeInTheDocument();
    expect(within(dialog).getByText(/mayor o igual a 0/)).toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('avisa ANTES de guardar que cambiar el correo de una ficha vinculada la re-vincula', async () => {
    getEmployeeMock.mockResolvedValue(linked());
    renderScreen();
    const dialog = await openDialog();
    expect(within(dialog).queryByTestId('relink-warning')).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Correo'), { target: { value: 'nuevo@veloxrent.pe' } });
    expect(within(dialog).getByTestId('relink-warning')).toHaveTextContent(/se re-vinculará a la cuenta del correo nuevo/);
  });

  it('RELINKED: muestra el aviso de re-vinculacion con correo anterior y nuevo', async () => {
    getEmployeeMock.mockResolvedValueOnce(linked()).mockResolvedValue(linked());
    updateMock.mockResolvedValue({
      ...linked(),
      accountRelink: { action: 'RELINKED', reason: 'EMAIL_CHANGED', previousEmail: 'carlos@veloxrent.pe', newEmail: 'nuevo@veloxrent.pe' },
    });
    renderScreen();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Correo'), { target: { value: 'nuevo@veloxrent.pe' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    const notice = await screen.findByTestId('relink-notice');
    expect(notice).toHaveTextContent('de carlos@veloxrent.pe a nuevo@veloxrent.pe');
    expect(notice).toHaveTextContent(/se re-vinculó a la cuenta del correo nuevo/);
    expect(updateMock).toHaveBeenCalledWith('tok', 'emp-1', { email: 'nuevo@veloxrent.pe' }, 3);
  });

  it('UNLINKED: avisa que la ficha quedo sin vincular porque no existe cuenta con el correo nuevo', async () => {
    getEmployeeMock.mockResolvedValueOnce(linked()).mockResolvedValue(makeDetail({ accountLinked: false }));
    updateMock.mockResolvedValue({
      ...makeDetail({ accountLinked: false }),
      accountRelink: { action: 'UNLINKED', reason: 'EMAIL_CHANGED', previousEmail: 'carlos@veloxrent.pe', newEmail: 'sincuenta@veloxrent.pe' },
    });
    renderScreen();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Correo'), { target: { value: 'sincuenta@veloxrent.pe' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    const notice = await screen.findByTestId('relink-notice');
    expect(notice).toHaveTextContent(/no existe una cuenta con ese correo/);
    expect(notice).toHaveTextContent(/sin vincular/);
    expect(await screen.findByTestId('account-link-status')).toHaveTextContent('Sin vincular (por correo)');
  });

  it('409 EMPLOYEE_ACCOUNT_ALREADY_LINKED: error visible, el dialogo sigue abierto y no se recarga', async () => {
    getEmployeeMock.mockResolvedValue(linked());
    updateMock.mockRejectedValue(new HrCommandError(409, { code: 'EMPLOYEE_ACCOUNT_ALREADY_LINKED' }));
    renderScreen();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Correo'), { target: { value: 'otro@veloxrent.pe' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    expect(await within(dialog).findByTestId('edit-error')).toHaveTextContent(/ya está vinculada a otra ficha de personal. No se aplicó ningún cambio/);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Correo')).toHaveValue('otro@veloxrent.pe');
    expect(getEmployeeMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('edit-saved-notice')).not.toBeInTheDocument();
  });

  it('422/409 de dominio genericos se muestran en lenguaje de negocio', async () => {
    getEmployeeMock.mockResolvedValue(makeDetail());
    updateMock.mockRejectedValue(new HrCommandError(409, { code: 'EMPLOYEE_TERMINATED' }));
    renderScreen();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Cargo'), { target: { value: 'Otro' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    expect(await within(dialog).findByTestId('edit-error')).toHaveTextContent(/ya terminó/);
  });

  it('412: banner de conflicto; Recargar ficha trae la version actual y reinicia el formulario', async () => {
    getEmployeeMock.mockResolvedValueOnce(makeDetail({ version: 3, jobTitle: 'Conductor' })).mockResolvedValue(makeDetail({ version: 5, jobTitle: 'Supervisor' }));
    updateMock.mockRejectedValue(new HrCommandError(412, { code: 'EMPLOYEE_VERSION_CONFLICT' }));
    renderScreen();
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Cargo'), { target: { value: 'Mi cargo' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    const banner = await within(dialog).findByTestId('version-conflict');
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveTextContent(/Otra persona modificó esta ficha/);
    expect(within(dialog).getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    fireEvent.click(within(banner).getByRole('button', { name: 'Recargar ficha' }));
    await waitFor(() => expect(within(dialog).queryByTestId('version-conflict')).not.toBeInTheDocument());
    expect(within(dialog).getByLabelText('Cargo')).toHaveValue('Supervisor');
    expect(within(dialog).getByText(/Cargamos la versión actual/)).toBeInTheDocument();
    // Tras recargar, el siguiente guardado usa la version nueva.
    updateMock.mockResolvedValue({ ...makeDetail({ version: 6 }) });
    fireEvent.change(within(dialog).getByLabelText('Cargo'), { target: { value: 'Mi cargo' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(updateMock).toHaveBeenLastCalledWith('tok', 'emp-1', { jobTitle: 'Mi cargo' }, 5));
  });

  it('accesibilidad: dialogo, conflicto 412 y ficha con aviso sin violaciones (axe)', async () => {
    getEmployeeMock.mockResolvedValue(linked());
    updateMock.mockRejectedValueOnce(new HrCommandError(412, { code: 'EMPLOYEE_VERSION_CONFLICT' }));
    const { container } = renderScreen();
    const dialog = await openDialog();
    expect(await axe(dialog)).toHaveNoViolations();
    fireEvent.change(within(dialog).getByLabelText('Correo'), { target: { value: 'nuevo@veloxrent.pe' } });
    expect(await axe(dialog)).toHaveNoViolations();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await within(dialog).findByTestId('version-conflict');
    expect(await axe(dialog)).toHaveNoViolations();
    updateMock.mockResolvedValue({ ...linked(), accountRelink: { action: 'UNLINKED', reason: 'EMAIL_CHANGED', previousEmail: 'a@x.pe', newEmail: 'b@x.pe' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await axe(container)).toHaveNoViolations();
  });

  describe('area del catalogo (H-02, contrato 0.7.0)', () => {
    it('muestra el area actual del catalogo, ofrece «Otra (texto libre)» y envia areaCode al cambiarla', async () => {
      getEmployeeMock.mockResolvedValueOnce(makeDetail({ version: 3 })).mockResolvedValue(makeDetail({ version: 4 }));
      updateMock.mockResolvedValue({ ...makeDetail({ version: 4 }), areaId: 'ADMINISTRACION', areaName: 'Administración' });
      renderScreen();
      const dialog = await openDialog();
      const select = await areaSelect(dialog);
      expect(select).toHaveValue('OPERACIONES');
      expect(within(dialog).getAllByRole('option').map((o) => o.textContent)).toEqual(['Administración', 'Atención al cliente', 'Operaciones', 'Otra (texto libre)']);
      expect(within(dialog).queryByLabelText('Nombre del área (texto libre)')).not.toBeInTheDocument();
      expect(await axe(dialog)).toHaveNoViolations();
      fireEvent.change(select, { target: { value: 'ADMINISTRACION' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => expect(updateMock).toHaveBeenCalledWith('tok', 'emp-1', { areaCode: 'ADMINISTRACION' }, 3));
    });

    it('una ficha con area en texto libre queda en «Otra (texto libre)»; sin tocarla no se envia el area', async () => {
      getEmployeeMock.mockResolvedValue(makeDetail({ areaId: 'MECANICA', areaName: 'Taller Mecánico' }));
      updateMock.mockResolvedValue(makeDetail());
      renderScreen();
      const dialog = await openDialog();
      const select = await areaSelect(dialog);
      expect(select).toHaveValue('__OTHER__');
      expect(within(dialog).getByLabelText('Nombre del área (texto libre)')).toHaveValue('Taller Mecánico');
      expect(await axe(dialog)).toHaveNoViolations();
      fireEvent.change(within(dialog).getByLabelText('Cargo'), { target: { value: 'Jefe' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => expect(updateMock).toHaveBeenCalledWith('tok', 'emp-1', { jobTitle: 'Jefe' }, 3));
    });

    it('editar el texto libre de una ficha envia areaName (el servidor lo empata con el catalogo)', async () => {
      getEmployeeMock.mockResolvedValue(makeDetail({ areaId: 'MECANICA', areaName: 'Taller Mecánico' }));
      updateMock.mockResolvedValue(makeDetail());
      renderScreen();
      const dialog = await openDialog();
      await areaSelect(dialog);
      fireEvent.change(within(dialog).getByLabelText('Nombre del área (texto libre)'), { target: { value: ' operaciones ' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => expect(updateMock).toHaveBeenCalledWith('tok', 'emp-1', { areaName: 'operaciones' }, 3));
    });

    it('de texto libre a una area del catalogo envia areaCode', async () => {
      getEmployeeMock.mockResolvedValue(makeDetail({ areaId: 'MECANICA', areaName: 'Taller Mecánico' }));
      updateMock.mockResolvedValue(makeDetail());
      renderScreen();
      const dialog = await openDialog();
      const select = await areaSelect(dialog);
      fireEvent.change(select, { target: { value: 'OPERACIONES' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => expect(updateMock).toHaveBeenCalledWith('tok', 'emp-1', { areaCode: 'OPERACIONES' }, 3));
    });

    it('de catalogo a «Otra» exige el nombre del area', async () => {
      getEmployeeMock.mockResolvedValue(makeDetail());
      renderScreen();
      const dialog = await openDialog();
      const select = await areaSelect(dialog);
      fireEvent.change(select, { target: { value: '__OTHER__' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
      expect(await within(dialog).findByText('Indica el nombre del área.')).toBeInTheDocument();
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('si el catalogo no carga el area queda de solo lectura y el resto de la edicion sigue funcionando', async () => {
      listAreasMock.mockRejectedValue(new Error('boom'));
      getEmployeeMock.mockResolvedValue(makeDetail());
      updateMock.mockResolvedValue(makeDetail());
      renderScreen();
      const dialog = await openDialog();
      await within(dialog).findByText(/No pudimos cargar el catálogo de áreas/);
      expect(within(dialog).getByLabelText('Área')).toHaveAttribute('readonly');
      fireEvent.change(within(dialog).getByLabelText('Cargo'), { target: { value: 'Jefe' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => expect(updateMock).toHaveBeenCalledWith('tok', 'emp-1', { jobTitle: 'Jefe' }, 3));
    });
  });
});
