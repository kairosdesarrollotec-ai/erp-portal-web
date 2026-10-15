import { describe, it, expect } from 'vitest';
import { canResolveDirect, rentalLabel, forcedSeverityForType, requiresManagementDecision, INCIDENT_TYPES, INCIDENT_TYPE_LABELS } from './incident-domain';
import { canIncidentAction } from './incident-permissions';
import { describeIncidentError, isStaleIncidentError } from './incident-errors';
import { IncidentCommandError } from './incidents-client';

describe('canResolveDirect (INC-01)', () => {
  it('solo severidad LEVE y estado ABIERTA ofrecen Resolver directo', () => {
    expect(canResolveDirect({ severity: 'LEVE', status: 'ABIERTA' })).toBe(true);
    expect(canResolveDirect({ severity: 'MODERADA', status: 'ABIERTA' })).toBe(false);
    expect(canResolveDirect({ severity: 'GRAVE', status: 'ABIERTA' })).toBe(false);
    expect(canResolveDirect({ severity: 'LEVE', status: 'CERRADA' })).toBe(false);
    expect(canResolveDirect({ severity: 'LEVE', status: 'VIA_LEGAL' })).toBe(false);
  });
});

describe('rentalLabel', () => {
  it('usa rentalCode y, si falta, un id abreviado', () => {
    expect(rentalLabel({ rentalId: 'abcdef123456', rentalCode: 'ALQ-1187' })).toBe('ALQ-1187');
    expect(rentalLabel({ rentalId: 'abcdef123456', rentalCode: null })).toBe('Alquiler abcdef12');
  });
});

describe('canIncidentAction (permisos INCIDENT.* del catalogo de ADM-02)', () => {
  const granted = (...keys: string[]) => new Set(keys);

  it('cada accion se evalua por su permiso, no por rol', () => {
    const viewer = granted('INCIDENT.VIEW');
    expect(canIncidentAction(viewer, 'VIEW')).toBe(true);
    expect(canIncidentAction(viewer, 'CREATE')).toBe(false);
    expect(canIncidentAction(viewer, 'CLOSE')).toBe(false);
  });

  it('un rol personalizado con solo CREATE no puede ver ni cerrar (permisos independientes)', () => {
    const creator = granted('INCIDENT.CREATE');
    expect(canIncidentAction(creator, 'CREATE')).toBe(true);
    expect(canIncidentAction(creator, 'VIEW')).toBe(false);
    expect(canIncidentAction(creator, 'REFER_LEGAL')).toBe(false);
  });

  it('sin permisos nada esta permitido (deny-by-default)', () => {
    for (const action of ['VIEW', 'CREATE', 'ADD_ACTION', 'RESOLVE', 'CLOSE', 'REFER_LEGAL'] as const) {
      expect(canIncidentAction(granted(), action)).toBe(false);
    }
  });

  it('permisos de otro modulo no conceden acciones de Incidencias', () => {
    expect(canIncidentAction(granted('RESERVATION.CREATE', 'ADMIN.MANAGE_USERS'), 'VIEW')).toBe(false);
  });
});

describe('incident-errors', () => {
  it('traduce codigos de dominio y detecta version desactualizada', () => {
    const conflict = new IncidentCommandError(409, { code: 'VERSION_CONFLICT' });
    expect(isStaleIncidentError(conflict)).toBe(true);
    expect(describeIncidentError(conflict, 'x')).toMatch(/Otra persona modificó/);

    const unprocessable = new IncidentCommandError(422, { code: 'INCIDENT_DIRECT_RESOLVE_NOT_ALLOWED' });
    expect(isStaleIncidentError(unprocessable)).toBe(false);
    expect(describeIncidentError(unprocessable, 'x')).toMatch(/Solo las incidencias leves/);

    expect(describeIncidentError(new Error('boom'), 'fallback')).toBe('fallback');
  });

  it('traduce los errores de conductor no autorizado', () => {
    expect(describeIncidentError(new IncidentCommandError(422, { code: 'INCIDENT_SEVERITY_NOT_ALLOWED_FOR_TYPE' }), 'x')).toMatch(/solo admite severidad Grave/);
    expect(describeIncidentError(new IncidentCommandError(403, { code: 'MANAGEMENT_DECISION_REQUIRED' }), 'x')).toMatch(/solo Gerencia/);
  });
});

describe('UNAUTHORIZED_DRIVER (DEC-ALQ-UNAUTH-DRIVER-003)', () => {
  it('esta en el catalogo con etiqueta, fuerza GRAVE y requiere decision de Gerencia', () => {
    expect(INCIDENT_TYPES).toContain('UNAUTHORIZED_DRIVER');
    expect(INCIDENT_TYPE_LABELS.UNAUTHORIZED_DRIVER).toBe('Conductor no autorizado');
    expect(forcedSeverityForType('UNAUTHORIZED_DRIVER')).toBe('GRAVE');
    expect(forcedSeverityForType('KEY_LOSS')).toBeNull();
    expect(forcedSeverityForType('')).toBeNull();
    expect(requiresManagementDecision('UNAUTHORIZED_DRIVER')).toBe(true);
    expect(requiresManagementDecision('OTHER')).toBe(false);
  });
});
