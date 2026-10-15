import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonAttendanceScreen } from './PersonAttendanceScreen';
import { HrApiError } from './hr-client';
import { baseContext, makeDetail, makeRecord } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';

const getEmployeeMock = vi.fn();
const getAttendanceMock = vi.fn();
const logAttendanceMock = vi.fn();
const uploadEvidenceMock = vi.fn();

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
    getEmployeeAttendance: (...a: unknown[]) => getAttendanceMock(...a),
    logAttendance: (...a: unknown[]) => logAttendanceMock(...a),
    uploadAttendanceEvidence: (...a: unknown[]) => uploadEvidenceMock(...a),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/emp-1/asistencia', search: '?mes=2026-09', state: baseContext }]}>
      <Routes>
        <Route path="/personal/:id/asistencia" element={<PersonAttendanceScreen />} />
        <Route path="/personal/:id/asistencia/falta" element={<div>pantalla de falta</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const RECORDS = [
  makeRecord({ id: 'a1', date: '2026-09-01', status: 'PRESENTE' }),
  makeRecord({ id: 'a2', date: '2026-09-02', status: 'TARDANZA', minutesLate: 20, deductionAmount: 3.5 }),
  makeRecord({ id: 'a3', date: '2026-09-03', status: 'FALTA_INJUSTIFICADA', deductionAmount: 50 }),
];

async function attachPhoto(dialog: HTMLElement, file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })) {
  fireEvent.change(within(dialog).getByLabelText(/^Foto \(JPG/), { target: { files: [file] } });
  await within(dialog).findByText(/Foto subida: /);
}

describe('PersonAttendanceScreen (ADP-02)', () => {
  beforeEach(() => {
    getEmployeeMock.mockReset().mockResolvedValue(makeDetail());
    getAttendanceMock.mockReset().mockResolvedValue(RECORDS);
    logAttendanceMock.mockReset();
    uploadEvidenceMock.mockReset().mockResolvedValue({ uploadUrl: 'https://gcs/u', objectUrl: 'https://gcs/o', storageRef: 'gs://b/att/1.jpg', expiresAt: '2030-01-01T00:00:00Z' });
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES', 'HR_ADMINISTRATION.LOG_ATTENDANCE']);
  });

  it('el calendario muestra icono y texto: presente, tardanza y falta', async () => {
    renderScreen();
    const table = await screen.findByRole('table', { name: /Asistencia de septiembre de 2026/ });
    expect(within(table).getByText('Presente')).toBeInTheDocument();
    expect(within(table).getByText('Tardanza')).toBeInTheDocument();
    expect(within(table).getByText('Falta injustificada')).toBeInTheDocument();
    expect(getAttendanceMock).toHaveBeenCalledWith('tok', 'emp-1', '2026-09');
  });

  it('no ofrece importar marcaciones (el contrato no lo tiene)', async () => {
    renderScreen();
    await screen.findByRole('table');
    expect(screen.queryByText(/Importar/)).not.toBeInTheDocument();
  });

  it('sin LOG_ATTENDANCE no hay botones de registrar', async () => {
    setPermissions(['HR_ADMINISTRATION.VIEW_EMPLOYEES']);
    renderScreen();
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'Registrar marcación' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar marcación del/ })).not.toBeInTheDocument();
  });

  it('registra una marcacion manual sin enviar monto de descuento', async () => {
    logAttendanceMock.mockResolvedValue(makeRecord({ date: '2026-09-04' }));
    renderScreen();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar marcación del 4' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByLabelText(/descuento|monto/i)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('Tardanza'));
    // La tardanza exige los minutos (el servidor responde 422 si faltan).
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
    expect(await within(dialog).findByText('Indica cuántos minutos llegó tarde.')).toBeInTheDocument();
    expect(logAttendanceMock).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Minutos de tardanza'), { target: { value: '15' } });
    await attachPhoto(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
    await waitFor(() => expect(logAttendanceMock).toHaveBeenCalledTimes(1));
    expect(logAttendanceMock).toHaveBeenCalledWith('tok', 'emp-1', expect.objectContaining({ date: '2026-09-04', status: 'TARDANZA', minutesLate: 15 }));
    expect(logAttendanceMock.mock.calls[0][2]).not.toHaveProperty('deductionAmount');
    expect(logAttendanceMock.mock.calls[0][2].evidence).toMatchObject({ kind: 'WHATSAPP_PHOTO', storageRef: 'gs://b/att/1.jpg' });
    expect(await screen.findByText('Marcación registrada.')).toBeInTheDocument();
  });

  it('elegir Falta continua en ADP-03 sin guardar', async () => {
    renderScreen();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar marcación del 4' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText(/^Falta/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('pantalla de falta')).toBeInTheDocument();
    expect(logAttendanceMock).not.toHaveBeenCalled();
  });

  it('"Ver falta" lleva a la falta registrada', async () => {
    renderScreen();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Ver falta del 3' }));
    expect(await screen.findByText('pantalla de falta')).toBeInTheDocument();
  });

  it('muestra el error de negocio si ya existe la marcacion', async () => {
    const { HrCommandError } = await import('./hr-client');
    logAttendanceMock.mockRejectedValue(new HrCommandError(409, { code: 'ATTENDANCE_ALREADY_LOGGED' }));
    renderScreen();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar marcación del 4' }));
    const dialog = await screen.findByRole('dialog');
    await attachPhoto(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Ya existe un registro de asistencia/);
  });

  it('estado de carga y error recuperable', async () => {
    getEmployeeMock.mockReset().mockReturnValue(new Promise(() => {}));
    const { unmount } = renderScreen();
    expect(await screen.findByText(/Cargando la asistencia/)).toBeInTheDocument();
    unmount();
    getEmployeeMock.mockReset().mockRejectedValue(new HrApiError(500));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar la asistencia/);
  });

  describe('evidencia de la marcacion (WhatsApp)', () => {
    async function openDialog() {
      renderScreen();
      await screen.findByRole('table');
      fireEvent.click(screen.getByRole('button', { name: 'Registrar marcación del 4' }));
      return screen.findByRole('dialog');
    }

    async function chooseRef(dialog: HTMLElement) {
      fireEvent.click(within(dialog).getByLabelText('Enlace o referencia externa'));
    }

    it('PRESENTE sin evidencia no se guarda (evidencia obligatoria)', async () => {
      const dialog = await openDialog();
      expect(within(dialog).getByText('Evidencia (obligatoria)')).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
      expect(await within(dialog).findByText('Adjunta la foto de evidencia.')).toBeInTheDocument();
      expect(logAttendanceMock).not.toHaveBeenCalled();
    });

    it('TARDANZA sin evidencia tampoco se guarda', async () => {
      const dialog = await openDialog();
      fireEvent.click(within(dialog).getByLabelText('Tardanza'));
      fireEvent.change(within(dialog).getByLabelText('Minutos de tardanza'), { target: { value: '10' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
      expect(await within(dialog).findByText('Adjunta la foto de evidencia.')).toBeInTheDocument();
      expect(logAttendanceMock).not.toHaveBeenCalled();
    });

    it('PERMISO no exige evidencia', async () => {
      logAttendanceMock.mockResolvedValue(makeRecord({ date: '2026-09-04', evidence: null, evidenceMissing: true }));
      const dialog = await openDialog();
      fireEvent.click(within(dialog).getByLabelText('Permiso'));
      expect(within(dialog).getByText('Evidencia (foto del grupo de WhatsApp)')).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
      await waitFor(() => expect(logAttendanceMock).toHaveBeenCalledTimes(1));
      expect(logAttendanceMock.mock.calls[0][2].evidence).toBeUndefined();
    });

    it('sube la foto con URL firmada y envia storageRef + hora de Lima + nota', async () => {
      logAttendanceMock.mockResolvedValue(makeRecord({ date: '2026-09-04', evidenceMissing: false }));
      const dialog = await openDialog();
      const file = new File(['x'], 'foto.png', { type: 'image/png' });
      await attachPhoto(dialog, file);
      expect(uploadEvidenceMock).toHaveBeenCalledWith('tok', 'emp-1', file);
      fireEvent.change(within(dialog).getByLabelText(/Fecha y hora de captura/), { target: { value: '2020-09-04T08:05' } });
      fireEvent.change(within(dialog).getByLabelText('Nota de la evidencia (opcional)'), { target: { value: 'grupo' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
      await waitFor(() => expect(logAttendanceMock).toHaveBeenCalledTimes(1));
      expect(logAttendanceMock.mock.calls[0][2].evidence).toEqual({
        kind: 'WHATSAPP_PHOTO',
        storageRef: 'gs://b/att/1.jpg',
        capturedAtLocal: '2020-09-04T08:05:00',
        note: 'grupo',
      });
    });

    it('valida tipo y tamano antes de subir', async () => {
      const dialog = await openDialog();
      const input = within(dialog).getByLabelText(/^Foto \(JPG/);
      fireEvent.change(input, { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } });
      expect(await within(dialog).findByText('La foto debe ser JPG, PNG o WEBP.')).toBeInTheDocument();
      const big = new File(['x'], 'b.jpg', { type: 'image/jpeg' });
      Object.defineProperty(big, 'size', { value: 13 * 1024 * 1024 });
      fireEvent.change(input, { target: { files: [big] } });
      expect(await within(dialog).findByText('La foto supera el tamaño máximo de 12 MB.')).toBeInTheDocument();
      expect(uploadEvidenceMock).not.toHaveBeenCalled();
    });

    it('si falla la subida muestra el error y permite reintentar', async () => {
      const { HrCommandError } = await import('./hr-client');
      uploadEvidenceMock.mockRejectedValueOnce(new HrCommandError(503, { code: 'EVIDENCE_STORAGE_UNAVAILABLE' }));
      const dialog = await openDialog();
      fireEvent.change(within(dialog).getByLabelText(/^Foto \(JPG/), { target: { files: [new File(['x'], 'f.jpg', { type: 'image/jpeg' })] } });
      expect(await within(dialog).findByText(/No se pueden subir archivos por ahora/)).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar subida' }));
      expect(await within(dialog).findByText(/Foto subida: /)).toBeInTheDocument();
      expect(uploadEvidenceMock).toHaveBeenCalledTimes(2);
    });

    it('traduce ATTENDANCE_EVIDENCE_REQUIRED (422) del servidor', async () => {
      const { HrCommandError } = await import('./hr-client');
      logAttendanceMock.mockRejectedValue(new HrCommandError(422, { code: 'ATTENDANCE_EVIDENCE_REQUIRED' }));
      const dialog = await openDialog();
      await attachPhoto(dialog);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
      expect(await within(dialog).findByText(/foto de evidencia es obligatoria/)).toBeInTheDocument();
    });

    it('envia la evidencia con url, fecha-hora de Lima y nota', async () => {
      logAttendanceMock.mockResolvedValue(makeRecord({ date: '2026-09-04', evidenceMissing: false }));
      const dialog = await openDialog();
      await chooseRef(dialog);
      fireEvent.change(within(dialog).getByLabelText('Enlace o referencia de la foto'), { target: { value: 'https://chat.example/foto.jpg' } });
      fireEvent.change(within(dialog).getByLabelText(/Fecha y hora de captura/), { target: { value: '2020-09-04T08:05' } });
      fireEvent.change(within(dialog).getByLabelText('Nota de la evidencia (opcional)'), { target: { value: 'Foto en el grupo' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
      await waitFor(() => expect(logAttendanceMock).toHaveBeenCalledTimes(1));
      expect(logAttendanceMock.mock.calls[0][2].evidence).toEqual({
        kind: 'WHATSAPP_PHOTO',
        url: 'https://chat.example/foto.jpg',
        capturedAtLocal: '2020-09-04T08:05:00',
        note: 'Foto en el grupo',
      });
      expect(await screen.findByText('Marcación registrada.')).toBeInTheDocument();
    });

    it('una referencia que no es enlace viaja como storageRef', async () => {
      logAttendanceMock.mockResolvedValue(makeRecord({ date: '2026-09-04' }));
      const dialog = await openDialog();
      await chooseRef(dialog);
      fireEvent.change(within(dialog).getByLabelText('Enlace o referencia de la foto'), { target: { value: 'gs://bucket/asistencia/1.jpg' } });
      fireEvent.change(within(dialog).getByLabelText(/Fecha y hora de captura/), { target: { value: '2020-09-04T08:05' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
      await waitFor(() => expect(logAttendanceMock).toHaveBeenCalledTimes(1));
      expect(logAttendanceMock.mock.calls[0][2].evidence).toMatchObject({ storageRef: 'gs://bucket/asistencia/1.jpg' });
      expect(logAttendanceMock.mock.calls[0][2].evidence).not.toHaveProperty('url');
    });

    it('si se llena a medias exige la foto y la fecha-hora, y rechaza una captura futura', async () => {
      const dialog = await openDialog();
      await chooseRef(dialog);
      fireEvent.change(within(dialog).getByLabelText('Nota de la evidencia (opcional)'), { target: { value: 'solo nota' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
      expect(await within(dialog).findByText('Indica el enlace o la referencia de la foto.')).toBeInTheDocument();
      expect(within(dialog).getByText('Indica cuándo se tomó la foto.')).toBeInTheDocument();

      fireEvent.change(within(dialog).getByLabelText('Enlace o referencia de la foto'), { target: { value: 'https://x.pe/f.jpg' } });
      fireEvent.change(within(dialog).getByLabelText(/Fecha y hora de captura/), { target: { value: '2999-01-01T08:00' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
      expect(await within(dialog).findByText('La fecha y hora de la foto no puede ser futura.')).toBeInTheDocument();
      expect(logAttendanceMock).not.toHaveBeenCalled();
    });

    it('traduce INVALID_ATTENDANCE_EVIDENCE (422) del servidor', async () => {
      const { HrCommandError } = await import('./hr-client');
      logAttendanceMock.mockRejectedValue(new HrCommandError(422, { code: 'INVALID_ATTENDANCE_EVIDENCE' }));
      const dialog = await openDialog();
      await chooseRef(dialog);
      fireEvent.change(within(dialog).getByLabelText('Enlace o referencia de la foto'), { target: { value: 'https://x.pe/f.jpg' } });
      fireEvent.change(within(dialog).getByLabelText(/Fecha y hora de captura/), { target: { value: '2020-09-04T08:05' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar marcación' }));
      expect(await within(dialog).findByText(/La evidencia no es válida/)).toBeInTheDocument();
    });

    it('elegir Falta no muestra campos de evidencia', async () => {
      const dialog = await openDialog();
      fireEvent.click(within(dialog).getByLabelText(/^Falta/));
      expect(within(dialog).queryByLabelText('Enlace o referencia de la foto')).not.toBeInTheDocument();
    });

    it('el calendario marca los dias sin evidencia', async () => {
      getAttendanceMock.mockResolvedValue([makeRecord({ id: 'a9', date: '2026-09-05', status: 'PRESENTE', evidenceMissing: true })]);
      renderScreen();
      const table = await screen.findByRole('table');
      expect(within(table).getByText('Sin evidencia')).toBeInTheDocument();
    });
  });
});
