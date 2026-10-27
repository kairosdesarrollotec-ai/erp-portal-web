import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Stage3ContractScreen } from './Stage3ContractScreen';
import { RentalCommandError } from './rentals-client';
import { clearPermissions, setPermissions } from '../../test/permissions';

// DEC-ALQ-DRIVERRATE-001 (F-02): tarifa diaria del conductor de la empresa digitable en ENTREGA-03.

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
vi.mock('../shared/AppHeader', () => ({ AppHeader: () => <header>cabecera</header> }));

const useRentalWizardMock = vi.fn();
vi.mock('./useRentalWizard', () => ({ useRentalWizard: () => useRentalWizardMock() }));

const formalizeContractMock = vi.fn();
const setRateMock = vi.fn();
vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    evaluateNotary: vi.fn(),
    approveNotaryException: vi.fn(),
    formalizeContract: (...args: unknown[]) => formalizeContractMock(...args),
    setCompanyDriverDailyRate: (...args: unknown[]) => setRateMock(...args),
    getContractTemplate: vi.fn().mockResolvedValue({
      variant: { holderType: 'NATURAL', withCompanyDriver: true },
      requestedType: 'RENTAL_CONTRACT_NATURAL_DRIVER',
      fallbackUsed: false,
      template: { id: 't1', type: 'RENTAL_CONTRACT_NATURAL_DRIVER', name: 'Contrato con conductor' },
    }),
  };
});

const baseRental = {
  id: 'rent-1',
  status: 'CONTRACTING',
  customerName: 'Carlos Vega',
  customerDocNumber: '87654321',
  vehicleBrand: 'Chevrolet',
  vehicleModel: 'Colorado',
  vehiclePlate: 'A1B-234',
  alcoholTestResult: 'FAVORABLE',
  version: 3,
  notaryEvaluation: {
    id: 'ne-1', policyVersion: 1, result: 'MANDATORY', reason: 'Notaría obligatoria', evaluatedAt: '2026-10-01T00:00:00Z', approvedBy: null, justification: null,
  },
  contract: null,
  deposit: null,
};

const formalizedRental = (charge: unknown) => ({
  ...baseRental,
  status: 'PENDING_DELIVERY',
  version: 4,
  contract: { id: 'c1', documentRef: 'CONTRATO-rent-1', status: 'SIGNED', contractVariant: 'NATURAL_WITH_DRIVER' },
  companyDriverCharge: charge,
});

const context = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' };

function wizard(rental: unknown, setRental = vi.fn()) {
  return { id: 'rent-1', state: 'READY' as const, rental, context, getIdToken: vi.fn().mockResolvedValue('tok'), setRental, reload: vi.fn() };
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/alquileres/rent-1/entrega-03', state: context }]}>
      <Routes>
        <Route path="/alquileres/:id/entrega-03" element={<Stage3ContractScreen />} />
        <Route path="/alquileres/:id/entrega-04" element={<div>etapa 4</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const rateInput = () => screen.getByLabelText('Tarifa diaria del conductor (S/)');

async function formalizeWithDriver(rate = '100') {
  fireEvent.click(screen.getByLabelText(/Con conductor de la empresa/));
  fireEvent.change(rateInput(), { target: { value: rate } });
  fireEvent.click(screen.getByLabelText(/Área de firma digital/));
  fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeEnabled());
}

describe('ENTREGA-03: tarifa diaria del conductor de la empresa (DEC-ALQ-DRIVERRATE-001)', () => {
  beforeEach(() => {
    formalizeContractMock.mockReset();
    setRateMock.mockReset();
    useRentalWizardMock.mockReset();
    clearPermissions();
    setPermissions(['RENTAL.READ', 'RENTAL.FORMALIZE_CONTRACT']);
  });

  it('sin conductor de la empresa no muestra el campo; al marcarlo aparece con aviso de tarifa por digitar', () => {
    useRentalWizardMock.mockReturnValue(wizard(baseRental));
    renderScreen();
    expect(screen.queryByLabelText('Tarifa diaria del conductor (S/)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Con conductor de la empresa/));
    expect(rateInput()).toBeEnabled();
    expect(screen.getByTestId('driver-rate-pending')).toHaveTextContent(/obligatoria para formalizar/);
  });

  it('Respuestas 2026-10-20 #2: sin tarifa digitada NO se puede formalizar (campo obligatorio)', async () => {
    useRentalWizardMock.mockReturnValue(wizard(baseRental));
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Con conductor de la empresa/));
    fireEvent.click(screen.getByLabelText(/Área de firma digital/));
    fireEvent.click(screen.getByTestId('fingerprint-taken-checkbox'));
    await waitFor(() => expect(screen.getByLabelText(/Área de firma digital/)).toBeInTheDocument());
    expect(rateInput()).toBeRequired();
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeDisabled();
    fireEvent.change(rateInput(), { target: { value: '100' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeEnabled());
  });

  it('tarifa digitada antes de formalizar: se guarda justo despues con la version nueva y navega a ENTREGA-04', async () => {
    const setRental = vi.fn();
    useRentalWizardMock.mockReturnValue(wizard(baseRental, setRental));
    const formalized = formalizedRental(null);
    formalizeContractMock.mockResolvedValue(formalized);
    const withRate = formalizedRental({ configured: true, source: 'MANUAL', dailyRate: '120.50', currency: 'PEN', days: 3, total: '361.50' });
    setRateMock.mockResolvedValue({ ...withRate, version: 5 });
    renderScreen();
    await formalizeWithDriver();
    fireEvent.change(rateInput(), { target: { value: '120.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    expect(screen.getByTestId('confirm-driver-rate')).toHaveTextContent('tarifa diaria S/ 120.50');
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));
    await screen.findByText('etapa 4');
    expect(setRateMock).toHaveBeenCalledWith('tok', 'rent-1', 'c1', 'b1', 4, '120.5');
    expect(setRental).toHaveBeenLastCalledWith(expect.objectContaining({ version: 5 }));
  });

  it('si falla guardar la tarifa tras formalizar, no navega y explica como reintentar', async () => {
    useRentalWizardMock.mockReturnValue(wizard(baseRental));
    formalizeContractMock.mockResolvedValue(formalizedRental(null));
    setRateMock.mockRejectedValue(new RentalCommandError(412, { code: 'RENTAL_VERSION_CONFLICT', detail: 'El alquiler fue modificado.' }));
    renderScreen();
    await formalizeWithDriver();
    fireEvent.change(rateInput(), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar y continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Formalizar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/contrato quedó formalizado, pero no pudimos guardar la tarifa diaria/);
    expect(screen.queryByText('etapa 4')).not.toBeInTheDocument();
  });

  it.each(['0', '0.00', '-3', '12.345'])('tarifa invalida %s bloquea formalizar con mensaje', async (bad) => {
    useRentalWizardMock.mockReturnValue(wizard(baseRental));
    renderScreen();
    await formalizeWithDriver();
    fireEvent.change(rateInput(), { target: { value: bad } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/mayor que 0 y tener como máximo 2 decimales/);
    expect(rateInput()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Formalizar y continuar' })).toBeDisabled();
  });

  it('sin permiso FORMALIZE_CONTRACT el campo queda deshabilitado con aviso', () => {
    clearPermissions();
    setPermissions(['RENTAL.READ']);
    useRentalWizardMock.mockReturnValue(wizard(baseRental));
    renderScreen();
    fireEvent.click(screen.getByLabelText(/Con conductor de la empresa/));
    expect(rateInput()).toBeDisabled();
    expect(screen.getByText(/No tienes permiso para digitar la tarifa diaria/)).toBeInTheDocument();
  });

  it('contrato ya formalizado y tarifa NO definida: aviso claro; guardar actualiza con la version del alquiler', async () => {
    const setRental = vi.fn();
    useRentalWizardMock.mockReturnValue(
      wizard(formalizedRental({ configured: false, source: 'NOT_DEFINED', dailyRate: '0.00', currency: 'PEN', days: 3, total: '0.00' }), setRental),
    );
    setRateMock.mockResolvedValue(formalizedRental({ configured: true, source: 'MANUAL', dailyRate: '100.00', currency: 'PEN', days: 3, total: '300.00' }));
    renderScreen();
    expect(screen.getByTestId('driver-rate-not-defined')).toHaveTextContent(/Tarifa diaria no definida: digítala y pulsa «Guardar tarifa»/);
    expect(screen.getByRole('button', { name: 'Guardar tarifa' })).toBeDisabled();
    fireEvent.change(rateInput(), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar tarifa' }));
    await screen.findByText('Tarifa guardada.');
    expect(setRateMock).toHaveBeenCalledWith('tok', 'rent-1', 'c1', 'b1', 4, '100');
    expect(setRental).toHaveBeenCalledWith(expect.objectContaining({ companyDriverCharge: expect.objectContaining({ source: 'MANUAL' }) }));
  });

  it('muestra el origen: ENV (se puede sobrescribir) y MANUAL (campo precargado con total)', () => {
    useRentalWizardMock.mockReturnValue(
      wizard(formalizedRental({ configured: true, source: 'ENV', dailyRate: '80.00', currency: 'PEN', days: 2, total: '160.00' })),
    );
    const { unmount } = renderScreen();
    expect(screen.getByTestId('driver-rate-env')).toHaveTextContent(/Referencia del sistema: S\/ 80\.00 por día/);
    unmount();
    useRentalWizardMock.mockReturnValue(
      wizard(formalizedRental({ configured: true, source: 'MANUAL', dailyRate: '120.50', currency: 'PEN', days: 2, total: '241.00' })),
    );
    renderScreen();
    expect(rateInput()).toHaveValue(120.5);
    expect(screen.getByTestId('driver-rate-manual')).toHaveTextContent(/S\/ 120\.50 por día × 2 día\(s\) = S\/ 241\.00/);
  });

  it('traduce el 409 COMPANY_DRIVER_RATE_CLOSED al guardar', async () => {
    useRentalWizardMock.mockReturnValue(
      wizard(formalizedRental({ configured: false, source: 'NOT_DEFINED', dailyRate: '0.00', currency: 'PEN', days: 3, total: '0.00' })),
    );
    setRateMock.mockRejectedValue(new RentalCommandError(409, { code: 'COMPANY_DRIVER_RATE_CLOSED', detail: 'x' }));
    renderScreen();
    fireEvent.change(rateInput(), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar tarifa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ya no se puede cambiar: solo se edita hasta completar la entrega/);
  });

  it('con el contrato formalizado, «Continuar a la entrega» queda bloqueado hasta que la tarifa esté definida (MANUAL)', () => {
    useRentalWizardMock.mockReturnValue(
      wizard(formalizedRental({ configured: false, source: 'NOT_DEFINED', dailyRate: '0.00', currency: 'PEN', days: 3, total: '0.00' })),
    );
    const { unmount } = renderScreen();
    expect(screen.getByRole('button', { name: 'Continuar a la entrega' })).toBeDisabled();
    unmount();
    // La tarifa del sistema (ENV) es solo referencia: tampoco habilita.
    useRentalWizardMock.mockReturnValue(
      wizard(formalizedRental({ configured: true, source: 'ENV', dailyRate: '80.00', currency: 'PEN', days: 2, total: '160.00' })),
    );
    const second = renderScreen();
    expect(screen.getByRole('button', { name: 'Continuar a la entrega' })).toBeDisabled();
    second.unmount();
    useRentalWizardMock.mockReturnValue(
      wizard(formalizedRental({ configured: true, source: 'MANUAL', dailyRate: '90.00', currency: 'PEN', days: 2, total: '180.00' })),
    );
    renderScreen();
    expect(screen.getByRole('button', { name: 'Continuar a la entrega' })).toBeEnabled();
  });

  it.each(['ACTIVE', 'EXTENSION_PENDING', 'RETURN_IN_PROGRESS', 'CLOSED', 'CANCELLED'])(
    'con el alquiler en %s la tarifa ya no se edita (solo PENDING_DELIVERY)',
    (status) => {
      useRentalWizardMock.mockReturnValue(
        wizard({
          ...formalizedRental({ configured: true, source: 'MANUAL', dailyRate: '90.00', currency: 'PEN', days: 2, total: '180.00' }),
          status,
        }),
      );
      renderScreen();
      expect(rateInput()).toBeDisabled();
      expect(screen.getByTestId('driver-rate-closed')).toHaveTextContent(/ya no se puede cambiar/);
      expect(screen.queryByRole('button', { name: 'Guardar tarifa' })).not.toBeInTheDocument();
    },
  );

  it('con el alquiler en PENDING_DELIVERY la tarifa sigue editable', () => {
    useRentalWizardMock.mockReturnValue(
      wizard(formalizedRental({ configured: true, source: 'MANUAL', dailyRate: '90.00', currency: 'PEN', days: 2, total: '180.00' })),
    );
    renderScreen();
    expect(rateInput()).toBeEnabled();
    expect(screen.queryByTestId('driver-rate-closed')).not.toBeInTheDocument();
  });

  it('accesibilidad (axe): campo de tarifa con aviso de tarifa no definida', async () => {
    useRentalWizardMock.mockReturnValue(
      wizard(formalizedRental({ configured: false, source: 'NOT_DEFINED', dailyRate: '0.00', currency: 'PEN', days: 3, total: '0.00' })),
    );
    const { container } = renderScreen();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('accesibilidad (axe): campo con tarifa invalida y aviso previo a formalizar', async () => {
    useRentalWizardMock.mockReturnValue(wizard(baseRental));
    const { container } = renderScreen();
    fireEvent.click(screen.getByLabelText(/Con conductor de la empresa/));
    fireEvent.change(rateInput(), { target: { value: '0' } });
    expect(await axe(container)).toHaveNoViolations();
  });
});
