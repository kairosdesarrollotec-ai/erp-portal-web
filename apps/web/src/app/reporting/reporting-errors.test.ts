import { describe, it, expect } from 'vitest';
import {
  ReportingApiError,
  reportingDateErrorMessage,
  toReportingApiError,
} from './reporting-errors';

describe('reporting-errors', () => {
  it('toReportingApiError conserva status y el code del cuerpo {statusCode, code, detail}', () => {
    const err = toReportingApiError('Error al cargar KPIs', 400, { statusCode: 400, code: 'RANGE_EXCEEDS_MAX', detail: 'x' });
    expect(err).toBeInstanceOf(ReportingApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('RANGE_EXCEEDS_MAX');
  });

  it('cuerpo ausente o sin code → sin code', () => {
    expect(toReportingApiError('e', 500, undefined).code).toBeUndefined();
    expect(toReportingApiError('e', 500, { message: 'x' }).code).toBeUndefined();
  });

  it.each([
    ['INVALID_DATE', /fechas no es válida/i],
    ['INVALID_DATE_RANGE', /anterior o igual/i],
    ['RANGE_EXCEEDS_MAX', /rango máximo permitido es 90 días/i],
  ])('mensaje en español para %s', (code, re) => {
    expect(reportingDateErrorMessage(new ReportingApiError('e', 400, code))).toMatch(re);
  });

  it('códigos desconocidos o errores ajenos → null (se usa el texto genérico)', () => {
    expect(reportingDateErrorMessage(new ReportingApiError('e', 403, 'ROLE_NOT_ALLOWED'))).toBeNull();
    expect(reportingDateErrorMessage(new Error('x'))).toBeNull();
    expect(reportingDateErrorMessage(null)).toBeNull();
  });
});
