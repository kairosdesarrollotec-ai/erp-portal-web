import { describe, expect, it } from 'vitest';
import { canRecruitmentAction } from './recruitment-permissions';
import {
  CV_MAX_BYTES,
  VACANCY_STATUS_LABEL,
  defaultStartDate,
  nextStages,
  probationDaysRemaining,
  validateCvFile,
} from './recruitment-domain';

describe('recruitment-domain', () => {
  it('un candidato solo avanza de etapa', () => {
    expect(nextStages('NUEVO')).toEqual(['CONTACTADO', 'ENTREVISTA', 'DECISION']);
    expect(nextStages('ENTREVISTA')).toEqual(['DECISION']);
    expect(nextStages('DECISION')).toEqual([]);
  });

  it('propone el ingreso para mañana', () => {
    expect(defaultStartDate(new Date('2026-09-07T20:30:00Z'))).toBe('2026-09-08');
    expect(defaultStartDate(new Date('2027-01-01T04:00:00Z'))).toBe('2027-01-01');
  });

  it('calcula los dias que faltan para la evaluacion de 3 meses', () => {
    expect(probationDaysRemaining('2026-07-01', new Date('2026-09-17T05:00:00Z'))).toBe(14);
    expect(probationDaysRemaining('2026-01-01', new Date('2026-09-17T05:00:00Z'))).toBe(0);
  });
});

describe('validateCvFile', () => {
  it('acepta PDF, docx, JPG y PNG hasta 10 MB', () => {
    expect(validateCvFile({ type: 'application/pdf', size: 1024 })).toBeNull();
    expect(validateCvFile({ type: 'image/png', size: CV_MAX_BYTES })).toBeNull();
  });

  it('rechaza tipos no permitidos, vacíos y archivos de más de 10 MB', () => {
    expect(validateCvFile({ type: 'application/zip', size: 1024 })).toMatch(/PDF, Word/);
    expect(validateCvFile({ type: 'application/pdf', size: 0 })).toMatch(/vacío/);
    expect(validateCvFile({ type: 'application/pdf', size: CV_MAX_BYTES + 1 })).toMatch(/10 MB/);
  });

  it('etiqueta el estado Pausada', () => {
    expect(VACANCY_STATUS_LABEL.PAUSADA).toBe('Pausada');
  });
});

describe('recruitment-permissions', () => {
  it('decide por permiso, no por rol', () => {
    const granted = new Set(['RECRUITMENT.VIEW_VACANCY', 'RECRUITMENT.DECIDE_CANDIDATE']);
    expect(canRecruitmentAction(granted, 'DECIDE_CANDIDATE')).toBe(true);
    expect(canRecruitmentAction(granted, 'PUBLISH_VACANCY')).toBe(false);
  });
});
