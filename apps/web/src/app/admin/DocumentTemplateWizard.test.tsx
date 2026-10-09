import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentTemplatesScreen } from './DocumentTemplatesScreen';
import type { TemplateResponse } from './document-templates-client';

/**
 * Tests adicionales del wizard de DocumentTemplateWizard.
 * Usa DocumentTemplatesScreen como host (el wizard se renderiza dentro de ella).
 */

const listTemplatesMock = vi.fn();
const createTemplateMock = vi.fn();
const requestUploadUrlMock = vi.fn();
const activateTemplateMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      email: 'admin@veloxrent.pe',
      getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
    },
  }),
}));

vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));

vi.mock('./document-templates-client', async () => {
  const actual = await vi.importActual<typeof import('./document-templates-client')>('./document-templates-client');
  return {
    ...actual,
    listTemplates: (...args: unknown[]) => listTemplatesMock(...args),
    createTemplate: (...args: unknown[]) => createTemplateMock(...args),
    requestUploadUrl: (...args: unknown[]) => requestUploadUrlMock(...args),
    activateTemplate: (...args: unknown[]) => activateTemplateMock(...args),
  };
});

const BASE_STATE = {
  companyId: 'c1',
  companyName: 'VeloxRent Perú S.A.C.',
  branchId: 'b1',
  branchName: 'Ayacucho — Sede Central',
};

function makeTemplate(overrides: Partial<TemplateResponse> = {}): TemplateResponse {
  return {
    id: 'tpl-draft',
    companyId: 'c1',
    type: 'RENTAL_CONTRACT',
    name: 'Plantilla Draft',
    version: null,
    status: 'DRAFT',
    documentUrl: null,
    documentFormat: null,
    effectiveFrom: null,
    createdAt: '2026-10-09T08:00:00Z',
    createdBy: 'admin@veloxrent.pe',
    ...overrides,
  };
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[{ pathname: '/admin/plantillas', state: BASE_STATE }]}
      >
        <Routes>
          <Route path="/admin/plantillas" element={<DocumentTemplatesScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openWizard() {
  listTemplatesMock.mockResolvedValue([]);
  renderScreen();
  await screen.findByText(/Sin plantilla de/i);
  fireEvent.click(screen.getByRole('button', { name: /Nueva plantilla/i }));
  await screen.findByRole('dialog', { name: /Nueva plantilla de documento/i });
}

describe('DocumentTemplateWizard', () => {
  beforeEach(() => {
    listTemplatesMock.mockReset();
    createTemplateMock.mockReset();
    requestUploadUrlMock.mockReset();
    activateTemplateMock.mockReset();
  });

  it('muestra el paso 1 al abrir con campos obligatorios', async () => {
    await openWizard();

    expect(screen.getByLabelText(/Tipo de plantilla/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre descriptivo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vigente desde/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar y continuar/i })).toBeInTheDocument();
  }, 15000);

  it('valida que el nombre es obligatorio (RHF+Zod)', async () => {
    await openWizard();

    // Submit without filling name
    fireEvent.click(screen.getByRole('button', { name: /Guardar y continuar/i }));

    await screen.findByText(/El nombre es obligatorio/i);
    expect(createTemplateMock).not.toHaveBeenCalled();
  });

  it('pasa al paso 2 después de crear el DRAFT exitosamente', async () => {
    createTemplateMock.mockResolvedValue(makeTemplate());
    await openWizard();

    fireEvent.change(screen.getByLabelText(/Nombre descriptivo/i), {
      target: { value: 'Contrato v2026-11' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y continuar/i }));

    expect(await screen.findByText('Paso 2 — Subir archivo')).toBeInTheDocument();
    // El success banner del draft creado debería aparecer
    expect(screen.getByText(/Borrador creado/i)).toBeInTheDocument();
  });

  it('muestra error de red en el paso 1', async () => {
    const { TemplateCommandError } = await import('./document-templates-client');
    createTemplateMock.mockRejectedValue(new TemplateCommandError(500));
    await openWizard();

    fireEvent.change(screen.getByLabelText(/Nombre descriptivo/i), {
      target: { value: 'Plantilla Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y continuar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo registrar/i);
    // Se mantiene en paso 1
    expect(screen.getByText('Paso 1 — Registrar metadatos')).toBeInTheDocument();
  });

  it('muestra la zona de drop de archivo en el paso 2', async () => {
    createTemplateMock.mockResolvedValue(makeTemplate());
    await openWizard();

    fireEvent.change(screen.getByLabelText(/Nombre descriptivo/i), {
      target: { value: 'Contrato v2026-11' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y continuar/i }));
    await screen.findByText('Paso 2 — Subir archivo');

    expect(screen.getByRole('button', { name: /Seleccionar archivo PDF o DOCX/i })).toBeInTheDocument();
    expect(screen.getByText(/PDF o DOCX · Máximo 20 MB/i)).toBeInTheDocument();
  });

  it('muestra los indicadores de paso correctamente', async () => {
    createTemplateMock.mockResolvedValue(makeTemplate());
    await openWizard();

    // Paso 1: indicadores visibles
    const stepBar = screen.getByRole('list', { name: /Progreso del wizard/i });
    expect(stepBar).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nombre descriptivo/i), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y continuar/i }));

    // Paso 2: el indicador de paso 1 debería estar marcado como "done"
    await screen.findByText('Paso 2 — Subir archivo');
    // Step 1 circle should show '✓'
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('el wizard se cierra con el botón X y limpia el estado', async () => {
    await openWizard();

    fireEvent.click(screen.getByRole('button', { name: /Cerrar wizard/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
