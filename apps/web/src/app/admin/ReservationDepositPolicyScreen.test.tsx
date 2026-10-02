import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReservationDepositPolicyScreen } from './ReservationDepositPolicyScreen';

const getReservationDepositPolicyMock = vi.fn();
const updateReservationDepositPolicyMock = vi.fn();
const listContractTemplatesMock = vi.fn();
const createContractTemplateMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'admin@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

vi.mock('./parameters-client', async () => {
  const actual = await vi.importActual<typeof import('./parameters-client')>('./parameters-client');
  return {
    ...actual,
    getReservationDepositPolicy: (...args: unknown[]) => getReservationDepositPolicyMock(...args),
    updateReservationDepositPolicy: (...args: unknown[]) => updateReservationDepositPolicyMock(...args),
  };
});

vi.mock('./contract-templates-client', async () => {
  const actual = await vi.importActual<typeof import('./contract-templates-client')>('./contract-templates-client');
  return {
    ...actual,
    listContractTemplates: (...args: unknown[]) => listContractTemplatesMock(...args),
    createContractTemplate: (...args: unknown[]) => createContractTemplateMock(...args),
  };
});

function renderScreen() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/admin/parametros', state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' } },
      ]}
    >
      <Routes>
        <Route path="/admin/parametros" element={<ReservationDepositPolicyScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReservationDepositPolicyScreen (ADM-03)', () => {
  beforeEach(() => {
    getReservationDepositPolicyMock.mockReset();
    updateReservationDepositPolicyMock.mockReset();
    // Fusion (oct 2026): esta pantalla ahora tambien carga plantillas de
    // contrato (ver comentario en el componente) - por defecto, sin
    // plantillas, para no afectar los tests que solo cubren el monto de
    // reserva.
    listContractTemplatesMock.mockReset().mockResolvedValue([]);
    createContractTemplateMock.mockReset();
  });

  it('muestra el monto vigente y el historial', async () => {
    getReservationDepositPolicyMock.mockResolvedValue({
      current: { version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null },
      history: [{ version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null }],
    });
    renderScreen();

    expect((await screen.findAllByText('S/ 300.00')).length).toBeGreaterThan(0);
    expect(screen.getByText(/valor por defecto/)).toBeInTheDocument();
  });

  it('cambia el monto pasando por el paso de confirmacion', async () => {
    getReservationDepositPolicyMock
      .mockResolvedValueOnce({
        current: { version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null },
        history: [{ version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null }],
      })
      .mockResolvedValueOnce({
        current: { version: 2, amount: '350.00', currency: 'PEN', effectiveFrom: '2026-09-23T12:00:00.000Z' },
        history: [
          { version: 2, amount: '350.00', currency: 'PEN', effectiveFrom: '2026-09-23T12:00:00.000Z' },
          { version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null },
        ],
      });
    updateReservationDepositPolicyMock.mockResolvedValue({ version: 2, amount: '350.00', currency: 'PEN', effectiveFrom: '2026-09-23T12:00:00.000Z' });
    renderScreen();

    await screen.findAllByText('S/ 300.00');
    fireEvent.click(screen.getByText('Cambiar'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '350.00' } });
    fireEvent.click(screen.getByText('Continuar'));

    expect(screen.getByText(/Vas a cambiar el monto de reserva/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirmar cambio'));

    await waitFor(() => {
      expect(updateReservationDepositPolicyMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', '350.00', 'PEN');
    });
    expect((await screen.findAllByText('S/ 350.00')).length).toBeGreaterThan(0);
  });

  it('muestra el error recuperable si la carga falla', async () => {
    getReservationDepositPolicyMock.mockRejectedValue(new Error('network'));
    renderScreen();

    expect(await screen.findByText(/No pudimos cargar los parámetros/)).toBeInTheDocument();
  });

  // Hallazgo Russbel (oct 2026): "Plantillas de contrato" vivia aparte,
  // sin forma real de entrar (ver comentario del componente) - se
  // fusiona en esta pantalla. Tests migrados de
  // ContractTemplatesScreen.test.tsx (eliminado).
  describe('plantillas de contrato (fusionado de ContractTemplatesScreen)', () => {
    function readyDepositPolicy() {
      getReservationDepositPolicyMock.mockResolvedValue({
        current: { version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null },
        history: [{ version: 1, amount: '300.00', currency: 'PEN', effectiveFrom: null }],
      });
    }

    it('muestra la plantilla ACTIVE vigente y el historial', async () => {
      readyDepositPolicy();
      listContractTemplatesMock.mockReset().mockResolvedValue([
        {
          id: 'tpl-2',
          companyId: 'c1',
          type: 'RENTAL_CONTRACT',
          version: 2,
          effectiveFrom: '2026-09-23T12:00:00.000Z',
          effectiveTo: null,
          status: 'ACTIVE',
          createdAt: '2026-09-23T12:00:00.000Z',
        },
        {
          id: 'tpl-1',
          companyId: 'c1',
          type: 'RENTAL_CONTRACT',
          version: 1,
          effectiveFrom: '2026-01-01T00:00:00.000Z',
          effectiveTo: '2026-09-23T12:00:00.000Z',
          status: 'RETIRED',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
      renderScreen();

      expect(await screen.findByText(/Versión 2/)).toBeInTheDocument();
      expect(screen.getByText('Vigente')).toBeInTheDocument();
      expect(screen.getByText('Retirada')).toBeInTheDocument();
    });

    it('sin plantilla ACTIVE avisa que la formalizacion fallara', async () => {
      readyDepositPolicy();
      listContractTemplatesMock.mockReset().mockResolvedValue([]);
      renderScreen();

      expect(await screen.findByText(/No hay una plantilla vigente configurada/)).toBeInTheDocument();
    });

    it('crea una nueva version pasando por el paso de confirmacion', async () => {
      readyDepositPolicy();
      listContractTemplatesMock
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'tpl-1',
            companyId: 'c1',
            type: 'RENTAL_CONTRACT',
            version: 1,
            effectiveFrom: '2026-09-23T12:00:00.000Z',
            effectiveTo: null,
            status: 'ACTIVE',
            createdAt: '2026-09-23T12:00:00.000Z',
          },
        ]);
      createContractTemplateMock.mockResolvedValue({
        id: 'tpl-1',
        companyId: 'c1',
        type: 'RENTAL_CONTRACT',
        version: 1,
        effectiveFrom: '2026-09-23T12:00:00.000Z',
        effectiveTo: null,
        status: 'ACTIVE',
        createdAt: '2026-09-23T12:00:00.000Z',
      });
      renderScreen();

      await screen.findByText(/No hay una plantilla vigente configurada/);
      fireEvent.click(screen.getByText('Crear nueva versión'));
      fireEvent.click(screen.getByText('Confirmar nueva versión'));

      await waitFor(() => {
        expect(createContractTemplateMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', 'RENTAL_CONTRACT');
      });
      expect(await screen.findByText('Vigente')).toBeInTheDocument();
    });
  });
});
