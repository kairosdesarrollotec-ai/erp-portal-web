import { describe, it, expect } from 'vitest';
import { canLegacyModule, canReturnAction } from './legacy-role-policy';
import { isPlatformAdminRole } from './role-ref';
import { roleRef } from '../../test/permissions';

describe('legacy-role-policy (TODO fase 4: migrar a permisos)', () => {
  it('Devoluciones: un rol creado a mano (key null) no esta en ningun set y queda denegado', () => {
    const custom = roleRef(null, 'Supervisor de patio');
    expect(canReturnAction(custom, 'CLOSE')).toBe(false);
    expect(canReturnAction(custom, 'UPLOAD_EVIDENCE')).toBe(false);
  });

  it('Devoluciones: renombrar un rol de sistema no cambia su politica (se decide por key, no por nombre)', () => {
    const renamed = roleRef('GERENCIA', 'Dirección General');
    expect(canReturnAction(renamed, 'RESOLVE_ALCOHOL_ESCALATION')).toBe(true);
  });

  it('Flota y Clientes: sin rol de sesion no se concede nada', () => {
    expect(canLegacyModule(null, 'FLEET', 'READ')).toBe(false);
    expect(canLegacyModule(null, 'CUSTOMER', 'WRITE')).toBe(false);
  });
});

describe('isPlatformAdminRole', () => {
  it('identifica solo al rol de sistema PLATFORM_ADMIN por su key estable', () => {
    expect(isPlatformAdminRole(roleRef('PLATFORM_ADMIN', 'Admin de plataforma'))).toBe(true);
    expect(isPlatformAdminRole(roleRef('ADMINISTRACION'))).toBe(false);
    expect(isPlatformAdminRole(roleRef(null, 'PLATFORM_ADMIN'))).toBe(false);
    expect(isPlatformAdminRole(null)).toBe(false);
  });
});
