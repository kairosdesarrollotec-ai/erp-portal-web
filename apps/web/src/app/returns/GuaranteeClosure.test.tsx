import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { GuaranteeScreen } from './GuaranteeScreen';
import { ClosureScreen } from './ClosureScreen';
import { makeFlow, makeReturn } from './test-utils';
import { renderReturnScreen } from './test-harness';
import { ReturnCommandError } from './returns-client';
import { clearCosmeticTariffCache } from './useCosmeticTariff';
import type { ReturnDamageResponse } from './returns-client';
import { setPermissions } from '../../test/permissions';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));

const RETURN_CLOSE = [
  'RETURN.READ', 'RETURN.CLOSE_FINANCIAL', 'RETURN.CLOSE',
] as const;

const flowMock = vi.fn();
const closeFinancialMock = vi.fn();
const closeReturnMock = vi.fn();
const getRentalMock = vi.fn();
const recordMechanicReportMock = vi.fn();
const escalateLegalMock = vi.fn();
const recordHolderNotificationMock = vi.fn();

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
  return { ...actual, getRental: (...args: unknown[]) => getRentalMock(...args) };
});
vi.mock('./returns-client', async () => {
  const actual = await vi.importActual<typeof import('./returns-client')>('./returns-client');
  return {
    ...actual,
    closeFinancial: (...args: unknown[]) => closeFinancialMock(...args),
    closeReturn: (...args: unknown[]) => closeReturnMock(...args),
    recordMechanicReport: (...args: unknown[]) => recordMechanicReportMock(...args),
    escalateLegal: (...args: unknown[]) => escalateLegalMock(...args),
    recordHolderNotification: (...args: unknown[]) => recordHolderNotificationMock(...args),
    getCosmeticTariff: () => Promise.resolve([{ code: 'CAPOT', name: 'Paño en el capot', pricePen: 200 }]),
  };
});

const dmg = (over: Partial<ReturnDamageResponse> = {}): ReturnDamageResponse => ({
  id: 'd1',
  returnId: 'ret-1',
  origin: 'AESTHETIC',
  severity: 'LEVE',
  damagedZone: 'CAPOT',
  estimatedAmount: 200,
  createdAt: 'x',
  ...over,
});
const conDanos = (damages: ReturnDamageResponse[] = [], extra = {}) => makeReturn({ status: 'CON_DANOS', damages, ...extra });
const sinDanos = () => makeReturn({ status: 'SIN_DANOS', receivedAt: new Date().toISOString() });

beforeEach(() => {
  [flowMock, closeFinancialMock, closeReturnMock, getRentalMock, recordMechanicReportMock, escalateLegalMock].forEach((m) => m.mockReset());
  sessionStorage.clear();
  clearCosmeticTariffCache();
  setPermissions(RETURN_CLOSE);
  getRentalMock.mockResolvedValue({ id: 'rent-1', branchId: 'b1', deposit: { originalAmount: '1000', currency: 'PEN' } });
});

describe('GuaranteeScreen (DEV-09)', () => {
  const mount = () => renderReturnScreen('/devoluciones/ret-1/garantia', <GuaranteeScreen />, '/devoluciones/:id/garantia');

  async function confirmDialog() {
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar liberación de garantía' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Confirmar S\// }));
  }

  it('sin daños: garantia completa, sin descuentos, confirmacion reforzada con el monto exacto', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: sinDanos() }));
    closeFinancialMock.mockResolvedValue(makeReturn({ status: 'CIERRE_FINANCIERO' }));
    mount();

    expect(await screen.findByText('Sin descuentos — sin daños encontrados')).toBeInTheDocument();
    expect(screen.getByLabelText('Resumen de garantía')).toHaveTextContent('S/ 1,000.00');
    expect(screen.getByText(/restantes del plazo de 24h/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar liberación de garantía' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('S/ 1,000.00');
    expect(closeFinancialMock).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirmar S\// }));

    await waitFor(() => expect(closeFinancialMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, 1000, 0, undefined));
    expect(await screen.findByText('pantalla cierre')).toBeInTheDocument();
  });

  it('garantía ya retenida (falta grave): avisa, no devuelve dinero y permite continuar', async () => {
    getRentalMock.mockResolvedValue({ id: 'rent-1', branchId: 'b1', deposit: { originalAmount: '1000', currency: 'PEN', status: 'RETAINED' } });
    flowMock.mockReturnValue(makeFlow({ ret: sinDanos() }));
    mount();
    expect(await screen.findByTestId('deposit-settled-notice')).toHaveTextContent(/ya fue liquidada/i);
    expect(screen.getByRole('button', { name: 'Confirmar liberación de garantía' })).toBeEnabled();
  });

  it('no muestra saldo a favor de la reserva (decision 22-oct)', async () => {
    getRentalMock.mockResolvedValue({ id: 'rent-1', branchId: 'b1', deposit: { originalAmount: '200', currency: 'PEN' } });
    flowMock.mockReturnValue(makeFlow({ ret: sinDanos() }));
    mount();
    await screen.findByLabelText('Resumen de garantía');
    expect(screen.queryByTestId('reservation-credit-excess')).not.toBeInTheDocument();
  });

  it('con daños: descuenta los daños registrados de la garantia', async () => {
    flowMock.mockReturnValue(
      makeFlow({
        ret: conDanos([dmg()], {
          immobilizationCharges: [{ id: 'c1', returnId: 'ret-1', daysCharged: 1, dailyRate: 100, totalAmount: 100, createdAt: 'x' }],
        }),
      }),
    );
    closeFinancialMock.mockResolvedValue(makeReturn({ status: 'CIERRE_FINANCIERO' }));
    mount();

    await screen.findByLabelText('Resumen de garantía');
    // daños + paralizacion del expediente (sin sessionStorage): 1000 - (200 + 100)
    expect(screen.getByLabelText('Resumen de garantía')).toHaveTextContent('S/ 700.00');
    expect(screen.queryByLabelText('Monto a retener (S/)')).not.toBeInTheDocument(); // sin peticion manual
    await confirmDialog();
    await waitFor(() => expect(closeFinancialMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, 700, 300, undefined));
  });

  it('con daños recargados desde el servidor (otro dispositivo) el monto sigue calculado', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos([dmg({ estimatedAmount: 350 })]) }));
    mount();
    await screen.findByLabelText('Resumen de garantía');
    expect(screen.getByLabelText('Resumen de garantía')).toHaveTextContent('S/ 650.00');
  });

  it('sin daños valorados en el expediente se pide el monto a retener a mano', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    mount();
    expect(await screen.findByLabelText('Monto a retener (S/)')).toBeInTheDocument();
    expect(screen.getByText(/no tiene daños valorados/)).toBeInTheDocument();
  });

  it('un daño técnico sin monto sigue abierto y se avisa', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos([dmg({ id: 'd2', origin: 'TECHNICAL', estimatedAmount: null })]) }));
    mount();
    expect(await screen.findByText(/sin monto del informe de Motrix/)).toBeInTheDocument();
  });

  it('INCIDENT_STILL_OPEN bloquea la garantia con mensaje de negocio (estado BLOCKED)', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: sinDanos() }));
    closeFinancialMock.mockRejectedValue(new ReturnCommandError(422, { code: 'INCIDENT_STILL_OPEN' }));
    mount();

    await screen.findByLabelText('Resumen de garantía');
    await confirmDialog();

    expect((await screen.findAllByRole('alert')).some((a) => /Garantía bloqueada/.test(a.textContent ?? ''))).toBe(true);
    expect(screen.getByRole('button', { name: 'Confirmar liberación de garantía' })).toBeDisabled();
  });

  it('daño grave: el plazo de 24 h no aplica', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos([dmg({ id: 'd9', origin: 'TECHNICAL', severity: 'GRAVE', estimatedAmount: 500, externalReportReference: 'MTX-9' })]) }));
    mount();
    expect(await screen.findByText(/el plazo normal de 24 h no aplica/)).toBeInTheDocument();
  });

  it('un monto retenido mayor a la garantia se limita a la garantia y muestra el saldo a cobrar', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos([dmg({ origin: 'TECHNICAL', severity: 'MODERADO', estimatedAmount: 1500, externalReportReference: 'MTX-1' })]) }));
    mount();
    await screen.findByLabelText('Resumen de garantía');
    expect(screen.getByText(/Saldo adicional a cobrar al cliente/)).toBeInTheDocument();
    expect(screen.getByLabelText('Resumen de garantía')).toHaveTextContent('S/ 0.00');
  });

  it('un alquiler de origen sin garantia registrada no permite confirmar', async () => {
    getRentalMock.mockResolvedValue({ id: 'rent-1', branchId: 'b1', deposit: null });
    flowMock.mockReturnValue(makeFlow({ ret: sinDanos() }));
    mount();
    expect(await screen.findByText(/no tiene garantía registrada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar liberación de garantía' })).toBeDisabled();
  });

  it('sin garantia (conductor de la empresa): lo indica, no ofrece montos y continua al cierre con 0/0', async () => {
    getRentalMock.mockResolvedValue({ id: 'rent-1', branchId: 'b1', deposit: null, depositRequired: false });
    flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ status: 'SIN_DANOS', receivedAt: new Date().toISOString(), depositRequired: false }) }));
    closeFinancialMock.mockResolvedValue(makeReturn({ status: 'CIERRE_FINANCIERO' }));
    mount();
    expect(await screen.findByTestId('no-deposit-banner')).toHaveTextContent('Sin garantía (conductor de la empresa)');
    expect(screen.queryByLabelText('Resumen de garantía')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar liberación de garantía' })).not.toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'Continuar al cierre (sin garantía)' });
    await waitFor(() => expect(next).toBeEnabled());
    fireEvent.click(next);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(closeFinancialMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, 0, 0, undefined));
  });

  it('sin garantia no pide monto manual aunque haya daños sin valorar', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos([], { depositRequired: false }) }));
    mount();
    await screen.findByTestId('no-deposit-banner');
    expect(screen.queryByLabelText(/Monto a retener/)).not.toBeInTheDocument();
  });

  it('RETURN_NO_DEPOSIT_TO_SETTLE se traduce a lenguaje de negocio', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: sinDanos() }));
    closeFinancialMock.mockRejectedValue(new ReturnCommandError(422, { code: 'RETURN_NO_DEPOSIT_TO_SETTLE' }));
    mount();
    await screen.findByText('Sin descuentos — sin daños encontrados');
    await confirmDialog();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Sin garantía \(conductor de la empresa\)/);
  });

  it('muestra la tarjeta informativa de cargo sugerido por retraso', async () => {
    const latenessCharge = {
      tier: 'EXTRA_121_300' as const, basis: 'RECEIVED' as const, informational: true as const, timeChargePercent: 50, guaranteePenaltyPercent: 30,
      dailyRate: '200.00', guaranteeAmount: '1000.00', currency: 'PEN', suggestedTimeCharge: '100.00', suggestedGuaranteePenalty: '300.00',
      noticeAndPrepaymentVerified: false, severeBreach: false, severeBreachThresholdHours: 12,
    };
    flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ status: 'SIN_DANOS', receivedAt: new Date().toISOString(), latenessCharge }) }));
    mount();
    expect(await screen.findByTestId('lateness-charge-card')).toHaveTextContent('S/ 100.00');
    expect(screen.getByTestId('late-guarantee-penalty')).toHaveTextContent('S/ 300.00');
  });

  it('V-20: sin precio por línea en Flota el texto de combustible no se contradice con el panel de multa', async () => {
    flowMock.mockReturnValue(
      makeFlow({ ret: makeReturn({ status: 'SIN_DANOS', receivedAt: new Date().toISOString(), fuelLevelAtReturn: 'ONE_QUARTER', vehicleFuelPenaltyPerLine: null }) }),
    );
    mount();

    await screen.findByLabelText('Resumen de garantía');
    expect(screen.getByText(/el vehículo no tiene precio por línea en Flota: la multa no se calculó/)).toBeInTheDocument();
    expect(screen.queryByText(/sin multa por combustible: no hay líneas faltantes/)).not.toBeInTheDocument();
  });

  it('V-20: con precio por línea pero sin lecturas RNC no afirma que no hay líneas faltantes', async () => {
    flowMock.mockReturnValue(
      makeFlow({ ret: makeReturn({ status: 'SIN_DANOS', receivedAt: new Date().toISOString(), fuelLevelAtReturn: 'ONE_QUARTER', vehicleFuelPenaltyPerLine: 35 }) }),
    );
    mount();

    await screen.findByLabelText('Resumen de garantía');
    expect(screen.getByText(/la multa por líneas no se pudo calcular: falta la lectura del RNC/)).toBeInTheDocument();
    expect(screen.queryByText(/sin multa por combustible: no hay líneas faltantes/)).not.toBeInTheDocument();
  });

  it('descuenta la penalización por combustible registrada de la garantía (DEC-DEV-FUEL-PENALTY-001)', async () => {
    flowMock.mockReturnValue(
      makeFlow({
        ret: makeReturn({
          status: 'CON_DANOS',
          fuelLevelAtReturn: 'ONE_QUARTER',
          fuelPenalty: {
            amount: 150,
            notes: 'Faltan 3 líneas',
            registeredById: 'uid-admin',
            registeredAt: '2026-10-27T10:00:00Z',
          },
          damages: [dmg({ estimatedAmount: 200 })],
        }),
      }),
    );
    closeFinancialMock.mockResolvedValue(makeReturn({ status: 'CIERRE_FINANCIERO' }));
    mount();

    await screen.findByLabelText('Resumen de garantía');
    // Depósito 1000 - (daños 200 + combustible 150 = 350) => 650
    expect(screen.getByLabelText('Resumen de garantía')).toHaveTextContent('S/ 650.00');
    expect(screen.getByText('Penalización por combustible faltante')).toBeInTheDocument();
    expect(screen.getByTestId('fuel-penalty-registered-amount')).toHaveTextContent('S/ 150.00');

    await confirmDialog();
    await waitFor(() =>
      expect(closeFinancialMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, 650, 350, undefined),
    );
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: sinDanos() }));
    const { container } = mount();
    await screen.findByLabelText('Resumen de garantía');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ClosureScreen (DEV-10)', () => {
  const mount = () => renderReturnScreen('/devoluciones/ret-1/cierre', <ClosureScreen />, '/devoluciones/:id/cierre');
  const financial = () =>
    makeReturn({
      status: 'CIERRE_FINANCIERO',
      finalSettlementAmount: 1000,
      responsibilityDocument: { signerName: 'Maria Quispe', signerIsHolder: true },
    });

  it('cierra y archiva el expediente con confirmacion irreversible', async () => {
    const setRet = vi.fn();
    flowMock.mockReturnValue(makeFlow({ ret: financial(), setRet }));
    closeReturnMock.mockResolvedValue(makeReturn({ status: 'CERRADA' }));
    mount();

    const button = screen.getByRole('button', { name: 'Cerrar y archivar expediente' });
    expect(button).toBeEnabled();
    expect(screen.getByText(/Firmado por Maria Quispe \(titular\)/)).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toHaveTextContent('irreversible');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar expediente' }));

    await waitFor(() =>
      expect(closeReturnMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, {
        signatureData: undefined,
        generateWarrantyAct: false,
        notes: undefined,
      }),
    );
    expect(setRet).toHaveBeenCalled();
  });

  it('el acta de garantia es opcional y exige firma solo si el cliente la pide (BR-DEV-010)', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: financial() }));
    closeReturnMock.mockResolvedValue(makeReturn({ status: 'CERRADA' }));
    mount();

    fireEvent.click(screen.getByLabelText(/solicita el acta/));
    const button = screen.getByRole('button', { name: 'Cerrar y archivar expediente' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Firma/), { target: { value: 'Maria Quispe' } });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar expediente' }));
    await waitFor(() =>
      expect(closeReturnMock).toHaveBeenCalledWith(
        'tok',
        'ret-1',
        'c1',
        'b1',
        2,
        expect.objectContaining({ generateWarrantyAct: true, signatureData: 'Maria Quispe' }),
      ),
    );
  });

  it('INCIDENT_STILL_OPEN al cerrar se informa sin codigos tecnicos', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: financial() }));
    closeReturnMock.mockRejectedValue(new ReturnCommandError(422, { code: 'INCIDENT_STILL_OPEN' }));
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar y archivar expediente' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar expediente' }));
    expect((await screen.findAllByRole('alert')).some((a) => /Cierre bloqueado/.test(a.textContent ?? ''))).toBe(true);
    expect(screen.getByRole('button', { name: 'Cerrar y archivar expediente' })).toBeDisabled();
  });

  it('sin garantia no ofrece el acta de devolucion de garantia', () => {
    flowMock.mockReturnValue(makeFlow({ ret: { ...financial(), depositRequired: false } }));
    mount();
    expect(screen.getByTestId('no-deposit-banner')).toBeInTheDocument();
    expect(screen.queryByLabelText(/acta de devolución de garantía/)).not.toBeInTheDocument();
  });

  it('muestra quien firmo el documento de responsabilidad cuando no es el titular', () => {
    flowMock.mockReturnValue(
      makeFlow({
        ret: makeReturn({
          status: 'CIERRE_FINANCIERO',
          responsibilityDocument: { signerName: 'Pedro Soto', signerIsHolder: false, signerRelationToHolder: 'Hermano' },
        }),
      }),
    );
    mount();
    expect(screen.getByText(/Firmado por Pedro Soto \(no es el titular — Hermano\)/)).toBeInTheDocument();
  });

  it('una devolucion CERRADA se muestra en solo lectura', () => {
    flowMock.mockReturnValue(
      makeFlow({ ret: makeReturn({ status: 'CERRADA', closedAt: '2026-10-05T10:00:00Z', finalSettlementAmount: 900 }) }),
    );
    mount();
    expect(screen.getByRole('status')).toHaveTextContent('Expediente cerrado');
    expect(screen.queryByRole('button', { name: 'Cerrar y archivar expediente' })).not.toBeInTheDocument();
  });

  it('bloquea el cierre si hay cambios offline pendientes', () => {
    flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ ...financial(), hasPendingOfflineChanges: true }) }));
    mount();
    expect(screen.getByTestId('offline-changes-banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar y archivar expediente' })).toBeDisabled();
  });

  it('con daños exige aceptacion del informe mecanico antes de cerrar', async () => {
    const setRet = vi.fn();
    const returnWithDamages = makeReturn({
      ...financial(),
      damages: [dmg({ origin: 'TECHNICAL' })],
      mechanicReportAccepted: false,
    });
    flowMock.mockReturnValue(makeFlow({ ret: returnWithDamages, setRet }));
    recordMechanicReportMock.mockResolvedValue({ ...returnWithDamages, mechanicReportAccepted: true });
    mount();

    expect(screen.getByTestId('mechanic-report-section')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar y archivar expediente' })).toBeDisabled();

    fireEvent.click(screen.getByTestId('mechanic-report-accept-btn'));
    await waitFor(() =>
      expect(recordMechanicReportMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, {
        accepted: true,
        observation: 'Aceptado por el cliente',
      }),
    );
    expect(setRet).toHaveBeenCalled();
  });

  it('permite anotar escalacion legal abriendo modal y registrando motivo', async () => {
    const setRet = vi.fn();
    flowMock.mockReturnValue(makeFlow({ ret: financial(), setRet }));
    escalateLegalMock.mockResolvedValue({
      ...financial(),
      legalEscalatedAt: '2026-10-23T15:00:00Z',
      legalEscalationReason: 'Negativa de pago de franquicia',
      legalCaseNumber: 'EXP-1234',
    });
    mount();

    fireEvent.click(screen.getByTestId('open-legal-escalation-modal-btn'));
    const dialog = screen.getByRole('dialog', { name: 'Anotar escalación legal' });
    expect(dialog).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('legal-reason-input'), { target: { value: 'Negativa de pago de franquicia' } });
    fireEvent.change(screen.getByTestId('legal-case-number-input'), { target: { value: 'EXP-1234' } });

    fireEvent.click(screen.getByTestId('submit-legal-escalation-btn'));
    await waitFor(() =>
      expect(escalateLegalMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, {
        reason: 'Negativa de pago de franquicia',
        legalCaseNumber: 'EXP-1234',
      }),
    );
    expect(setRet).toHaveBeenCalled();
  });

  it('muestra banner si el expediente ya fue escalado a legal', () => {
    flowMock.mockReturnValue(
      makeFlow({
        ret: makeReturn({
          ...financial(),
          legalEscalatedAt: '2026-10-23T15:00:00Z',
          legalEscalationReason: 'Apropiación ilícita',
          legalCaseNumber: 'CASO-99',
        }),
      }),
    );
    mount();
    expect(screen.getByTestId('legal-escalated-banner')).toHaveTextContent('Expediente escalado a Legal');
    expect(screen.getByTestId('legal-escalated-banner')).toHaveTextContent('Caso N° CASO-99');
    expect(screen.getByTestId('legal-escalated-banner')).toHaveTextContent('Apropiación ilícita');
  });

  it('muestra aviso si la notificación al titular ausente está pendiente y permite registrarla vía modal (SC-DEV-004.01)', async () => {
    const setRet = vi.fn();
    flowMock.mockReturnValue(
      makeFlow({
        ret: makeReturn({
          ...financial(),
          holderNotification: {
            pending: true,
            sent: false,
            sentAt: null,
            sentBy: null,
            channel: null,
            observations: null,
          },
        }),
        setRet,
      }),
    );
    recordHolderNotificationMock.mockResolvedValue({
      ...financial(),
      holderNotification: {
        pending: false,
        sent: true,
        sentAt: '2026-10-27T10:00:00Z',
        sentBy: 'Asesor Juan',
        channel: 'WHATSAPP',
        observations: 'Se notificó por WhatsApp con fotos adjuntas.',
      },
    });
    mount();

    expect(screen.getByTestId('holder-notification-pending-banner')).toHaveTextContent(
      'Notificación formal al titular ausente pendiente de registro',
    );

    fireEvent.click(screen.getByTestId('open-holder-notification-modal-btn'));
    const dialog = screen.getByRole('dialog', { name: 'Registrar notificación formal al titular ausente' });
    expect(dialog).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('notify-channel-select'), { target: { value: 'WHATSAPP' } });
    fireEvent.change(screen.getByTestId('notified-by-input'), { target: { value: 'Asesor Juan' } });
    fireEvent.change(screen.getByTestId('notify-obs-input'), { target: { value: 'Se notificó por WhatsApp con fotos adjuntas.' } });

    fireEvent.click(screen.getByTestId('submit-holder-notification-btn'));
    await waitFor(() =>
      expect(recordHolderNotificationMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, {
        channel: 'WHATSAPP',
        contactedAt: expect.any(String),
        notifiedBy: 'Asesor Juan',
        observations: 'Se notificó por WhatsApp con fotos adjuntas.',
      }),
    );
    expect(setRet).toHaveBeenCalled();
  });

  it('muestra banner de éxito cuando la notificación al titular ausente ya fue registrada', () => {
    flowMock.mockReturnValue(
      makeFlow({
        ret: makeReturn({
          ...financial(),
          holderNotification: {
            pending: false,
            sent: true,
            sentAt: '2026-10-27T10:00:00Z',
            sentBy: 'Asesor Juan',
            channel: 'WHATSAPP',
            observations: 'Confirmó recepción de acta',
          },
        }),
      }),
    );
    mount();
    expect(screen.getByTestId('holder-notification-sent-banner')).toHaveTextContent(
      'Notificación formal al titular registrada el',
    );
    expect(screen.getByTestId('holder-notification-sent-banner')).toHaveTextContent('WHATSAPP');
    expect(screen.getByTestId('holder-notification-sent-banner')).toHaveTextContent('Asesor Juan');
    expect(screen.getByTestId('holder-notification-sent-banner')).toHaveTextContent('Confirmó recepción de acta');
  });

  it('muestra banner de advertencia cuando la identidad fue no conforme (DEC-DEV-LEGAL-001)', async () => {
    flowMock.mockReturnValue(
      makeFlow({
        ret: makeReturn({
          ...financial(),
          identityVerification: {
            verified: true,
            documentType: 'DNI',
            documentNumber: '88776655',
            matchesHolder: false,
            result: 'NO_CONFORME',
            observation: 'DNI con holograma alterado',
            verifiedAt: '2026-10-27T10:00:00Z',
            verifiedBy: 'Operador Carlos',
          },
        }),
      }),
    );
    mount();

    expect(await screen.findByTestId('identity-not-conforme-banner')).toHaveTextContent(
      'Advertencia de Identidad: No Conforme',
    );
    expect(screen.getByTestId('identity-not-conforme-banner')).toHaveTextContent('DNI: 88776655');
    expect(screen.getByTestId('identity-not-conforme-banner')).toHaveTextContent('DNI con holograma alterado');
    expect(screen.getByTestId('identity-not-conforme-banner')).toHaveTextContent('DEC-DEV-LEGAL-001');

    expect(screen.getByTestId('identity-verification-summary')).toHaveTextContent('DNI 88776655 (tercero)');
    expect(screen.getByTestId('identity-verification-summary')).toHaveTextContent('NO_CONFORME');
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: financial() }));
    const { container } = mount();
    expect(await axe(container)).toHaveNoViolations();
  });
});
