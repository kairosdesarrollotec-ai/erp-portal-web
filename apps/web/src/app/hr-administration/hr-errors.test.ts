import { describe, it, expect } from 'vitest';
import { HrCommandError } from './hr-client';
import { VACATION_CONFLICT_MESSAGE, describeHrError, isStaleHrError } from './hr-errors';

describe('hr-errors', () => {
  it('traduce los codigos reales del servidor a lenguaje de negocio', () => {
    expect(describeHrError(new HrCommandError(409, { code: 'VACATION_OVERLAP' }), 'x')).toBe(VACATION_CONFLICT_MESSAGE);
    expect(describeHrError(new HrCommandError(422, { code: 'FINAL_SETTLEMENT_REQUIRED' }), 'x')).toMatch(/quincena pendiente/);
    expect(describeHrError(new HrCommandError(422, { code: 'DEDUCTIONS_BEFORE_MONTH_END' }), 'x')).toMatch(/cerrar el mes/);
    expect(describeHrError(new HrCommandError(409, { code: 'FIELD_TRIP_TIMEOUT_NOT_ELAPSED' }), 'x')).toMatch(/5 minutos/);
    expect(describeHrError(new HrCommandError(409, { code: 'EMPLOYEE_TERMINATED' }), 'x')).toMatch(/ya terminó/);
  });

  it('un codigo desconocido cae al mensaje por estado y luego al generico', () => {
    expect(describeHrError(new HrCommandError(403, { code: 'ROLE_NOT_ALLOWED' }), 'x')).toMatch(/No tienes permiso/);
    expect(describeHrError(new Error('red'), 'generico')).toBe('generico');
  });

  it('un 409 pide recargar', () => {
    expect(isStaleHrError(new HrCommandError(409, null))).toBe(true);
    expect(isStaleHrError(new HrCommandError(422, null))).toBe(false);
  });
});
