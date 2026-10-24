import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HrDocumentsScreen } from './HrDocumentsScreen';
import { baseContext } from './hr-test-utils';
import { setPermissions } from '../../test/permissions';
import type { HrDocument } from './hr-client';

const listDocsMock = vi.fn();
const publishDocMock = vi.fn();
const confirmReadMock = vi.fn();

vi.mock('../shared/GlobalSearch/GlobalSearch', () => ({ GlobalSearch: () => null }));
vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { email: 'u@veloxrent.pe', getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('../notifications/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0, notifications: [], markRead: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./hr-client', async () => {
  const actual = await vi.importActual<typeof import('./hr-client')>('./hr-client');
  return {
    ...actual,
    listActiveHrDocuments: (...a: unknown[]) => listDocsMock(...a),
    publishHrDocument: (...a: unknown[]) => publishDocMock(...a),
    confirmHrDocumentRead: (...a: unknown[]) => confirmReadMock(...a),
  };
});

const mockDoc1: HrDocument = {
  id: 'doc-1',
  companyId: 'c1',
  code: 'RIT-01',
  title: 'Reglamento Interno de Trabajo 2026',
  category: 'REGULATION',
  version: 1,
  fileUrl: 'https://storage.veloxrent.pe/rit-2026.pdf',
  mimeType: 'application/pdf',
  isActive: true,
  publishedAt: '2026-01-01T00:00:00.000Z',
  publishedBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  hasRead: false,
  readAt: null,
};

const mockDoc2: HrDocument = {
  id: 'doc-2',
  companyId: 'c1',
  code: 'POL-SST',
  title: 'Política de Seguridad y Salud',
  category: 'POLICY',
  version: 2,
  fileUrl: 'https://storage.veloxrent.pe/pol-sst-v2.pdf',
  mimeType: 'application/pdf',
  isActive: true,
  publishedAt: '2026-02-01T00:00:00.000Z',
  publishedBy: 'user-1',
  createdAt: '2026-02-01T00:00:00.000Z',
  hasRead: true,
  readAt: '2026-02-15T10:00:00.000Z',
};

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/personal/documentos', state: baseContext }]}>
      <HrDocumentsScreen />
    </MemoryRouter>,
  );
}

describe('HrDocumentsScreen (HU-31 Documentación de Talento Humano)', () => {
  beforeEach(() => {
    listDocsMock.mockReset().mockResolvedValue([mockDoc1, mockDoc2]);
    publishDocMock.mockReset();
    confirmReadMock.mockReset();
    setPermissions([
      'HR_ADMINISTRATION.VIEW_HR_DOCUMENTS',
      'HR_ADMINISTRATION.CONFIRM_HR_DOCUMENT_READ',
      'HR_ADMINISTRATION.MANAGE_HR_DOCUMENTS',
    ]);
  });

  it('lista los documentos institucionales vigentes con su versión y categoría', async () => {
    renderScreen();
    expect(await screen.findByText('Reglamento Interno de Trabajo 2026')).toBeInTheDocument();
    expect(screen.getByText('Política de Seguridad y Salud')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('RIT-01')).toBeInTheDocument();
    expect(screen.getByText('POL-SST')).toBeInTheDocument();
  });

  it('muestra botón "Confirmar lectura" para documentos no leídos y estado confirmado para los ya leídos', async () => {
    renderScreen();
    expect(await screen.findByTestId('confirm-read-doc-1')).toBeInTheDocument();
    expect(screen.getByTestId('read-status-doc-2')).toHaveTextContent('Lectura confirmada');
  });

  it('permite al colaborador confirmar lectura de un documento', async () => {
    confirmReadMock.mockResolvedValue({
      documentId: 'doc-1',
      employeeId: 'emp-1',
      readAt: '2026-10-23T17:00:00.000Z',
    });

    renderScreen();
    const confirmBtn = await screen.findByTestId('confirm-read-doc-1');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(confirmReadMock).toHaveBeenCalledWith('tok', 'doc-1');
    });

    expect(await screen.findByTestId('read-status-doc-1')).toHaveTextContent('Lectura confirmada');
  });

  it('permite a Gerencia publicar un nuevo documento o nueva versión', async () => {
    publishDocMock.mockResolvedValue({
      id: 'doc-3',
      companyId: 'c1',
      code: 'FMT-VAC',
      title: 'Formato Único de Solicitud de Vacaciones',
      category: 'FORMAT',
      version: 1,
      fileUrl: 'https://storage.veloxrent.pe/fmt-vac.pdf',
      mimeType: 'application/pdf',
      isActive: true,
      publishedAt: '2026-10-23T00:00:00.000Z',
      publishedBy: 'user-1',
      hasRead: false,
      readAt: null,
    });

    renderScreen();
    expect(await screen.findByText('Publicar documento o nueva versión')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/código único/i), { target: { value: 'FMT-VAC' } });
    fireEvent.change(screen.getByLabelText(/título del documento/i), { target: { value: 'Formato Único de Solicitud de Vacaciones' } });
    fireEvent.change(screen.getByLabelText('Categoría *'), { target: { value: 'FORMAT' } });
    fireEvent.change(screen.getByLabelText(/url del archivo/i), { target: { value: 'https://storage.veloxrent.pe/fmt-vac.pdf' } });

    fireEvent.click(screen.getByTestId('publish-doc-button'));

    await waitFor(() => {
      expect(publishDocMock).toHaveBeenCalledWith('tok', {
        companyId: 'c1',
        code: 'FMT-VAC',
        title: 'Formato Único de Solicitud de Vacaciones',
        category: 'FORMAT',
        fileUrl: 'https://storage.veloxrent.pe/fmt-vac.pdf',
      });
    });
  });

  it('filtra por categoría', async () => {
    renderScreen();
    expect(await screen.findByText('Reglamento Interno de Trabajo 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Política' }));

    expect(screen.queryByText('Reglamento Interno de Trabajo 2026')).not.toBeInTheDocument();
    expect(screen.getByText('Política de Seguridad y Salud')).toBeInTheDocument();
  });
});
