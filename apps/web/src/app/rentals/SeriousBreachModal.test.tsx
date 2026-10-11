import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeriousBreachModal } from './SeriousBreachModal';
import type { SeriousBreachModalProps } from './SeriousBreachModal';
import type { RentalResponse } from './rentals-client';

const reportBreachMock = vi.fn();

vi.mock('./rentals-client', async () => {
  const actual = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
  return {
    ...actual,
    reportExtensionBreach: (...args: unknown[]) => reportBreachMock(...args),
  };
});

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { getIdToken: vi.fn().mockResolvedValue('fake-token') },
  }),
}));

const baseRental: RentalResponse = {
  id: 'rent-abc123de',
  organizationId: 'org-1',
  operatingCompanyId: 'c1',
  branchId: 'b1',
  inquiryId: null,
  reservationId: null,
  customerId: 'cust-1',
  customerName: 'Minera Los Andes S.A.C.',
  customerDocNumber: '20505050505',
  vehicleId: 'v1',
  vehiclePlate: 'D0Y-704',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Hilux 4x4',
  vehicleDepositMinimum: null,
  planCode: 'STANDARD',
  status: 'EXTENSION_PENDING',
  startAt: '2025-08-01T08:00:00.000Z',
  expectedEndAt: '2025-09-07T11:00:00.000Z',
  alcoholTestResult: null,
  createdAt: '2025-08-01T08:00:00.000Z',
  createdBy: 'uid-1',
  updatedAt: '2025-09-07T11:00:00.000Z',
  updatedBy: 'uid-1',
  version: 3,
  etag: '"3"',
  deposit: {
    id: 'dep-1',
    originalAmount: '1000.00',
    currency: 'USD',
    status: 'HELD',
    createdAt: '2025-08-01T08:00:00.000Z',
  },
};

function renderModal(overrides: Partial<SeriousBreachModalProps> = {}) {
  const props: SeriousBreachModalProps = {
    open: true,
    rental: baseRental,
    companyId: 'c1',
    branchId: 'b1',
    onSuccess: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<SeriousBreachModal {...props} />), props };
}

describe('SeriousBreachModal', () => {
  beforeEach(() => {
    reportBreachMock.mockReset();
  });

  it('muestra el título, la etiqueta BR-ALQ-013 y el nombre del cliente', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Registrar falta grave/i)).toBeInTheDocument();
    expect(screen.getByText('BR-ALQ-013')).toBeInTheDocument();
    expect(screen.getAllByText('Minera Los Andes S.A.C.').length).toBeGreaterThan(0);
  });

  it('muestra el importe de la garantía en depósito', () => {
    renderModal();
    expect(screen.getAllByText(/USD 1000\.00/).length).toBeGreaterThan(0);
  });

  it('muestra los 4 requisitos incumplidos', () => {
    renderModal();
    expect(screen.getByText(/Aviso con al menos 12 horas/i)).toBeInTheDocument();
    expect(screen.getByText(/Autorización formal de Gerencia/i)).toBeInTheDocument();
    expect(screen.getByText(/Pago del periodo adicional/i)).toBeInTheDocument();
    expect(screen.getByText(/Adenda de ampliación firmada/i)).toBeInTheDocument();
  });

  it('el botón CTA está deshabilitado si no hay checkbox ni observaciones', () => {
    renderModal();
    const cta = screen.getByRole('button', { name: /Confirmar falta grave/i });
    expect(cta).toBeDisabled();
  });

  it('el CTA se habilita solo cuando checkbox y observaciones están completos', () => {
    renderModal();
    const cta = screen.getByRole('button', { name: /Confirmar falta grave/i });

    fireEvent.click(screen.getByRole('checkbox'));
    expect(cta).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Observaciones de Gerencia/i), {
      target: { value: 'Cliente no contactado, vencimiento superado' },
    });
    expect(cta).not.toBeDisabled();
  });

  it('el CTA queda deshabilitado si hay checkbox pero observaciones vacías', () => {
    renderModal();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: /Confirmar falta grave/i })).toBeDisabled();
  });

  it('llama a reportExtensionBreach con los parámetros correctos al confirmar', async () => {
    reportBreachMock.mockResolvedValue({});
    const { props } = renderModal();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText(/Observaciones de Gerencia/i), {
      target: { value: 'Notas de prueba' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar falta grave/i }));

    await waitFor(() => {
      expect(reportBreachMock).toHaveBeenCalledWith(
        'fake-token',
        'rent-abc123de',
        'c1',
        'b1',
        3,
        'Notas de prueba',
      );
      expect(props.onSuccess).toHaveBeenCalledTimes(1);
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('muestra error inline en 409 sin cerrar el modal', async () => {
    const { RentalCommandError } = await vi.importActual<typeof import('./rentals-client')>('./rentals-client');
    reportBreachMock.mockRejectedValue(new RentalCommandError(409, { code: 'STATE_CONFLICT' }));
    const { props } = renderModal();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText(/Observaciones de Gerencia/i), {
      target: { value: 'Error esperado' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar falta grave/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/estado del expediente ha cambiado/i);
    });
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('muestra error genérico para fallas inesperadas', async () => {
    reportBreachMock.mockRejectedValue(new Error('Network error'));
    renderModal();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText(/Observaciones de Gerencia/i), {
      target: { value: 'Prueba de error' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar falta grave/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/No pudimos registrar/i);
    });
  });

  it('cierra el modal al hacer clic en Cancelar', () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra el modal al hacer clic en el botón X', () => {
    const { props } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Cerrar sin confirmar/i }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('muestra "—" como garantía cuando no hay depósito registrado', () => {
    renderModal({ rental: { ...baseRental, deposit: undefined } });
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
