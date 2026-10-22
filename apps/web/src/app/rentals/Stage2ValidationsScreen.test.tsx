import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Stage2ValidationsScreen } from './Stage2ValidationsScreen';

vi.mock('../shared/AppHeader', () => ({ AppHeader: () => <header>cabecera</header> }));

// ── mocks de infraestructura ────────────────────────────────────────────────

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

const useRentalWizardMock = vi.fn();
vi.mock('./useRentalWizard', () => ({
  useRentalWizard: () => useRentalWizardMock(),
}));

const registerAlcoholTestMock = vi.fn();
const requestSessionMock = vi.fn();
const uploadGcsMock = vi.fn();
const recordEvidenceMock = vi.fn();
vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    registerAlcoholTest: (...args: unknown[]) => registerAlcoholTestMock(...args),
    requestEvidenceUploadSession: (...args: unknown[]) => requestSessionMock(...args),
    uploadEvidenceToGcs: (...args: unknown[]) => uploadGcsMock(...args),
    recordEvidence: (...args: unknown[]) => recordEvidenceMock(...args),
  };
});

// ── fixtures ────────────────────────────────────────────────────────────────

const baseRental = {
  id: 'rent-1',
  status: 'VALIDATION',
  customerName: 'Maria Quispe',
  customerDocNumber: '12345678',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux',
  vehiclePlate: 'D0Y-704',
  alcoholTestResult: null,
  version: 2,
};

const baseContext = {
  companyId: 'c1',
  companyName: 'VeloxRent',
  branchId: 'b1',
  branchName: 'Sede Central',
};

function makeWizard(overrides?: Record<string, unknown>) {
  return {
    id: 'rent-1',
    state: 'READY' as const,
    rental: baseRental,
    context: baseContext,
    getIdToken: vi.fn().mockResolvedValue('tok'),
    setRental: vi.fn(),
    reload: vi.fn(),
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/alquileres/rent-1/entrega-02', state: baseContext },
      ]}
    >
      <Routes>
        <Route path="/alquileres/:id/entrega-02" element={<Stage2ValidationsScreen />} />
        <Route path="/alquileres/:id/entrega-03" element={<div>etapa 3</div>} />
        <Route path="/alquileres" element={<div>bandeja</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── suite ───────────────────────────────────────────────────────────────────

describe('Stage2ValidationsScreen (ENTREGA-02 / ALQ-04)', () => {
  beforeEach(() => {
    registerAlcoholTestMock.mockReset();
    requestSessionMock.mockReset();
    uploadGcsMock.mockReset();
    recordEvidenceMock.mockReset();
    useRentalWizardMock.mockReset();
  });

  // ── estado: carga ─────────────────────────────────────────────────────────

  it('muestra mensaje de carga cuando state es LOADING', () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ state: 'LOADING', rental: null, context: null }));
    renderScreen();
    expect(screen.getByText(/Cargando expediente/)).toBeInTheDocument();
  });

  // ── estado: error ─────────────────────────────────────────────────────────

  it('muestra mensaje de error cuando state es RECOVERABLE_ERROR', () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ state: 'RECOVERABLE_ERROR', rental: null, context: null }));
    renderScreen();
    expect(screen.getByText(/No pudimos cargar el expediente/)).toBeInTheDocument();
  });

  it('muestra mensaje de error cuando state es NOT_FOUND (sesión vencida o recurso ausente)', () => {
    useRentalWizardMock.mockReturnValue(makeWizard({ state: 'NOT_FOUND', rental: null, context: null }));
    renderScreen();
    expect(screen.getByText(/No pudimos cargar el expediente/)).toBeInTheDocument();
  });

  // ── estado: nominal ───────────────────────────────────────────────────────

  it('renderiza el formulario de alcoholímetro en estado READY', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    expect(screen.getByText(/Resultado del alcoholímetro/)).toBeInTheDocument();
    expect(screen.getByLabelText('Favorable')).toBeInTheDocument();
    expect(screen.getByLabelText('Desfavorable')).toBeInTheDocument();
  });

  it('Continuar está deshabilitado sin resultado ni hora', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  // ── validación: resultado + hora habilitan Continuar ─────────────────────

  it('Continuar se habilita solo cuando el resultado es FAVORABLE y hay hora', () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();

    fireEvent.click(screen.getByLabelText('Favorable'));
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled(); // aún falta la hora

    fireEvent.change(screen.getByLabelText(/Fecha y hora de la prueba/), { target: { value: '2024-01-01T10:30' } });
    expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled();
  });

  it.each([['Desfavorable'], ['Se negó']])(
    'con «%s» pide la foto del alcoholímetro (obligatoria), sin hora, y bloquea el botón hasta adjuntarla',
    (label) => {
      useRentalWizardMock.mockReturnValue(makeWizard());
      renderScreen();

      fireEvent.click(screen.getByLabelText(label));
      expect(screen.queryByLabelText(/Fecha y hora de la prueba/)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Foto de la prueba del alcoholímetro/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Registrar y cancelar el alquiler' })).toBeDisabled();

      const file = new File(['x'], 'prueba.jpg', { type: 'image/jpeg' });
      fireEvent.change(screen.getByLabelText(/Foto de la prueba del alcoholímetro/), { target: { files: [file] } });
      expect(screen.getByRole('button', { name: 'Registrar y cancelar el alquiler' })).not.toBeDisabled();
    },
  );

  it('sube la foto con la zona ALCOHOL_TEST y luego registra el resultado desfavorable (sin hora)', async () => {
    const setRentalMock = vi.fn();
    useRentalWizardMock.mockReturnValue(makeWizard({ setRental: setRentalMock }));
    requestSessionMock.mockResolvedValue({ uploadUrl: 'https://gcs/up', objectUrl: 'https://gcs/obj' });
    uploadGcsMock.mockResolvedValue(undefined);
    recordEvidenceMock.mockResolvedValue({});
    registerAlcoholTestMock.mockResolvedValue({ ...baseRental, status: 'CANCELLED', version: 3 });
    renderScreen();

    fireEvent.click(screen.getByLabelText('Desfavorable'));
    const file = new File(['x'], 'prueba.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/Foto de la prueba del alcoholímetro/), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar y cancelar el alquiler' }));

    await waitFor(() => expect(registerAlcoholTestMock).toHaveBeenCalled());
    expect(requestSessionMock).toHaveBeenCalledWith('tok', 'rent-1', 'c1', 'b1', 'PHOTO', 'ALCOHOL_TEST', 'image/jpeg', 1);
    expect(recordEvidenceMock).toHaveBeenCalledWith('tok', 'rent-1', 'c1', 'b1', 'PHOTO', 'ALCOHOL_TEST', 'https://gcs/obj');
    expect(registerAlcoholTestMock).toHaveBeenCalledWith('tok', 'rent-1', 'c1', 'b1', 2, 'DESFAVORABLE', undefined);
    expect(setRentalMock).toHaveBeenCalled();
  });

  it('rechaza una foto que no es JPEG/WebP sin llamar al API', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    renderScreen();
    fireEvent.click(screen.getByLabelText('Se negó'));
    const file = new File(['x'], 'prueba.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText(/Foto de la prueba del alcoholímetro/), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar y cancelar el alquiler' }));
    expect(await screen.findByText('Solo se admiten imágenes JPEG o WebP.')).toBeInTheDocument();
    expect(requestSessionMock).not.toHaveBeenCalled();
  });

  it('traduce ALCOHOL_TEST_PHOTO_REQUIRED a un mensaje de negocio', async () => {
    const { RentalCommandError } = await import('./rentals-client');
    useRentalWizardMock.mockReturnValue(makeWizard());
    requestSessionMock.mockResolvedValue({ uploadUrl: 'u', objectUrl: 'o' });
    uploadGcsMock.mockResolvedValue(undefined);
    recordEvidenceMock.mockResolvedValue({});
    registerAlcoholTestMock.mockRejectedValue(new RentalCommandError(422, { code: 'ALCOHOL_TEST_PHOTO_REQUIRED', detail: 'raw' }));
    renderScreen();
    fireEvent.click(screen.getByLabelText('Desfavorable'));
    fireEvent.change(screen.getByLabelText(/Foto de la prueba del alcoholímetro/), {
      target: { files: [new File(['x'], 'p.jpg', { type: 'image/jpeg' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar y cancelar el alquiler' }));
    expect(await screen.findByText(/Falta la foto de la prueba del alcoholímetro/)).toBeInTheDocument();
  });

  // ── guardado: submit exitoso ──────────────────────────────────────────────

  it('navega a etapa 3 y llama a setRental cuando registerAlcoholTest resuelve', async () => {
    const setRentalMock = vi.fn();
    useRentalWizardMock.mockReturnValue(makeWizard({ setRental: setRentalMock }));
    registerAlcoholTestMock.mockResolvedValue({ ...baseRental, status: 'NOTARY_EVALUATION', version: 3 });

    renderScreen();

    fireEvent.click(screen.getByLabelText('Favorable'));
    fireEvent.change(screen.getByLabelText(/Fecha y hora de la prueba/), { target: { value: '2024-01-01T10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('etapa 3')).toBeInTheDocument();
    expect(setRentalMock).toHaveBeenCalled();
    expect(registerAlcoholTestMock).toHaveBeenCalledWith(
      'tok',
      'rent-1',
      'c1',
      'b1',
      2,
      'FAVORABLE',
      expect.stringContaining('10:30'),
    );
  });

  // ── error de API ──────────────────────────────────────────────────────────

  it('muestra el mensaje del RentalCommandError cuando el comando rechaza', async () => {
    const { RentalCommandError } = await import('./rentals-client');
    useRentalWizardMock.mockReturnValue(makeWizard());
    registerAlcoholTestMock.mockRejectedValue(
      new RentalCommandError(409, { code: 'VERSION_MISMATCH', detail: 'Conflicto de versión detectado' }),
    );

    renderScreen();

    fireEvent.click(screen.getByLabelText('Favorable'));
    fireEvent.change(screen.getByLabelText(/Fecha y hora de la prueba/), { target: { value: '2024-01-01T10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Conflicto de versión detectado')).toBeInTheDocument();
  });

  it('muestra mensaje genérico cuando el error no es RentalCommandError', async () => {
    useRentalWizardMock.mockReturnValue(makeWizard());
    registerAlcoholTestMock.mockRejectedValue(new Error('Network error'));

    renderScreen();

    fireEvent.click(screen.getByLabelText('Favorable'));
    fireEvent.change(screen.getByLabelText(/Fecha y hora de la prueba/), { target: { value: '2024-01-01T10:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText(/No pudimos registrar la validación/)).toBeInTheDocument();
  });

});
