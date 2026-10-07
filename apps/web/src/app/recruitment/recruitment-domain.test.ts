import { describe, expect, it } from 'vitest';
import { canRecruitmentAction } from './recruitment-permissions';
import { defaultStartDate, nextStages, probationDaysRemaining } from './recruitment-domain';

describe('recruitment-domain', () => {
  it('un candidato solo avanza de etapa', () => {
    expect(nextStages('NUEVO')).toEqual(['CONTACTADO', 'ENTREVISTA', 'DECISION']);
    expect(nextStages('ENTREVISTA')).toEqual(['DECISION']);
    expect(nextStages('DECISION')).toEqual([]);
  });

  it('propone el ingreso para mañana', () => {
    expect(defaultStartDate(new Date(2026, 8, 7, 15, 30))).toBe('2026-09-08');
    expect(defaultStartDate(new Date(2026, 11, 31, 23, 0))).toBe('2027-01-01');
  });

  it('calcula los dias que faltan para la evaluacion de 3 meses', () => {
    expect(probationDaysRemaining('2026-07-01', new Date(2026, 8, 17))).toBe(14);
    expect(probationDaysRemaining('2026-01-01', new Date(2026, 8, 17))).toBe(0);
  });
});

describe('recruitment-permissions', () => {
  it('decide por permiso, no por rol', () => {
    const granted = new Set(['RECRUITMENT.VIEW_VACANCY', 'RECRUITMENT.DECIDE_CANDIDATE']);
    expect(canRecruitmentAction(granted, 'DECIDE_CANDIDATE')).toBe(true);
    expect(canRecruitmentAction(granted, 'PUBLISH_VACANCY')).toBe(false);
  });
});
