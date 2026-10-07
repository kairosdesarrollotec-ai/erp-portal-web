import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { RoleManagementPanel } from './RoleManagementPanel';

const createMock = vi.fn();
const renameMock = vi.fn();
const deactivateMock = vi.fn();
const clearMessagesMock = vi.fn();

const FRONT = { id: 'role-fo', name: 'Front Office', key: 'FRONT_OFFICE', isSystem: true, active: true, version: 2, assignmentCount: 3 };
const CUSTOM = { id: 'role-custom', name: 'Supervisor de flota', key: null, isSystem: false, active: true, version: 5, assignmentCount: 0 };

function makeManagement(overrides?: Partial<Parameters<typeof RoleManagementPanel>[0]['management']>) {
  return {
    busy: false,
    createError: null,
    renameError: null,
    roleError: null,
    notice: null,
    create: createMock,
    rename: renameMock,
    deactivate: deactivateMock,
    clearMessages: clearMessagesMock,
    ...overrides,
  };
}

describe('RoleManagementPanel (ADM-02) — accesibilidad axe', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue(true);
    renameMock.mockReset().mockResolvedValue(true);
    deactivateMock.mockReset().mockResolvedValue(undefined);
    clearMessagesMock.mockReset();
  });

  it('no tiene violaciones de accesibilidad en estado READY (lista de roles activos)', async () => {
    const { container } = render(
      <RoleManagementPanel roles={[FRONT, CUSTOM]} management={makeManagement()} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('no tiene violaciones de accesibilidad con el dialogo de renombrado abierto', async () => {
    const { container } = render(
      <RoleManagementPanel roles={[FRONT, CUSTOM]} management={makeManagement()} />,
    );

    // Abre el modo de renombrado inline
    fireEvent.click(screen.getByRole('button', { name: 'Renombrar rol Supervisor de flota' }));
    expect(screen.getByLabelText('Nuevo nombre del rol Supervisor de flota')).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('no tiene violaciones de accesibilidad con el dialogo de confirmacion de desactivacion abierto', async () => {
    const { container } = render(
      <RoleManagementPanel roles={[FRONT, CUSTOM]} management={makeManagement()} />,
    );

    // Abre la confirmacion de desactivacion
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar rol Supervisor de flota' }));
    expect(screen.getByRole('button', { name: 'Confirmar desactivación del rol Supervisor de flota' })).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });
});
