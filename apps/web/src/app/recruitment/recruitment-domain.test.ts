import { describe, expect, it } from 'vitest';
import { canRecruitmentAction } from './recruitment-permissions';
import {
  CV_MAX_BYTES,
  PROCESS_FLOW_STEPS,
  PROCESS_STATE_LABEL,
  VACANCY_STATUS_LABEL,
  canHire,
  defaultStartDate,
  nextStages,
  probationDaysRemaining,
  processFlowPosition,
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

  describe('flujo de estados BDD-REC §11.6', () => {
    it('los 8 pasos del flujo van en el orden del BDD', () => {
      expect(PROCESS_FLOW_STEPS.map((s) => s.label)).toEqual([
        'Necesidad registrada',
        'Publicado',
        'En negociación',
        'Entrevistado',
        'Decidido',
        'Ingresado',
        'Periodo de prueba',
        'Planilla',
      ]);
    });

    it('cada estado de proceso tiene etiqueta y la vacante etiqueta ENTREVISTADA', () => {
      expect(Object.keys(PROCESS_STATE_LABEL).sort()).toEqual(
        ['DECIDIDO', 'DESCARTADO', 'EN_NEGOCIACION', 'ENTREVISTADO', 'INGRESADO', 'PERIODO_PRUEBA', 'PLANILLA', 'TERMINADO'].sort(),
      );
      expect(VACANCY_STATUS_LABEL.ENTREVISTADA).toBe('Entrevistada');
    });

    it('ubica cada estado en su paso; Terminado sale de Periodo de prueba y Descartado de En negociación o Decidido', () => {
      expect(processFlowPosition('EN_NEGOCIACION')).toBe(2);
      expect(processFlowPosition('ENTREVISTADO')).toBe(3);
      expect(processFlowPosition('DECIDIDO')).toBe(4);
      expect(processFlowPosition('INGRESADO')).toBe(5);
      expect(processFlowPosition('PERIODO_PRUEBA')).toBe(6);
      expect(processFlowPosition('PLANILLA')).toBe(7);
      expect(processFlowPosition('TERMINADO')).toBe(6);
      expect(processFlowPosition('DESCARTADO')).toBe(2);
      expect(processFlowPosition('DESCARTADO', true)).toBe(4);
    });

    it('solo se puede contratar a quien ya está Entrevistado', () => {
      expect(canHire('ENTREVISTADO')).toBe(true);
      expect(canHire('EN_NEGOCIACION')).toBe(false);
      expect(canHire('DECIDIDO')).toBe(false);
    });
  });
});
