import { describe, it, expect } from 'vitest';
import { canResolveDirect, rentalLabel } from './incident-domain';
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

describe('canIncidentAction (politica de roles de INC-01/INC-02)', () => {
  it('lectura: Front-office, Campo, Gerencia, Finanzas, Auditoria y Administracion; no RRHH', () => {
    for (const role of ['FRONT_OFFICE', 'CAMPO', 'GERENCIA', 'FINANZAS', 'AUDITORIA', 'ADMINISTRACION'] as const) {
      expect(canIncidentAction(role, 'VIEW')).toBe(true);
    }
    expect(canIncidentAction('RRHH', 'VIEW')).toBe(false);
  });

  it('cierre y acciones del detalle: solo Front-office y Gerencia; Campo registra pero no cierra', () => {
    expect(canIncidentAction('FRONT_OFFICE', 'CLOSE')).toBe(true);
    expect(canIncidentAction('GERENCIA', 'ADD_ACTION')).toBe(true);
    expect(canIncidentAction('CAMPO', 'CREATE')).toBe(true);
    expect(canIncidentAction('CAMPO', 'CLOSE')).toBe(false);
    expect(canIncidentAction('AUDITORIA', 'CREATE')).toBe(false);
  });

  it('rol desconocido no oculta nada (decide el backend) y PLATFORM_ADMIN todo', () => {
    expect(canIncidentAction(null, 'CLOSE')).toBe(true);
    expect(canIncidentAction('PLATFORM_ADMIN', 'REFER_LEGAL')).toBe(true);
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
});
