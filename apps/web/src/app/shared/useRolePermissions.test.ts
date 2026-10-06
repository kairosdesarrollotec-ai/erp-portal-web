import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRolePermissions } from './useRolePermissions';
import { useWorkSession } from './useWorkSession';
import { clearPermissions, roleRef, setPermissions } from '../../test/permissions';

function withRole(key: string | null, name?: string) {
  useWorkSession.setState({ role: key === null && name === undefined ? null : roleRef(key, name) });
}

beforeEach(() => {
  clearPermissions();
});

// INQUIRY y RESERVATION: se evaluan por PERMISO (GET /me/permissions), no por rol.
describe('useRolePermissions — INQUIRY (por permiso)', () => {
  it('concede exactamente los permisos INQUIRY.* que trae /me/permissions', () => {
    setPermissions(['INQUIRY.READ', 'INQUIRY.REGISTER', 'INQUIRY.QUOTE', 'INQUIRY.CLOSE', 'INQUIRY.CONVERT_TO_RESERVATION']);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('INQUIRY', 'REGISTER')).toBe(true);
    expect(result.current.can('INQUIRY', 'QUOTE')).toBe(true);
    expect(result.current.can('INQUIRY', 'CLOSE')).toBe(true);
    expect(result.current.can('INQUIRY', 'CONVERT_TO_RESERVATION')).toBe(true);
    expect(result.current.can('INQUIRY', 'READ')).toBe(true);
  });

  it('solo lectura: puede READ pero no acciones de escritura', () => {
    setPermissions(['INQUIRY.READ']);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('INQUIRY', 'READ')).toBe(true);
    expect(result.current.can('INQUIRY', 'REGISTER')).toBe(false);
    expect(result.current.can('INQUIRY', 'CLOSE')).toBe(false);
  });

  it('un rol personalizado se comporta igual que uno de sistema con los mismos permisos', () => {
    withRole(null, 'Ejecutivo comercial');
    setPermissions(['INQUIRY.READ', 'INQUIRY.REGISTER']);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('INQUIRY', 'REGISTER')).toBe(true);
    expect(result.current.can('INQUIRY', 'CLOSE')).toBe(false);
  });
});

describe('useRolePermissions — RESERVATION (por permiso)', () => {
  it('concede solo las acciones presentes', () => {
    setPermissions(['RESERVATION.READ_LIST', 'RESERVATION.READ_DETAIL', 'RESERVATION.CONFIRM']);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('RESERVATION', 'READ_LIST')).toBe(true);
    expect(result.current.can('RESERVATION', 'READ_DETAIL')).toBe(true);
    expect(result.current.can('RESERVATION', 'CONFIRM')).toBe(true);
    expect(result.current.can('RESERVATION', 'CANCEL_NO_SHOW')).toBe(false);
    expect(result.current.can('RESERVATION', 'CANCEL_CUSTOMER_REQUESTED_CHANGE')).toBe(false);
  });

  it('un permiso de otro modulo con la misma accion no cuenta', () => {
    setPermissions(['RENTAL.CREATE', 'INQUIRY.CLOSE']);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('RESERVATION', 'CREATE')).toBe(false);
    expect(result.current.can('INQUIRY', 'CLOSE')).toBe(true);
  });
});

describe('useRolePermissions — estados de carga', () => {
  it('sin permisos cargados (idle) no concede nada', () => {
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('INQUIRY', 'READ')).toBe(false);
    expect(result.current.can('RESERVATION', 'READ_LIST')).toBe(false);
  });
});

// FLEET y CUSTOMER: el back todavia los autoriza por sets de roles (fase 4 los migra).
describe('useRolePermissions — FLEET y CUSTOMER (politica aislada por rol, TODO fase 4)', () => {
  it('FLEET: GERENCIA puede WRITE y READ; FINANZAS solo READ; RRHH nada', () => {
    withRole('GERENCIA');
    const gerencia = renderHook(() => useRolePermissions());
    expect(gerencia.result.current.can('FLEET', 'WRITE')).toBe(true);
    expect(gerencia.result.current.can('FLEET', 'READ')).toBe(true);

    withRole('FINANZAS');
    const finanzas = renderHook(() => useRolePermissions());
    expect(finanzas.result.current.can('FLEET', 'READ')).toBe(true);
    expect(finanzas.result.current.can('FLEET', 'WRITE')).toBe(false);

    withRole('RRHH');
    const rrhh = renderHook(() => useRolePermissions());
    expect(rrhh.result.current.can('FLEET', 'READ')).toBe(false);
  });

  it('CUSTOMER: FRONT_OFFICE puede WRITE y READ; CAMPO solo READ; RRHH nada', () => {
    withRole('FRONT_OFFICE');
    const fo = renderHook(() => useRolePermissions());
    expect(fo.result.current.can('CUSTOMER', 'WRITE')).toBe(true);
    expect(fo.result.current.can('CUSTOMER', 'READ')).toBe(true);

    withRole('CAMPO');
    const campo = renderHook(() => useRolePermissions());
    expect(campo.result.current.can('CUSTOMER', 'READ')).toBe(true);
    expect(campo.result.current.can('CUSTOMER', 'WRITE')).toBe(false);

    withRole('RRHH');
    const rrhh = renderHook(() => useRolePermissions());
    expect(rrhh.result.current.can('CUSTOMER', 'READ')).toBe(false);
  });

  it('un rol creado a mano (key null) no entra en ningun set: denegado hasta la fase 4', () => {
    withRole(null, 'Supervisor de flota');
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('FLEET', 'READ')).toBe(false);
    expect(result.current.can('CUSTOMER', 'WRITE')).toBe(false);
  });

  it('PLATFORM_ADMIN puede FLEET y CUSTOMER; sin rol en sesion no puede nada', () => {
    withRole('PLATFORM_ADMIN');
    const admin = renderHook(() => useRolePermissions());
    expect(admin.result.current.can('FLEET', 'WRITE')).toBe(true);
    expect(admin.result.current.can('CUSTOMER', 'WRITE')).toBe(true);

    clearPermissions();
    const none = renderHook(() => useRolePermissions());
    expect(none.result.current.can('FLEET', 'WRITE')).toBe(false);
    expect(none.result.current.can('CUSTOMER', 'READ')).toBe(false);
  });
});
