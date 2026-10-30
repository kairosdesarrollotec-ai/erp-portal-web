import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CandidateFileScreen } from './CandidateFileScreen';
import { RecruitmentApiError, RecruitmentCommandError, type CandidateDetail, type NegotiationResponse } from './recruitment-client';
import { setPermissions } from '../../test/permissions';

const getCandidateMock = vi.fn();
const changeStageMock = vi.fn();
const decideMock = vi.fn();
const uploadCvMock = vi.fn();
const getCvMock = vi.fn();
const negotiationMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') },
  }),
}));
// AppHeader incluye la busqueda global (React Query); aqui no se prueba.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./recruitment-client', async () => {
  const actual = await vi.importActual<typeof import('./recruitment-client')>('./recruitment-client');
  return {
    ...actual,
    getCandidate: (...a: unknown[]) => getCandidateMock(...a),
    changeCandidateStage: (...a: unknown[]) => changeStageMock(...a),
    decideCandidate: (...a: unknown[]) => decideMock(...a),
    uploadCandidateCv: (...a: unknown[]) => uploadCvMock(...a),
    getCandidateCv: (...a: unknown[]) => getCvMock(...a),
    recordNegotiation: (...a: unknown[]) => negotiationMock(...a),
  };
});

const ctx = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Central' };
const ALL = ['VIEW_CANDIDATE', 'VIEW_CANDIDATE_SENSITIVE_DATA', 'REGISTER_CANDIDATE', 'DECIDE_CANDIDATE'].map((a) => `RECRUITMENT.${a}`);

function detail(o: Partial<CandidateDetail> = {}): CandidateDetail {
  return {
    id: 'cand-1', vacancyId: 'vac-1', fullName: 'Ana Pérez', documentType: 'DNI', documentNumber: '12345678',
    stage: 'NUEVO', processState: 'EN_NEGOCIACION', version: 4, createdAt: '2026-10-01T10:00:00Z',
    email: 'ana@correo.pe', phone: '999111222', cvDocumentId: 'abcdef12-0000-0000-0000-000000000000',
    salaryExpectation: 2500, isRestrictedView: false, interviews: [],
    ...o,
  } as CandidateDetail;
}

const AGREED = [{ id: 'n-ok', outcome: 'ACORDADA', offeredSalary: 2500, agreedSalary: 2500, createdAt: '2026-10-02T10:00:00Z' }] as unknown as NegotiationResponse[];

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reclutamiento/candidatos/cand-1', state: ctx }]}>
      <Routes>
        <Route path="/reclutamiento/candidatos/:id" element={<CandidateFileScreen />} />
        <Route path="/reclutamiento/candidatos/:id/entrevista" element={<div>pantalla entrevista</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CandidateFileScreen (REC-04)', () => {
  beforeEach(() => {
    [getCandidateMock, changeStageMock, decideMock, uploadCvMock, getCvMock, negotiationMock].forEach((m) => m.mockReset());
    getCandidateMock.mockResolvedValue(detail());
    setPermissions(ALL);
  });

  it('muestra datos generales y sensibles con permiso, con foco en el título', async () => {
    renderScreen();
    const title = await screen.findByRole('heading', { level: 1, name: 'Ana Pérez' });
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByText('ana@correo.pe')).toBeInTheDocument();
    expect(screen.getByText('999111222')).toBeInTheDocument();
    expect(screen.getByText(/código abcdef12/)).toBeInTheDocument();
    expect(screen.getByText(/2.?500/)).toBeInTheDocument();
  });

  it('enmascara datos sensibles si la vista es restringida y deja el resto visible', async () => {
    getCandidateMock.mockResolvedValue(detail({ isRestrictedView: true, email: null, phone: null, salaryExpectation: null, cvDocumentId: null }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.getAllByText(/Este dato requiere permiso adicional/)).toHaveLength(4);
    expect(screen.getByText(/12345678/)).toBeInTheDocument();
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('enmascara si falta el permiso sensible aunque el back envíe datos', async () => {
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE']);
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.queryByText('ana@correo.pe')).toBeNull();
    expect(screen.getAllByText(/Este dato requiere permiso adicional/)).toHaveLength(4);
  });

  it('R-2: sin negociación ACORDADA, Acordar y continuar está deshabilitado y explica por qué', async () => {
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.getByRole('button', { name: 'Acordar y continuar' })).toBeDisabled();
    expect(screen.getByTestId('agree-required')).toBeInTheDocument();
  });

  it('R-10: un candidato descartado no puede acordar, descartar de nuevo ni registrar negociación', async () => {
    getCandidateMock.mockResolvedValue(detail({ processState: 'DESCARTADO', decision: 'RECHAZADO', negotiations: AGREED }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.queryByRole('button', { name: 'Acordar y continuar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
    expect(screen.getByTestId('candidate-discarded')).toBeInTheDocument();
  });

  it('Acordar y continuar mueve a Entrevista y navega', async () => {
    getCandidateMock.mockResolvedValue(detail({ negotiations: AGREED }));
    changeStageMock.mockResolvedValue({});
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Acordar y continuar' }));
    expect(await screen.findByText('pantalla entrevista')).toBeInTheDocument();
    expect(changeStageMock).toHaveBeenCalledWith('tok', 'cand-1', 4, { companyId: 'c1', branchId: 'b1' }, 'ENTREVISTA');
  });

  it('si ya está en Entrevista solo navega, y sin permiso no aparece', async () => {
    getCandidateMock.mockResolvedValue(detail({ stage: 'ENTREVISTA', negotiations: AGREED }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Acordar y continuar' }));
    expect(await screen.findByText('pantalla entrevista')).toBeInTheDocument();
    expect(changeStageMock).not.toHaveBeenCalled();
  });

  it('sin REGISTER_CANDIDATE no hay Acordar; sin DECIDE_CANDIDATE no hay Descartar', async () => {
    setPermissions(['RECRUITMENT.VIEW_CANDIDATE']);
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.queryByRole('button', { name: 'Acordar y continuar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
  });

  it('con conflicto de versión al acordar recarga y avisa sin navegar', async () => {
    getCandidateMock.mockResolvedValue(detail({ negotiations: AGREED }));
    changeStageMock.mockRejectedValue(new RecruitmentCommandError(409, { code: 'VERSION_CONFLICT' }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Acordar y continuar' }));
    await waitFor(() => expect(getCandidateMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Otra persona modificó/)).toBeInTheDocument();
    expect(screen.queryByText('pantalla entrevista')).toBeNull();
  });

  it('Descartar exige motivo, avisa que es irreversible y llama a decidir RECHAZADO', async () => {
    decideMock.mockResolvedValue(detail({ decision: 'RECHAZADO', version: 5 }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/irreversible/)).toBeInTheDocument();
    const confirm = within(dialog).getByRole('button', { name: 'Descartar candidato' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Motivo del descarte'), { target: { value: 'No cumple el perfil' } });
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(decideMock).toHaveBeenCalledWith('tok', 'cand-1', 4, { companyId: 'c1', branchId: 'b1' }, 'RECHAZADO', 'No cumple el perfil'),
    );
    expect(await screen.findByText('No contratado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
  });

  it('con decisión existente no se puede descartar', async () => {
    getCandidateMock.mockResolvedValue(detail({ decision: 'CONTRATADO' }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull();
  });

  it('403 y 404 muestran su pantalla', async () => {
    getCandidateMock.mockRejectedValue(new RecruitmentApiError(403));
    const { unmount } = renderScreen();
    expect(await screen.findByText('No tienes acceso a esta sección')).toBeInTheDocument();
    unmount();
    getCandidateMock.mockRejectedValue(new RecruitmentApiError(404));
    renderScreen();
    expect(await screen.findByText('No encontramos al candidato')).toBeInTheDocument();
  });

  it('lista las entrevistas realizadas en solo lectura', async () => {
    getCandidateMock.mockResolvedValue(detail({
      interviews: [{ id: 'i1', candidateId: 'cand-1', scheduledAt: '2026-10-03T15:00:00Z', isVirtual: true, result: 'AVANZA', createdAt: '2026-10-01T00:00:00Z' }],
    }));
    renderScreen();
    await screen.findByText('Ana Pérez');
    expect(screen.getByRole('heading', { name: 'Entrevistas' })).toBeInTheDocument();
    expect(screen.getByText(/Virtual · Avanza/)).toBeInTheDocument();
  });

  describe('CV (carga y visor)', () => {
    const cv = { fileName: 'cv-ana.pdf', contentType: 'application/pdf', sizeBytes: 2 * 1024 * 1024, uploadedAt: '2026-10-02T10:00:00Z' };
    const file = (name: string, type: string, size = 1000) => {
      const f = new File(['x'], name, { type });
      Object.defineProperty(f, 'size', { value: size });
      return f;
    };

    it('sin CV ofrece "Subir CV" y sube el archivo con la versión de la ficha', async () => {
      uploadCvMock.mockResolvedValue(detail({ version: 5, hasCv: true, cv, cvDocumentId: null }));
      renderScreen();
      await screen.findByText('Ana Pérez');
      const input = screen.getByLabelText('Subir CV') as HTMLInputElement;
      const f = file('cv.pdf', 'application/pdf');
      fireEvent.change(input, { target: { files: [f] } });
      await waitFor(() => expect(uploadCvMock).toHaveBeenCalledWith('tok', 'cand-1', 4, { companyId: 'c1', branchId: 'b1' }, f));
      expect(await screen.findByText(/cv-ana\.pdf/)).toBeInTheDocument();
      expect(screen.getByText('El CV se subió correctamente.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ver CV' })).toBeInTheDocument();
    });

    it('rechaza en el cliente un tipo no permitido o más de 10 MB sin llamar al servidor', async () => {
      renderScreen();
      await screen.findByText('Ana Pérez');
      const input = screen.getByLabelText('Subir CV');
      fireEvent.change(input, { target: { files: [file('a.zip', 'application/zip')] } });
      expect(await screen.findByRole('alert')).toHaveTextContent(/PDF, Word/);
      fireEvent.change(input, { target: { files: [file('big.pdf', 'application/pdf', 11 * 1024 * 1024)] } });
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/10 MB/));
      expect(uploadCvMock).not.toHaveBeenCalled();
    });

    it('muestra el error del servidor al subir', async () => {
      uploadCvMock.mockRejectedValue(new RecruitmentCommandError(400, { code: 'CANDIDATE_CV_INVALID_FILE' }));
      renderScreen();
      await screen.findByText('Ana Pérez');
      fireEvent.change(screen.getByLabelText('Subir CV'), { target: { files: [file('cv.pdf', 'application/pdf')] } });
      expect(await screen.findByRole('alert')).toHaveTextContent(/de máximo 10 MB/);
    });

    it('"Ver CV" pide la URL firmada y la abre en otra pestaña sin referrer', async () => {
      getCandidateMock.mockResolvedValue(detail({ hasCv: true, cv, cvDocumentId: null }));
      getCvMock.mockResolvedValue({ ...cv, url: 'https://storage.example/signed', expiresAt: '2026-10-12T10:05:00Z' });
      const open = vi.spyOn(window, 'open').mockReturnValue(null);
      renderScreen();
      await screen.findByText('Ana Pérez');
      expect(screen.getByLabelText('Reemplazar CV')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Ver CV' }));
      await waitFor(() => expect(open).toHaveBeenCalledWith('https://storage.example/signed', '_blank', 'noopener,noreferrer'));
      expect(getCvMock).toHaveBeenCalledWith('tok', 'cand-1', { companyId: 'c1', branchId: 'b1' });
      open.mockRestore();
    });

    it('sin permiso sensible no hay carga ni visor, solo el candado', async () => {
      setPermissions(['RECRUITMENT.VIEW_CANDIDATE', 'RECRUITMENT.REGISTER_CANDIDATE']);
      getCandidateMock.mockResolvedValue(detail({ hasCv: true, cv: null, isRestrictedView: true }));
      renderScreen();
      await screen.findByText('Ana Pérez');
      expect(screen.queryByLabelText('Subir CV')).toBeNull();
      expect(screen.queryByLabelText('Reemplazar CV')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Ver CV' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Registrar negociación' })).toBeNull();
    });
  });

  describe('Negociación (historial y registro)', () => {
    const nego = (o: Partial<NegotiationResponse> = {}): NegotiationResponse => ({
      id: 'n1', candidateId: 'cand-1', outcome: 'EN_CURSO', offeredSalary: 2400, offeredSchedule: 'L-V 8-5',
      candidateSalary: 2800, candidateStartDate: '2026-11-01', recordedBy: 'u1', createdAt: '2026-10-05T10:00:00Z', ...o,
    });

    it('lista el historial con lo ofrecido, lo pedido y el acuerdo', async () => {
      getCandidateMock.mockResolvedValue(detail({
        negotiations: [nego({ id: 'n2', outcome: 'ACORDADA', agreedSalary: 2600, agreedConditions: 'Almuerzo incluido' }), nego()],
      }));
      renderScreen();
      await screen.findByText('Ana Pérez');
      const list = screen.getByRole('list', { name: 'Historial de negociación' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
      expect(within(list).getByText('Acordada')).toBeInTheDocument();
      expect(within(list).getByText(/Acordado:.*2.?600.*Almuerzo incluido/)).toBeInTheDocument();
      expect(within(list).getAllByText(/Candidato pide:.*2.?800.*ingreso 2026-11-01/)).toHaveLength(2);
    });

    it('sin registros muestra el estado vacío', async () => {
      getCandidateMock.mockResolvedValue(detail({ negotiations: [] }));
      renderScreen();
      await screen.findByText('Ana Pérez');
      expect(screen.getByText(/Todavía no hay negociaciones registradas/)).toBeInTheDocument();
    });

    it('valida campos obligatorios y registra un acuerdo con la versión de la ficha', async () => {
      negotiationMock.mockResolvedValue(detail({ version: 5, stage: 'ENTREVISTA', negotiations: [nego({ outcome: 'ACORDADA', agreedSalary: 2600 })] }));
      renderScreen();
      await screen.findByText('Ana Pérez');
      fireEvent.click(screen.getByRole('button', { name: 'Registrar negociación' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByLabelText(/Pretensión salarial/)).toHaveValue(2500);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar negociación' }));
      expect(within(dialog).getByText(/Indica el sueldo ofrecido/)).toBeInTheDocument();
      expect(negotiationMock).not.toHaveBeenCalled();

      fireEvent.change(within(dialog).getByLabelText('Sueldo ofrecido (S/)'), { target: { value: '2400' } });
      fireEvent.change(within(dialog).getByLabelText('Resultado de esta ronda'), { target: { value: 'ACORDADA' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar negociación' }));
      expect(within(dialog).getByText(/Indica el sueldo acordado/)).toBeInTheDocument();
      expect(negotiationMock).not.toHaveBeenCalled();

      fireEvent.change(within(dialog).getByLabelText('Sueldo acordado (S/)'), { target: { value: '2600' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar negociación' }));
      await waitFor(() => expect(negotiationMock).toHaveBeenCalled());
      expect(negotiationMock).toHaveBeenCalledWith('tok', 'cand-1', 4, { companyId: 'c1', branchId: 'b1' }, {
        outcome: 'ACORDADA', offeredSalary: 2400, candidateSalary: 2500, agreedSalary: 2600,
      });
      expect(await screen.findByText(/pasó a la etapa Entrevista/)).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('R-2: si el candidato ya estaba en Decisión, el aviso no afirma un cambio de etapa', async () => {
      getCandidateMock.mockResolvedValue(detail({ stage: 'DECISION' }));
      negotiationMock.mockResolvedValue(detail({ version: 5, stage: 'DECISION', negotiations: [nego({ outcome: 'ACORDADA', agreedSalary: 2600 })] }));
      renderScreen();
      await screen.findByText('Ana Pérez');
      fireEvent.click(screen.getByRole('button', { name: 'Registrar negociación' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText('Sueldo ofrecido (S/)'), { target: { value: '2400' } });
      fireEvent.change(within(dialog).getByLabelText('Resultado de esta ronda'), { target: { value: 'ACORDADA' } });
      fireEvent.change(within(dialog).getByLabelText('Sueldo acordado (S/)'), { target: { value: '2600' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar negociación' }));
      await waitFor(() => expect(negotiationMock).toHaveBeenCalled());
      expect(await screen.findByText('Negociación registrada en el historial.')).toBeInTheDocument();
      expect(screen.queryByText(/pasó a la etapa/)).toBeNull();
    });

    it('"No acordada" exige motivo', async () => {
      negotiationMock.mockResolvedValue(detail({ negotiations: [nego({ outcome: 'NO_ACORDADA', reason: 'Pide más' })] }));
      renderScreen();
      await screen.findByText('Ana Pérez');
      fireEvent.click(screen.getByRole('button', { name: 'Registrar negociación' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText('Sueldo ofrecido (S/)'), { target: { value: '2400' } });
      fireEvent.change(within(dialog).getByLabelText('Resultado de esta ronda'), { target: { value: 'NO_ACORDADA' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar negociación' }));
      expect(within(dialog).getByText(/Indica por qué no se acordó/)).toBeInTheDocument();
      fireEvent.change(within(dialog).getByLabelText('Motivo'), { target: { value: 'Pide más' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar negociación' }));
      await waitFor(() => expect(negotiationMock).toHaveBeenCalled());
      expect(negotiationMock.mock.calls[0][4]).toMatchObject({ outcome: 'NO_ACORDADA', reason: 'Pide más' });
    });

    it('un error del servidor se muestra en el diálogo y un conflicto recarga la ficha', async () => {
      negotiationMock.mockRejectedValueOnce(new RecruitmentCommandError(422, { code: 'NEGOTIATION_INVALID' }));
      renderScreen();
      await screen.findByText('Ana Pérez');
      fireEvent.click(screen.getByRole('button', { name: 'Registrar negociación' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText('Sueldo ofrecido (S/)'), { target: { value: '2400' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar negociación' }));
      expect(await within(dialog).findByText(/Revisa la negociación/)).toBeInTheDocument();

      negotiationMock.mockRejectedValueOnce(new RecruitmentCommandError(409, { code: 'VERSION_CONFLICT' }));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar negociación' }));
      await waitFor(() => expect(getCandidateMock).toHaveBeenCalledTimes(2));
      expect(await screen.findByText(/Otra persona modificó/)).toBeInTheDocument();
    });

    it('con decisión tomada ya no se registra negociación', async () => {
      getCandidateMock.mockResolvedValue(detail({ decision: 'CONTRATADO' }));
      renderScreen();
      await screen.findByText('Ana Pérez');
      expect(screen.queryByRole('button', { name: 'Registrar negociación' })).toBeNull();
      expect(screen.queryByLabelText('Subir CV')).toBeNull();
    });
  });
});
