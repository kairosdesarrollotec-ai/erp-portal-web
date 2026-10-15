import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRolePermissions } from './useRolePermissions';
import { clearPermissions, setPermissions } from '../../test/permissions';

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

  it('CHANGE_VEHICLE se concede solo con RESERVATION.CHANGE_VEHICLE', () => {
    setPermissions(['RESERVATION.CHANGE_VEHICLE']);
    expect(renderHook(() => useRolePermissions()).result.current.can('RESERVATION', 'CHANGE_VEHICLE')).toBe(true);
    setPermissions(['RESERVATION.READ_DETAIL']);
    expect(renderHook(() => useRolePermissions()).result.current.can('RESERVATION', 'CHANGE_VEHICLE')).toBe(false);
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

// FLEET y CUSTOMER: migrados a la matriz ADM-02 en fase 4 (permisos dinamicos).
describe('useRolePermissions — FLEET (por permiso, fase 4)', () => {
  it('concede exactamente los permisos FLEET.* que trae /me/permissions', () => {
    setPermissions(['FLEET.READ', 'FLEET.WRITE']);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('FLEET', 'READ')).toBe(true);
    expect(result.current.can('FLEET', 'WRITE')).toBe(true);
  });

  it('solo lectura: puede READ pero no WRITE', () => {
    setPermissions(['FLEET.READ']);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('FLEET', 'READ')).toBe(true);
    expect(result.current.can('FLEET', 'WRITE')).toBe(false);
  });

  it('sin permisos FLEET: denegado por defecto', () => {
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('FLEET', 'READ')).toBe(false);
    expect(result.current.can('FLEET', 'WRITE')).toBe(false);
  });

  it('un permiso de otro modulo no otorga acceso a FLEET', () => {
    setPermissions(['INQUIRY.READ', 'CUSTOMER.WRITE']);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('FLEET', 'READ')).toBe(false);
  });
});

describe('useRolePermissions — CUSTOMER (por permiso, fase 4)', () => {
  it('concede exactamente los permisos CUSTOMER.* que trae /me/permissions', () => {
    setPermissions(['CUSTOMER.READ', 'CUSTOMER.WRITE']);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('CUSTOMER', 'READ')).toBe(true);
    expect(result.current.can('CUSTOMER', 'WRITE')).toBe(true);
  });

  it('solo lectura: puede READ pero no WRITE', () => {
    setPermissions(['CUSTOMER.READ']);
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('CUSTOMER', 'READ')).toBe(true);
    expect(result.current.can('CUSTOMER', 'WRITE')).toBe(false);
  });

  it('sin permisos CUSTOMER: denegado por defecto', () => {
    const { result } = renderHook(() => useRolePermissions());
    expect(result.current.can('CUSTOMER', 'READ')).toBe(false);
  });
});
