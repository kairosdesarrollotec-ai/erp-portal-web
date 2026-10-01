import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRolePermissions } from './useRolePermissions';
import { useWorkSession } from './useWorkSession';
import type { WorkerRole } from '../dashboard/worker-role';

vi.mock('./useWorkSession');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseWorkSession = useWorkSession as any;

function withRole(role: WorkerRole | null) {
  mockUseWorkSession.mockImplementation(
    (selector: (s: { role: WorkerRole | null }) => WorkerRole | null) => selector({ role }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useRolePermissions — FLEET', () => {
  it('GERENCIA puede WRITE y READ', () => {
    withRole('GERENCIA');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('FLEET', 'WRITE')).toBe(true);
    expect(result.current.can('FLEET', 'READ')).toBe(true);
  });

  it('FINANZAS puede READ pero no WRITE', () => {
    withRole('FINANZAS');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('FLEET', 'READ')).toBe(true);
    expect(result.current.can('FLEET', 'WRITE')).toBe(false);
  });

  it('RRHH no puede ninguna acción de FLEET', () => {
    withRole('RRHH');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('FLEET', 'READ')).toBe(false);
    expect(result.current.can('FLEET', 'WRITE')).toBe(false);
  });
});

describe('useRolePermissions — CUSTOMER', () => {
  it('FRONT_OFFICE puede WRITE y READ', () => {
    withRole('FRONT_OFFICE');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('CUSTOMER', 'WRITE')).toBe(true);
    expect(result.current.can('CUSTOMER', 'READ')).toBe(true);
  });

  it('CAMPO puede READ pero no WRITE', () => {
    withRole('CAMPO');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('CUSTOMER', 'READ')).toBe(true);
    expect(result.current.can('CUSTOMER', 'WRITE')).toBe(false);
  });

  it('RRHH no puede ninguna acción de CUSTOMER', () => {
    withRole('RRHH');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('CUSTOMER', 'READ')).toBe(false);
    expect(result.current.can('CUSTOMER', 'WRITE')).toBe(false);
  });
});

describe('useRolePermissions — INQUIRY', () => {
  it('FRONT_OFFICE puede REGISTER, QUOTE, CLOSE, CONVERT y READ', () => {
    withRole('FRONT_OFFICE');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('INQUIRY', 'REGISTER')).toBe(true);
    expect(result.current.can('INQUIRY', 'QUOTE')).toBe(true);
    expect(result.current.can('INQUIRY', 'CLOSE')).toBe(true);
    expect(result.current.can('INQUIRY', 'CONVERT')).toBe(true);
    expect(result.current.can('INQUIRY', 'READ')).toBe(true);
  });

  it('AUDITORIA puede READ pero no acciones de escritura', () => {
    withRole('AUDITORIA');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('INQUIRY', 'READ')).toBe(true);
    expect(result.current.can('INQUIRY', 'REGISTER')).toBe(false);
    expect(result.current.can('INQUIRY', 'CLOSE')).toBe(false);
  });

  it('CAMPO no puede ninguna acción de INQUIRY', () => {
    withRole('CAMPO');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('INQUIRY', 'READ')).toBe(false);
    expect(result.current.can('INQUIRY', 'REGISTER')).toBe(false);
  });
});

describe('useRolePermissions — RESERVATION', () => {
  it('FRONT_OFFICE puede READ_LIST, READ_DETAIL, CONFIRM y CANCEL_CUSTOMER_REQUESTED_CHANGE', () => {
    withRole('FRONT_OFFICE');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('RESERVATION', 'READ_LIST')).toBe(true);
    expect(result.current.can('RESERVATION', 'READ_DETAIL')).toBe(true);
    expect(result.current.can('RESERVATION', 'CONFIRM')).toBe(true);
    expect(result.current.can('RESERVATION', 'CANCEL_CUSTOMER_REQUESTED_CHANGE')).toBe(true);
  });

  it('GERENCIA puede CANCEL_NO_SHOW', () => {
    withRole('GERENCIA');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('RESERVATION', 'CANCEL_NO_SHOW')).toBe(true);
  });

  it('FRONT_OFFICE no puede CANCEL_NO_SHOW', () => {
    withRole('FRONT_OFFICE');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('RESERVATION', 'CANCEL_NO_SHOW')).toBe(false);
  });

  it('AUDITORIA puede READ pero no operacional', () => {
    withRole('AUDITORIA');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('RESERVATION', 'READ_LIST')).toBe(true);
    expect(result.current.can('RESERVATION', 'CONFIRM')).toBe(false);
    expect(result.current.can('RESERVATION', 'CANCEL_NO_SHOW')).toBe(false);
  });

  it('CAMPO no puede ninguna acción de RESERVATION', () => {
    withRole('CAMPO');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('RESERVATION', 'READ_LIST')).toBe(false);
    expect(result.current.can('RESERVATION', 'CONFIRM')).toBe(false);
  });
});

describe('useRolePermissions — PLATFORM_ADMIN y null', () => {
  it('PLATFORM_ADMIN puede todas las acciones', () => {
    withRole('PLATFORM_ADMIN');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('FLEET', 'WRITE')).toBe(true);
    expect(result.current.can('CUSTOMER', 'WRITE')).toBe(true);
    expect(result.current.can('INQUIRY', 'REGISTER')).toBe(true);
    expect(result.current.can('INQUIRY', 'CLOSE')).toBe(true);
    expect(result.current.can('RESERVATION', 'CANCEL_NO_SHOW')).toBe(true);
  });

  it('null (sin sesión) no puede ninguna acción', () => {
    withRole(null);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('FLEET', 'WRITE')).toBe(false);
    expect(result.current.can('CUSTOMER', 'READ')).toBe(false);
    expect(result.current.can('INQUIRY', 'READ')).toBe(false);
    expect(result.current.can('RESERVATION', 'READ_LIST')).toBe(false);
  });
});
