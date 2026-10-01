import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ContractTemplatesScreen } from './ContractTemplatesScreen';

const listContractTemplatesMock = vi.fn();
const createContractTemplateMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: { email: 'admin@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
  }),
}));

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
        {
          pathname: '/admin/plantillas-contrato',
          state: { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Sede Central' },
        },
      ]}
    >
      <Routes>
        <Route path="/admin/plantillas-contrato" element={<ContractTemplatesScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ContractTemplatesScreen', () => {
  beforeEach(() => {
    listContractTemplatesMock.mockReset();
    createContractTemplateMock.mockReset();
  });

  it('muestra la plantilla ACTIVE vigente y el historial', async () => {
    listContractTemplatesMock.mockResolvedValue([
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

    expect(await screen.findByText(/Version 2/)).toBeInTheDocument();
    expect(screen.getByText('Vigente')).toBeInTheDocument();
    expect(screen.getByText('Retirada')).toBeInTheDocument();
  });

  it('sin plantilla ACTIVE avisa que la formalizacion fallara', async () => {
    listContractTemplatesMock.mockResolvedValue([]);
    renderScreen();

    expect(await screen.findByText(/No hay una plantilla vigente configurada/)).toBeInTheDocument();
  });

  it('crea una nueva version pasando por el paso de confirmacion', async () => {
    listContractTemplatesMock
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
    fireEvent.click(screen.getByText('Crear nueva version'));
    fireEvent.click(screen.getByText('Confirmar nueva version'));

    await waitFor(() => {
      expect(createContractTemplateMock).toHaveBeenCalledWith('fake-id-token', 'c1', 'b1', 'RENTAL_CONTRACT');
    });
    expect(await screen.findByText(/Version 1/)).toBeInTheDocument();
  });

  it('muestra el error recuperable si la carga falla', async () => {
    listContractTemplatesMock.mockRejectedValue(new Error('network'));
    renderScreen();

    expect(await screen.findByText(/No pudimos cargar las plantillas/)).toBeInTheDocument();
  });
});
