import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { PauseVacancyControl } from './PauseVacancyControl';
import { RecruitmentCommandError } from './recruitment-client';
import { setPermissions } from '../../test/permissions';

const pauseMock = vi.fn();
const resumeMock = vi.fn();

vi.mock('../providers/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { getIdToken: vi.fn().mockResolvedValue('tok') } }),
}));
vi.mock('./recruitment-client', async () => {
  const actual = await vi.importActual<typeof import('./recruitment-client')>('./recruitment-client');
  return {
    ...actual,
    pauseVacancy: (...a: unknown[]) => pauseMock(...a),
    resumeVacancy: (...a: unknown[]) => resumeMock(...a),
  };
});

const ctx = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Central' };
const vacancy = (status: 'PUBLICADA' | 'PAUSADA' | 'NECESIDAD_REGISTRADA' | 'DECIDIDA') => ({
  id: 'v1', title: 'Mecánico', status, version: 3,
});

function setup(status: Parameters<typeof vacancy>[0]) {
  const onChanged = vi.fn();
  const onStale = vi.fn();
  render(<PauseVacancyControl vacancy={vacancy(status)} context={ctx} onChanged={onChanged} onStale={onStale} />);
  return { onChanged, onStale };
}

describe('PauseVacancyControl (REC-01/REC-02)', () => {
  beforeEach(() => {
    pauseMock.mockReset();
    resumeMock.mockReset();
    setPermissions(['RECRUITMENT.PUBLISH_VACANCY']);
  });

  it('solo se ofrece con PUBLISH_VACANCY y en estado Publicada o Pausada', () => {
    setPermissions(['RECRUITMENT.VIEW_VACANCY']);
    const { unmount } = render(
      <PauseVacancyControl vacancy={vacancy('PUBLICADA')} context={ctx} onChanged={vi.fn()} onStale={vi.fn()} />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    unmount();
    setPermissions(['RECRUITMENT.PUBLISH_VACANCY']);
    for (const status of ['NECESIDAD_REGISTRADA', 'DECIDIDA'] as const) {
      const r = render(<PauseVacancyControl vacancy={vacancy(status)} context={ctx} onChanged={vi.fn()} onStale={vi.fn()} />);
      expect(screen.queryByRole('button')).toBeNull();
      r.unmount();
    }
    setup('PAUSADA');
    expect(screen.getByRole('button', { name: 'Reanudar Mecánico' })).toBeInTheDocument();
  });

  it('pausa con confirmación, motivo opcional y If-Match de la versión', async () => {
    pauseMock.mockResolvedValue({ ...vacancy('PAUSADA'), version: 4 });
    const { onChanged } = setup('PUBLICADA');
    fireEvent.click(screen.getByRole('button', { name: 'Pausar Mecánico' }));
    const dialog = await screen.findByRole('dialog');
    expect(pauseMock).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Motivo (opcional)'), { target: { value: ' Sin presupuesto ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pausar vacante' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(pauseMock).toHaveBeenCalledWith('tok', 'v1', 3, { companyId: 'c1', branchId: 'b1' }, 'Sin presupuesto');
    expect(onChanged.mock.calls[0][0]).toMatchObject({ status: 'PAUSADA', version: 4 });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cancelar no llama al servidor', async () => {
    setup('PUBLICADA');
    fireEvent.click(screen.getByRole('button', { name: 'Pausar Mecánico' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(pauseMock).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('reanuda una vacante pausada', async () => {
    resumeMock.mockResolvedValue({ ...vacancy('PUBLICADA'), version: 4 });
    const { onChanged } = setup('PAUSADA');
    fireEvent.click(screen.getByRole('button', { name: 'Reanudar Mecánico' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByLabelText('Motivo (opcional)')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reanudar vacante' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(resumeMock).toHaveBeenCalledWith('tok', 'v1', 3, { companyId: 'c1', branchId: 'b1' });
  });

  it('un conflicto de versión avisa en lenguaje de negocio y pide recargar', async () => {
    pauseMock.mockRejectedValue(new RecruitmentCommandError(409, { code: 'VERSION_CONFLICT' }));
    const { onStale, onChanged } = setup('PUBLICADA');
    fireEvent.click(screen.getByRole('button', { name: 'Pausar Mecánico' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pausar vacante' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Otra persona modificó/);
    expect(onStale).toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('un 422 de dominio se explica sin mostrar códigos', async () => {
    pauseMock.mockRejectedValue(new RecruitmentCommandError(422, { code: 'VACANCY_NOT_PAUSABLE' }));
    setup('PUBLICADA');
    fireEvent.click(screen.getByRole('button', { name: 'Pausar Mecánico' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pausar vacante' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Solo se puede pausar una vacante publicada/);
  });
});
