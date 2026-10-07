import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ChecklistScreen } from './ChecklistScreen';
import { ResultScreen } from './ResultScreen';
import { baseContext, makeFlow, makeReturn } from './test-utils';
import { ReturnCommandError } from './returns-client';
import { setPermissions } from '../../test/permissions';

const RETURN_FULL = [
  'RETURN.CREATE', 'RETURN.READ', 'RETURN.RECEIVE_PROVISIONAL',
  'RETURN.REGISTER_ALCOHOL_TEST', 'RETURN.COMPLETE_INSPECTION',
  'RETURN.UPLOAD_EVIDENCE', 'RETURN.ASSESS_DAMAGE',
  'RETURN.CHARGE_IMMOBILIZATION', 'RETURN.CLOSE_FINANCIAL', 'RETURN.CLOSE',
] as const;
import {
  EMPTY_RETURN_CHECKLIST,
  loadReturnChecklist,
  saveReturnChecklist,
  type ResponsibilityDocumentDraft,
} from './return-session-draft';

const SIGNED_DOC: ResponsibilityDocumentDraft = {
  signerName: 'Maria Quispe',
  signerIsHolder: true,
  signerRelationToHolder: '',
  signatureData: 'data:image/png;base64,FIRMA',
};
function seedDoc(doc: ResponsibilityDocumentDraft = SIGNED_DOC, notes = '') {
  saveReturnChecklist('ret-1', { ...EMPTY_RETURN_CHECKLIST, responsibilityDocument: doc, notes });
}

const flowMock = vi.fn();
const listReturnEvidenceMock = vi.fn();
const listRentalEvidenceMock = vi.fn();
const requestSessionMock = vi.fn();
const uploadGcsMock = vi.fn();
const recordEvidenceMock = vi.fn();
const completeInspectionMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./useReturnFlow', () => ({ useReturnFlow: () => flowMock() }));
vi.mock('../rentals/rentals-client', async () => {
  const actual = await vi.importActual<typeof import('../rentals/rentals-client')>('../rentals/rentals-client');
  return { ...actual, listRentalEvidence: (...args: unknown[]) => listRentalEvidenceMock(...args) };
});
vi.mock('./returns-client', async () => {
  const actual = await vi.importActual<typeof import('./returns-client')>('./returns-client');
  return {
    ...actual,
    listReturnEvidence: (...args: unknown[]) => listReturnEvidenceMock(...args),
    requestReturnEvidenceUploadSession: (...args: unknown[]) => requestSessionMock(...args),
    uploadReturnEvidenceToGcs: (...args: unknown[]) => uploadGcsMock(...args),
    recordReturnEvidence: (...args: unknown[]) => recordEvidenceMock(...args),
    completeInspection: (...args: unknown[]) => completeInspectionMock(...args),
  };
});

function evidence(type: 'PHOTO' | 'VIDEO', i: number, zone = 'FRONTAL') {
  return { id: `${type}-${i}`, returnId: 'ret-1', type, zone, objectUrl: `https://gcs/${type}-${i}`, createdAt: '2026-10-04T10:00:00Z' };
}

function fullEvidence() {
  return [
    ...Array.from({ length: 35 }, (_, i) => evidence('PHOTO', i)),
    ...Array.from({ length: 3 }, (_, i) => evidence('VIDEO', i)),
  ];
}

function renderChecklist() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/devoluciones/ret-1/checklist', state: baseContext }]}>
      <Routes>
        <Route path="/devoluciones/:id/checklist" element={<ChecklistScreen />} />
        <Route path="/devoluciones/:id/resultado" element={<div>pantalla resultado</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderResult() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/devoluciones/ret-1/resultado', state: baseContext }]}>
      <Routes>
        <Route path="/devoluciones/:id/resultado" element={<ResultScreen />} />
        <Route path="/devoluciones/:id/garantia" element={<div>pantalla garantia</div>} />
        <Route path="/devoluciones/:id/dano" element={<div>pantalla dano</div>} />
        <Route path="/devoluciones/:id/checklist" element={<div>pantalla checklist</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ChecklistScreen (DEV-04)', () => {
  beforeEach(() => {
    [flowMock, listReturnEvidenceMock, requestSessionMock, uploadGcsMock, recordEvidenceMock].forEach((m) => m.mockReset());
    sessionStorage.clear();
    setPermissions(RETURN_FULL);
    flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ status: 'INSPECCION' }) }));
    listReturnEvidenceMock.mockResolvedValue([]);
  });

  it('con evidencia incompleta no permite continuar y avisa lo que falta', async () => {
    renderChecklist();
    expect(await screen.findByText(/Faltan 35 fotos y 3 videos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar a Resultado' })).toBeDisabled();
    expect(screen.getByText('Fotos (0/35)')).toBeInTheDocument();
  });

  it('lee la evidencia con el contexto de sede', async () => {
    renderChecklist();
    await screen.findByText(/Faltan/);
    expect(listReturnEvidenceMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1');
  });

  it('solo confirma el servidor: con 35 fotos + 3 videos persistidos y el documento firmado se habilita Continuar a Resultado', async () => {
    seedDoc();
    listReturnEvidenceMock.mockResolvedValue(fullEvidence());
    renderChecklist();
    expect(await screen.findByText('Confirmado por el servidor — recepción completa')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Continuar a Resultado' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(await screen.findByText('pantalla resultado')).toBeInTheDocument();
  });

  it('con la evidencia completa pero sin documento de responsabilidad firmado no permite continuar', async () => {
    listReturnEvidenceMock.mockResolvedValue(fullEvidence());
    renderChecklist();
    await screen.findByText('Confirmado por el servidor — recepción completa');
    expect(screen.getByRole('button', { name: 'Continuar a Resultado' })).toBeDisabled();
    expect(screen.getByText(/Falta el documento de responsabilidad firmado/)).toBeInTheDocument();
  });

  it('captura el documento: nombre, titular?, relacion si no es el titular y firma (EX-DEV-001)', async () => {
    const ctx = { beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,TRAZO');
    listReturnEvidenceMock.mockResolvedValue(fullEvidence());
    renderChecklist();
    await screen.findByText('Confirmado por el servidor — recepción completa');
    const next = screen.getByRole('button', { name: 'Continuar a Resultado' });

    fireEvent.change(screen.getByLabelText('Nombre de quien firma'), { target: { value: 'Pedro Soto' } });
    fireEvent.click(screen.getByLabelText(/No, es otra persona/));
    const canvas = screen.getByRole('img', { name: /Firma del documento de responsabilidad/ });
    fireEvent.pointerDown(canvas, { clientX: 5, clientY: 5 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 12 });
    fireEvent.pointerUp(canvas);
    expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('(firmado)'));
    expect(next).toBeDisabled(); // falta la relacion con el titular

    fireEvent.change(screen.getByLabelText('Relación con el titular'), { target: { value: 'Hermano' } });
    expect(next).toBeEnabled();
    expect(loadReturnChecklist('ret-1').responsibilityDocument).toEqual({
      signerName: 'Pedro Soto',
      signerIsHolder: false,
      signerRelationToHolder: 'Hermano',
      signatureData: 'data:image/png;base64,TRAZO',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Borrar firma' }));
    expect(next).toBeDisabled();
    vi.restoreAllMocks();
  });

  it('un documento ya firmado en el expediente se muestra como "firmado por" y no se vuelve a pedir', async () => {
    flowMock.mockReturnValue(
      makeFlow({
        ret: makeReturn({
          status: 'SIN_DANOS',
          responsibilityDocument: { signerName: 'Pedro Soto', signerIsHolder: false, signerRelationToHolder: 'Hermano' },
        }),
      }),
    );
    listReturnEvidenceMock.mockResolvedValue(fullEvidence());
    renderChecklist();
    expect(await screen.findByText(/Documento firmado por Pedro Soto/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre de quien firma')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar a Resultado' })).toBeEnabled();
  });

  it('sube una foto por URL firmada: pide sesion -> PUT a GCS -> registra -> recarga', async () => {
    requestSessionMock.mockResolvedValue({ uploadUrl: 'https://gcs/upload', objectUrl: 'https://gcs/obj', expiresAt: 'x' });
    uploadGcsMock.mockResolvedValue(undefined);
    recordEvidenceMock.mockResolvedValue(evidence('PHOTO', 1));
    const { container } = renderChecklist();
    await screen.findByText(/Faltan/);

    fireEvent.change(screen.getByLabelText('Zona del vehículo'), { target: { value: 'POSTERIOR' } });
    const input = container.querySelector('input[accept="image/jpeg,image/webp"]') as HTMLInputElement;
    const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(recordEvidenceMock).toHaveBeenCalled());
    expect(requestSessionMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 'PHOTO', 'POSTERIOR', 'image/jpeg', 1);
    expect(uploadGcsMock).toHaveBeenCalledWith('https://gcs/upload', file);
    expect(recordEvidenceMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 'PHOTO', 'POSTERIOR', 'https://gcs/obj');
    expect(listReturnEvidenceMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('rechaza formatos no admitidos sin llamar al backend', async () => {
    const { container } = renderChecklist();
    await screen.findByText(/Faltan/);
    const input = container.querySelector('input[accept="image/jpeg,image/webp"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Solo se admiten imágenes JPEG o WebP.');
    expect(requestSessionMock).not.toHaveBeenCalled();
  });

  it('un error de GCS se muestra en lenguaje de negocio y no registra evidencia', async () => {
    requestSessionMock.mockResolvedValue({ uploadUrl: 'https://gcs/upload', objectUrl: 'https://gcs/obj', expiresAt: 'x' });
    uploadGcsMock.mockRejectedValue(new Error('network'));
    const { container } = renderChecklist();
    await screen.findByText(/Faltan/);
    const input = container.querySelector('input[accept="image/jpeg,image/webp"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos subir el archivo');
    expect(recordEvidenceMock).not.toHaveBeenCalled();
  });

  it('un 422 del backend al pedir la URL firmada muestra mensaje de negocio', async () => {
    requestSessionMock.mockRejectedValue(new ReturnCommandError(403, { code: 'ROLE_NOT_ALLOWED' }));
    const { container } = renderChecklist();
    await screen.findByText(/Faltan/);
    const input = container.querySelector('input[accept="image/jpeg,image/webp"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Tu rol no tiene permiso');
  });

  it('sin conexion pausa la captura (OFFLINE_READ_ONLY)', async () => {
    const online = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    renderChecklist();
    expect(await screen.findByText(/Sin conexión/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar fotos' })).toBeDisabled();
    online.mockRestore();
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    const { container } = renderChecklist();
    await screen.findByText(/Faltan/);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ResultScreen (DEV-05, hub)', () => {
  beforeEach(() => {
    [flowMock, listReturnEvidenceMock, listRentalEvidenceMock, completeInspectionMock].forEach((m) => m.mockReset());
    sessionStorage.clear();
    setPermissions(RETURN_FULL);
    seedDoc();
    flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ status: 'INSPECCION' }) }));
    listReturnEvidenceMock.mockResolvedValue([evidence('PHOTO', 1)]);
    listRentalEvidenceMock.mockResolvedValue([
      { id: 'e1', rentalId: 'rent-1', type: 'PHOTO', zone: 'FRONTAL', objectUrl: 'https://gcs/entrega', uploadedBy: 'u', uploadedAt: '2026-10-01T10:00:00Z' },
    ]);
  });

  async function markAll(values: ('OK' | 'DAMAGED')[]) {
    for (const value of values) {
      fireEvent.click(
        screen.getByRole('button', { name: value === 'OK' ? 'Sin daño' : 'Marcar con daño en esta zona' }),
      );
    }
  }

  it('compara entrega vs devolucion lado a lado y no ofrece "Liberar garantía" hasta evaluar las 5 zonas', async () => {
    renderResult();
    expect(await screen.findByAltText('Entrega — zona Frontal')).toBeInTheDocument();
    expect(screen.getByAltText('Devolución — zona Frontal')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Liberar garantía' })).not.toBeInTheDocument();

    await markAll(['OK', 'OK', 'OK', 'OK']);
    expect(screen.queryByRole('button', { name: 'Liberar garantía' })).not.toBeInTheDocument();
  });

  it('5 zonas sin daño: aparece "Liberar garantía", registra SIN_DANOS y salta directo a DEV-09', async () => {
    completeInspectionMock.mockResolvedValue(makeReturn({ status: 'SIN_DANOS' }));
    renderResult();
    await screen.findByAltText('Entrega — zona Frontal');
    await markAll(['OK', 'OK', 'OK', 'OK', 'OK']);

    expect(screen.getByText('Sin daños encontrados en ninguna zona')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuar a evaluación de daño' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Liberar garantía' }));

    await waitFor(() =>
      expect(completeInspectionMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, {
        hasDamages: false,
        damagesDescription: undefined,
        notes: undefined,
        responsibilityDocument: {
          signerName: 'Maria Quispe',
          signerIsHolder: true,
          signerRelationToHolder: undefined,
          signatureData: 'data:image/png;base64,FIRMA',
        },
      }),
    );
    expect(await screen.findByText('pantalla garantia')).toBeInTheDocument();
    // la firma ya quedo en el expediente: no se conserva en el navegador
    expect(loadReturnChecklist('ret-1').responsibilityDocument.signatureData).toBe('');
  });

  it('sin documento de responsabilidad firmado (otro dispositivo) no se puede cerrar la inspeccion y se devuelve al checklist', async () => {
    sessionStorage.clear();
    renderResult();
    await screen.findByAltText('Entrega — zona Frontal');
    await markAll(['OK', 'OK', 'OK', 'OK', 'OK']);
    expect(screen.getByRole('button', { name: 'Liberar garantía' })).toBeDisabled();
    expect(screen.getByText(/Falta el documento de responsabilidad firmado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Completarlo en el checklist' }));
    expect(await screen.findByText('pantalla checklist')).toBeInTheDocument();
    expect(completeInspectionMock).not.toHaveBeenCalled();
  });

  it('un 422 MISSING_RESPONSIBILITY_DOCUMENT del backend se explica en lenguaje de negocio', async () => {
    completeInspectionMock.mockRejectedValue(new ReturnCommandError(422, { code: 'MISSING_RESPONSIBILITY_DOCUMENT' }));
    renderResult();
    await screen.findByAltText('Entrega — zona Frontal');
    await markAll(['OK', 'OK', 'OK', 'OK', 'OK']);
    fireEvent.click(screen.getByRole('button', { name: 'Liberar garantía' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('documento de responsabilidad');
  });

  it('con daño en alguna zona: NO aparece "Liberar garantía", aparece "Continuar a evaluación de daño" hacia DEV-06', async () => {
    completeInspectionMock.mockResolvedValue(makeReturn({ status: 'CON_DANOS' }));
    renderResult();
    await screen.findByAltText('Entrega — zona Frontal');
    await markAll(['OK', 'OK', 'DAMAGED', 'OK', 'OK']);

    expect(screen.getByText('Daño encontrado en 1 de 5 zonas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Liberar garantía' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a evaluación de daño' }));

    await waitFor(() =>
      expect(completeInspectionMock).toHaveBeenCalledWith(
        'tok',
        'ret-1',
        'c1',
        'b1',
        2,
        expect.objectContaining({ hasDamages: true, damagesDescription: 'Daño en: Lateral derecho' }),
      ),
    );
    expect(await screen.findByText('pantalla dano')).toBeInTheDocument();
  });

  it('un expediente ya CON_DANOS ofrece continuar sin volver a marcar zonas', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ status: 'CON_DANOS' }) }));
    renderResult();
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar a evaluación de daño' }));
    expect(await screen.findByText('pantalla dano')).toBeInTheDocument();
    expect(completeInspectionMock).not.toHaveBeenCalled();
  });

  it('antes de la inspeccion (RECEPCION_PROVISIONAL) no permite evaluar', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ status: 'RECEPCION_PROVISIONAL' }) }));
    renderResult();
    expect(await screen.findByText(/El resultado se evalúa después de completar la recepción/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sin daño' })).not.toBeInTheDocument();
  });

  it('un error de dominio se muestra sin codigos tecnicos', async () => {
    completeInspectionMock.mockRejectedValue(new ReturnCommandError(409, { code: 'RETURN_STATE_CONFLICT' }));
    renderResult();
    await screen.findByAltText('Entrega — zona Frontal');
    await markAll(['OK', 'OK', 'OK', 'OK', 'OK']);
    fireEvent.click(screen.getByRole('button', { name: 'Liberar garantía' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ya no corresponde al estado actual');
  });

  it('no tiene violaciones de accesibilidad (axe) en el comparador ni en el resultado final', async () => {
    const { container } = renderResult();
    await screen.findByAltText('Entrega — zona Frontal');
    expect(await axe(container)).toHaveNoViolations();
    await markAll(['OK', 'OK', 'OK', 'OK', 'OK']);
    expect(await axe(container)).toHaveNoViolations();
  });
});
