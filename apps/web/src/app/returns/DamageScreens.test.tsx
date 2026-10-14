import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { DamageSeverityScreen } from './DamageSeverityScreen';
import { CosmeticDamageScreen } from './CosmeticDamageScreen';
import { TechnicalDamageScreen } from './TechnicalDamageScreen';
import { makeFlow, makeReturn } from './test-utils';
import { renderReturnScreen } from './test-harness';
import { ReturnCommandError } from './returns-client';
import { loadDamageSelection, saveDamageSelection, EMPTY_DAMAGE_SELECTION } from './return-session-draft';
import { clearCosmeticTariffCache } from './useCosmeticTariff';
import { useWorkSession } from '../shared/useWorkSession';
import { roleRef, setPermissions } from '../../test/permissions';

// AppHeader monta GlobalSearch (react-query); estas pruebas no usan QueryClientProvider.
vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));

const RETURN_DAMAGE = [
  'RETURN.READ', 'RETURN.ASSESS_DAMAGE', 'RETURN.CHARGE_IMMOBILIZATION',
] as const;

const flowMock = vi.fn();
const assessDamageMock = vi.fn();
const chargeMock = vi.fn();
const tariffMock = vi.fn();

const TARIFF = [
  { code: 'CAPOT', name: 'Paño en el capot', pricePen: 200 },
  { code: 'TECHO', name: 'Paño parte del techo', pricePen: 180 },
];
const sel = (origin: 'AESTHETIC' | 'TECHNICAL', severity: 'LEVE' | 'MODERADO' | 'GRAVE', customerAcceptsCost: boolean | null = true) => ({
  ...EMPTY_DAMAGE_SELECTION,
  origin,
  severity,
  customerAcceptsCost,
});

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'user@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./useReturnFlow', () => ({ useReturnFlow: () => flowMock() }));
vi.mock('./returns-client', async () => {
  const actual = await vi.importActual<typeof import('./returns-client')>('./returns-client');
  return {
    ...actual,
    assessDamage: (...args: unknown[]) => assessDamageMock(...args),
    chargeImmobilization: (...args: unknown[]) => chargeMock(...args),
    getCosmeticTariff: (...args: unknown[]) => tariffMock(...args),
  };
});

const conDanos = () => makeReturn({ status: 'CON_DANOS' });
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

beforeEach(() => {
  [flowMock, assessDamageMock, chargeMock, tariffMock].forEach((m) => m.mockReset());
  tariffMock.mockResolvedValue(TARIFF);
  clearCosmeticTariffCache();
  sessionStorage.clear();
  useWorkSession.getState().setRole(null);
  setPermissions(RETURN_DAMAGE);
});

describe('DamageSeverityScreen (DEV-06)', () => {
  const mount = () => renderReturnScreen('/devoluciones/ret-1/dano', <DamageSeverityScreen />, '/devoluciones/:id/dano');

  it('exige origen y gravedad y deriva a DEV-07 (estetico)', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    mount();
    const next = screen.getByRole('button', { name: 'Continuar' });
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Estético/));
    fireEvent.click(screen.getByLabelText(/Leve/));
    expect(next).toBeDisabled(); // falta "¿El cliente acepta el costo?"
    fireEvent.click(screen.getByLabelText(/Sí, acepta el costo/));
    fireEvent.click(next);
    expect(await screen.findByText('pantalla estetico')).toBeInTheDocument();
    expect(loadDamageSelection('ret-1').customerAcceptsCost).toBe(true);
  });

  it('daño tecnico deriva a DEV-08', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    mount();
    fireEvent.click(screen.getByLabelText(/Técnico/));
    fireEvent.click(screen.getByLabelText(/Moderado/));
    fireEvent.click(screen.getByLabelText(/No acepta el costo/));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('pantalla tecnico')).toBeInTheDocument();
  });

  it('gravedad GRAVE exige confirmar la lista roja (BR-DEV-008) antes de continuar', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    mount();
    fireEvent.click(screen.getByLabelText(/Técnico/));
    fireEvent.click(screen.getByLabelText(/Grave/));
    expect(screen.queryByText('¿El cliente acepta el costo?')).not.toBeInTheDocument(); // GRAVE: siempre rojo
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/lista roja/)).toBeInTheDocument();
    expect(screen.queryByText('pantalla tecnico')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar daño grave' }));
    expect(await screen.findByText('pantalla tecnico')).toBeInTheDocument();
  });

  it('un expediente que no esta CON_DANOS no permite evaluar', () => {
    flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ status: 'SIN_DANOS' }) }));
    mount();
    expect(screen.getByText(/no está en evaluación de daños/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
  });

  it('un rol sin permiso (Front-office) ve el aviso y no puede continuar', () => {
    setPermissions(['RETURN.READ']); // Front-office: sin ASSESS_DAMAGE
    useWorkSession.getState().setRole(roleRef('FRONT_OFFICE'));
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    mount();
    expect(screen.getByText(/Solo Administración o Gerencia/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Estético/));
    fireEvent.click(screen.getByLabelText(/Leve/));
    fireEvent.click(screen.getByLabelText(/Sí, acepta el costo/));
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    const { container } = mount();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('CosmeticDamageScreen (DEV-07)', () => {
  const mount = () =>
    renderReturnScreen('/devoluciones/ret-1/dano/estetico', <CosmeticDamageScreen />, '/devoluciones/:id/dano/estetico');

  it('el tarifario sale del backend; el servidor fija el monto y se registra via assess-damage con customerAcceptsCost', async () => {
    saveDamageSelection('ret-1', sel('AESTHETIC', 'LEVE', null));
    const refresh = vi.fn().mockResolvedValue(undefined);
    flowMock.mockReturnValue(makeFlow({ ret: conDanos(), refresh }));
    assessDamageMock.mockResolvedValue({
      id: 'dmg-1',
      returnId: 'ret-1',
      origin: 'AESTHETIC',
      severity: 'LEVE',
      damagedZone: 'CAPOT',
      estimatedAmount: 200,
      customerRiskStatus: 'AMBAR',
      createdAt: 'x',
    });
    mount();

    expect(screen.getByRole('button', { name: 'Continuar a garantía' })).toBeDisabled();
    await waitFor(() => expect(tariffMock).toHaveBeenCalledWith('tok', 'c1', 'b1'));
    fireEvent.change(await screen.findByLabelText('Paño del tarifario'), { target: { value: 'CAPOT' } });
    expect(screen.getByText(/Monto del tarifario: S\/\s?200\.00/)).toBeInTheDocument();
    const register = screen.getByRole('button', { name: 'Registrar daño estético' });
    expect(register).toBeDisabled(); // falta "¿El cliente acepta el costo?"
    fireEvent.click(screen.getByLabelText(/Sí, acepta el costo/));
    fireEvent.click(register);

    await waitFor(() =>
      expect(assessDamageMock).toHaveBeenCalledWith(
        'tok',
        'ret-1',
        'c1',
        'b1',
        2,
        expect.objectContaining({ origin: 'AESTHETIC', severity: 'LEVE', damagedZone: 'CAPOT', customerAcceptsCost: true }),
      ),
    );
    expect(assessDamageMock.mock.calls[0][5]).not.toHaveProperty('estimatedAmount');
    expect(await screen.findByText(/Semáforo del cliente: Ámbar/)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it('los daños registrados salen del expediente (ret.damages), no de la sesion', () => {
    flowMock.mockReturnValue(
      makeFlow({
        ret: makeReturn({
          status: 'CON_DANOS',
          damages: [
            { id: 'd1', returnId: 'ret-1', origin: 'AESTHETIC', severity: 'LEVE', damagedZone: 'CAPOT', estimatedAmount: 200, customerRiskStatus: 'AMBAR', createdAt: 'x' },
          ],
        }),
      }),
    );
    saveDamageSelection('ret-1', sel('AESTHETIC', 'LEVE'));
    mount();
    expect(screen.getByLabelText('Daños y cargos registrados')).toHaveTextContent('S/ 200.00');
    expect(screen.getByRole('button', { name: 'Continuar a garantía' })).toBeEnabled();
  });

  it('GRAVE no pregunta si el cliente acepta el costo ni lo envia', async () => {
    saveDamageSelection('ret-1', sel('AESTHETIC', 'GRAVE', null));
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    assessDamageMock.mockResolvedValue({ id: 'd', returnId: 'ret-1', origin: 'AESTHETIC', severity: 'GRAVE', customerRiskStatus: 'ROJO', createdAt: 'x' });
    mount();
    fireEvent.change(await screen.findByLabelText('Paño del tarifario'), { target: { value: 'TECHO' } });
    expect(screen.queryByText('¿El cliente acepta el costo?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar daño estético' }));
    await waitFor(() => expect(assessDamageMock).toHaveBeenCalled());
    expect(assessDamageMock.mock.calls[0][5]).not.toHaveProperty('customerAcceptsCost');
    expect(await screen.findByText(/Semáforo del cliente: Rojo/)).toBeInTheDocument();
  });

  it('si el tarifario no carga se avisa y se puede reintentar', async () => {
    saveDamageSelection('ret-1', sel('AESTHETIC', 'LEVE'));
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    tariffMock.mockRejectedValueOnce(new Error('red'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el tarifario');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(tariffMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('option', { name: /Paño en el capot/ })).toBeInTheDocument();
  });

  it('un paño desconocido para el backend se informa en lenguaje de negocio', async () => {
    saveDamageSelection('ret-1', sel('AESTHETIC', 'LEVE'));
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    assessDamageMock.mockRejectedValue(new ReturnCommandError(422, { code: 'UNKNOWN_COSMETIC_ZONE' }));
    mount();
    fireEvent.change(await screen.findByLabelText('Paño del tarifario'), { target: { value: 'TECHO' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar daño estético' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no está en el tarifario oficial');
  });

  it('sin gravedad clasificada pide volver a DEV-06', () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    mount();
    expect(screen.getByText(/Primero clasifica la gravedad/)).toBeInTheDocument();
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    saveDamageSelection('ret-1', sel('AESTHETIC', 'LEVE'));
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    const { container } = mount();
    await screen.findByRole('option', { name: /Paño en el capot/ });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('TechnicalDamageScreen (DEV-08)', () => {
  const mount = () =>
    renderReturnScreen('/devoluciones/ret-1/dano/tecnico', <TechnicalDamageScreen />, '/devoluciones/:id/dano/tecnico');
  beforeEach(() => saveDamageSelection('ret-1', sel('TECHNICAL', 'MODERADO')));

  it('exige referencia y monto del informe de Motrix y la respuesta del cliente; no hay tarifario', async () => {
    saveDamageSelection('ret-1', sel('TECHNICAL', 'MODERADO', null));
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    assessDamageMock.mockResolvedValue({
      id: 'dmg-2',
      returnId: 'ret-1',
      origin: 'TECHNICAL',
      severity: 'MODERADO',
      estimatedAmount: 1500,
      externalReportReference: 'MTX-77',
      customerRiskStatus: 'NORMAL',
      createdAt: 'x',
    });
    mount();

    const button = screen.getByRole('button', { name: 'Registrar daño técnico' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Referencia del informe'), { target: { value: 'MTX-77' } });
    fireEvent.change(screen.getByLabelText('Monto del informe (S/)'), { target: { value: '1500' } });
    expect(button).toBeDisabled(); // falta "¿El cliente acepta el costo?"
    fireEvent.click(screen.getByLabelText(/No acepta el costo/));
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() =>
      expect(assessDamageMock).toHaveBeenCalledWith(
        'tok',
        'ret-1',
        'c1',
        'b1',
        2,
        expect.objectContaining({
          origin: 'TECHNICAL',
          externalReportReference: 'MTX-77',
          estimatedAmount: 1500,
          customerAcceptsCost: false,
        }),
      ),
    );
    expect(await screen.findByText(/Semáforo del cliente: Sin observación/)).toBeInTheDocument();
  });

  it('antes de 24 h no se puede cobrar paralizacion', () => {
    flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ status: 'CON_DANOS', receivedAt: hoursAgo(1) }) }));
    mount();
    expect(screen.getByText(/Aún no corresponde/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aplicar cargo por paralización' })).toBeDisabled();
  });

  it('pasadas 24 h aplica el cargo vinculado al ultimo daño tecnico, sin pedir tarifa, y muestra la tarifa del servidor', async () => {
    const withDamage = makeReturn({
      status: 'CON_DANOS',
      receivedAt: hoursAgo(50),
      damages: [{ id: 'dmg-2', returnId: 'ret-1', origin: 'TECHNICAL', severity: 'MODERADO', estimatedAmount: 1500, externalReportReference: 'MTX-77', createdAt: 'x' }],
    });
    const refresh = vi.fn().mockResolvedValue(undefined);
    flowMock.mockReturnValue(makeFlow({ ret: withDamage, refresh }));
    chargeMock.mockResolvedValue({ id: 'chg-1', returnId: 'ret-1', daysCharged: 2, dailyRate: 120, totalAmount: 240, createdAt: 'x' });
    mount();

    expect(screen.getByText(/se cobran como alquiler/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Tarifa diaria del contrato (S/)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar cargo por paralización' }));

    await waitFor(() =>
      expect(chargeMock).toHaveBeenCalledWith('tok', 'ret-1', 'c1', 'b1', 2, { damageId: 'dmg-2', daysCharged: 2 }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('muestra la tarifa y el total del ultimo cargo que devuelve el expediente', () => {
    flowMock.mockReturnValue(
      makeFlow({
        ret: makeReturn({
          status: 'CON_DANOS',
          receivedAt: hoursAgo(50),
          immobilizationCharges: [{ id: 'c1', returnId: 'ret-1', daysCharged: 2, dailyRate: 120, totalAmount: 240, createdAt: 'x' }],
        }),
      }),
    );
    mount();
    expect(screen.getByText(/Último cargo: 2 día\(s\) × S\/\s?120\.00 = S\/\s?240\.00/)).toBeInTheDocument();
  });

  it('el 422 de paralizacion se explica en lenguaje de negocio', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: makeReturn({ status: 'CON_DANOS', receivedAt: hoursAgo(50) }) }));
    chargeMock.mockRejectedValue(new ReturnCommandError(422, { code: 'IMMOBILIZATION_PERIOD_NOT_ELAPSED' }));
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar cargo por paralización' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no han pasado 24 horas');
  });

  it('no tiene violaciones de accesibilidad (axe)', async () => {
    flowMock.mockReturnValue(makeFlow({ ret: conDanos() }));
    const { container } = mount();
    expect(await axe(container)).toHaveNoViolations();
  });
});
