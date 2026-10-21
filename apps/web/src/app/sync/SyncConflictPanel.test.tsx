import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';

const resolveMock = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('./sync-client', async (orig) => ({
  ...(await orig<typeof import('./sync-client')>()),
  resolveSyncConflict: (...a: unknown[]) => resolveMock.fn(...a),
}));

import { SyncCommandError } from './sync-client';
import { SyncConflictPanel, type SyncConflictPanelProps } from './SyncConflictPanel';
import { makeConflict } from './sync-test-utils';

const GOOD_REASON = 'El servidor tiene la nota correcta';

function setup(over: Partial<SyncConflictPanelProps> = {}) {
  const props: SyncConflictPanelProps = {
    checklistType: 'ENTREGA',
    companyId: 'c1',
    branchId: 'b1',
    getIdToken: vi.fn().mockResolvedValue('tok'),
    conflicts: [makeConflict()],
    canResolve: true,
    onChanged: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
  const utils = render(<SyncConflictPanel {...props} />);
  return { props, ...utils };
}

function openDialog(label: string) {
  fireEvent.click(screen.getAllByRole('button', { name: label })[0]);
  return screen.getByRole('dialog');
}

function fillAndConfirm(reason = GOOD_REASON) {
  fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: reason } });
  fireEvent.click(screen.getByRole('checkbox'));
}

beforeEach(() => {
  resolveMock.fn.mockReset();
  resolveMock.fn.mockResolvedValue({ conflict: makeConflict({ status: 'RESOLVED' }), checklistStatus: 'SYNCED', serverConfirmedAt: '2026-10-19T16:00:00Z', openConflicts: 0 });
});

describe('SyncConflictPanel (TR-08 / ENTREGA-04 / DEV-04)', () => {
  it('muestra la tarjeta con «Tu versión» y «Versión del servidor» (campo, quién y cuándo en hora de Lima)', () => {
    setup();
    const card = screen.getByTestId('sync-conflict-card');
    expect(within(card).getByRole('heading', { name: /Conflicto en Entrega: Notas/ })).toBeInTheDocument();
    const mine = within(card).getByRole('group', { name: 'Tu versión (este dispositivo)' });
    const server = within(card).getByRole('group', { name: 'Versión del servidor' });
    expect(within(mine).getByText('Sin daños')).toBeInTheDocument();
    expect(within(mine).getByText('Ana Torres')).toBeInTheDocument();
    expect(within(server).getByText('Rayón en puerta')).toBeInTheDocument();
    expect(within(server).getByText('Carlos Ruiz')).toBeInTheDocument();
    expect(within(server).getByText('Campo')).toBeInTheDocument();
    expect(within(server).getByText('Cuándo')).toBeInTheDocument();
    expect(card).toHaveTextContent('SYNC-ERR-AB12CD34');
    expect(card).toHaveAttribute('tabindex', '0'); // cada tarjeta es un elemento de foco independiente
  });

  it('ofrece los tres botones, NINGUNO preseleccionado; Combinar deshabilitado si no hay canMerge', () => {
    setup();
    const group = screen.getByRole('group', { name: 'Elige qué versión conservar' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Conservar la mía', 'Conservar del servidor', 'Combinar']);
    for (const b of buttons) {
      expect(b).not.toHaveAttribute('aria-pressed');
      expect(b).not.toHaveAttribute('aria-checked');
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conservar la mía' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Combinar' })).toBeDisabled();
    expect(screen.getByText(/los datos chocan entre sí/)).toBeInTheDocument();
  });

  it('Combinar se habilita solo si canMerge (evidencias)', () => {
    setup({
      conflicts: [
        makeConflict({
          kind: 'EVIDENCE',
          key: 'FRONTAL#2',
          canMerge: true,
          localVersion: { clientCaptureId: 'a', zone: 'FRONTAL', slot: 2, type: 'PHOTO', contentHash: 'abcdef12'.padEnd(64, '0'), capturedBy: 'Ana', capturedAt: '2026-10-19T15:00:00Z', role: 'PRIMARY' },
          serverVersion: { clientCaptureId: 'b', zone: 'FRONTAL', slot: 2, type: 'PHOTO', contentHash: '12345678'.padEnd(64, '0'), capturedBy: 'Luis', capturedAt: '2026-10-19T14:00:00Z', role: 'PRIMARY' },
        }),
      ],
    });
    expect(screen.getByRole('button', { name: 'Combinar' })).toBeEnabled();
    expect(screen.getByRole('heading', { name: /Toma Frontal n\.º 2/ })).toBeInTheDocument();
    expect(screen.getByText(/huella abcdef12/)).toBeInTheDocument();
    expect(screen.getByText(/huella 12345678/)).toBeInTheDocument();
  });

  it('sin permiso de supervisor los botones quedan deshabilitados con una explicacion', () => {
    setup({ canResolve: false });
    for (const name of ['Conservar la mía', 'Conservar del servidor', 'Combinar']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(screen.getByText(/Solo un supervisor puede resolver/)).toBeInTheDocument();
  });

  it('elegir abre el modal de motivo; no se envia nada hasta motivo (10-500) + confirmacion explicita', async () => {
    const { props } = setup();
    const dialog = openDialog('Conservar del servidor');
    expect(within(dialog).getByText(/Vas a conservar la versión del servidor/)).toBeInTheDocument();
    const submit = within(dialog).getByRole('button', { name: 'Confirmar y resolver' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: 'corto' } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit).toBeDisabled(); // motivo < 10
    fireEvent.change(screen.getByLabelText('Motivo de la decisión'), { target: { value: GOOD_REASON } });
    expect(submit).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox')); // quita la confirmacion
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(resolveMock.fn).not.toHaveBeenCalled();

    fireEvent.click(submit);
    await waitFor(() => expect(resolveMock.fn).toHaveBeenCalledTimes(1));
    const [token, conflict, body, idem] = resolveMock.fn.mock.calls[0];
    expect(token).toBe('tok');
    expect(conflict).toMatchObject({ id: makeConflict().id, etag: '"1"' });
    expect(body).toEqual({ companyId: 'c1', branchId: 'b1', resolution: 'KEEP_SERVER', reason: GOOD_REASON, confirmed: true });
    expect(idem).toEqual(expect.any(String));
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
    expect(await screen.findByText(/El servidor confirmó la sincronización/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('el motivo se recorta y se limita a 500 caracteres', () => {
    setup();
    openDialog('Conservar la mía');
    const area = screen.getByLabelText('Motivo de la decisión');
    expect(area).toHaveAttribute('maxlength', '500');
    fireEvent.change(area, { target: { value: `   ${'a'.repeat(9)}   ` } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Confirmar y resolver' })).toBeDisabled(); // 9 tras recortar
  });

  it('cada boton envia su resolucion (KEEP_LOCAL, MERGE)', async () => {
    const mergeable = makeConflict({ canMerge: true });
    setup({ conflicts: [mergeable] });
    openDialog('Conservar la mía');
    fillAndConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y resolver' }));
    await waitFor(() => expect(resolveMock.fn.mock.calls[0][2].resolution).toBe('KEEP_LOCAL'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    openDialog('Combinar');
    fillAndConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y resolver' }));
    await waitFor(() => expect(resolveMock.fn.mock.calls[1][2].resolution).toBe('MERGE'));
  });

  it('Cancelar y Escape cierran el modal sin enviar', () => {
    setup();
    openDialog('Conservar la mía');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    openDialog('Conservar la mía');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(resolveMock.fn).not.toHaveBeenCalled();
  });

  it('un doble clic no envia dos veces', async () => {
    let release: (v: unknown) => void = () => undefined;
    resolveMock.fn.mockReturnValue(new Promise((r) => (release = r)));
    setup();
    openDialog('Conservar la mía');
    fillAndConfirm();
    const submit = screen.getByRole('button', { name: 'Confirmar y resolver' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(resolveMock.fn).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    release({ conflict: makeConflict(), checklistStatus: 'SYNC_CONFLICT', serverConfirmedAt: null, openConflicts: 1 });
    expect(await screen.findByText(/Quedan 1 por resolver/)).toBeInTheDocument();
  });

  it('412: avisa con lenguaje de negocio, cierra el modal y RECARGA los conflictos', async () => {
    resolveMock.fn.mockRejectedValue(new SyncCommandError(412, { code: 'SYNC_CONFLICT_VERSION_MISMATCH', detail: 'x' }));
    const { props } = setup();
    openDialog('Conservar la mía');
    fillAndConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y resolver' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/El conflicto cambió mientras lo revisabas/);
    expect(props.onChanged).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('409 ya resuelto: recarga; 422 de validacion: queda el modal con el mensaje', async () => {
    resolveMock.fn.mockRejectedValueOnce(new SyncCommandError(409, { code: 'SYNC_CONFLICT_ALREADY_RESOLVED' }));
    const { props } = setup();
    openDialog('Conservar la mía');
    fillAndConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y resolver' }));
    expect(await screen.findByText(/ya fue resuelto por otra persona/)).toBeInTheDocument();
    expect(props.onChanged).toHaveBeenCalledTimes(1);

    resolveMock.fn.mockRejectedValueOnce(new SyncCommandError(422, { code: 'SYNC_MERGE_NOT_ALLOWED' }));
    openDialog('Conservar del servidor');
    fillAndConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y resolver' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/«Combinar» no está disponible/);
    expect(props.onChanged).toHaveBeenCalledTimes(1);
  });

  it('403: mensaje de permiso, no revela el detalle tecnico', async () => {
    resolveMock.fn.mockRejectedValue(new SyncCommandError(403, { code: 'ROLE_NOT_ALLOWED', detail: 'matrix deny RENTAL.MANAGE_CONTRACT_TEMPLATES' }));
    setup();
    openDialog('Conservar la mía');
    fillAndConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y resolver' }));
    const alert = await within(await screen.findByRole('dialog')).findByRole('alert');
    expect(alert).toHaveTextContent('Tu rol no tiene permiso para esta acción.');
    expect(alert).not.toHaveTextContent('matrix');
  });

  it('sin conflictos no renderiza nada', () => {
    const { container } = setup({ conflicts: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it('accesibilidad: sin violaciones axe en la lista, con el modal abierto y sin permiso', async () => {
    const { container } = setup({ conflicts: [makeConflict(), makeConflict({ id: '22222222-2222-4222-8222-222222222222', key: 'fivDone', canMerge: true })] });
    expect(await axe(container)).toHaveNoViolations();
    openDialog('Conservar la mía');
    fillAndConfirm();
    expect(await axe(document.body)).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const second = setup({ canResolve: false });
    expect(await axe(second.container)).toHaveNoViolations();
  });

  it('teclado: el foco entra al modal y al resolver vuelve al encabezado del panel', async () => {
    setup();
    openDialog('Conservar la mía');
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    fillAndConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y resolver' }));
    const heading = await screen.findByRole('heading', { name: /Sincronización|Conflictos/ });
    await waitFor(() => expect(heading).toHaveFocus());
  });
});
