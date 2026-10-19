import { describe, it, expect } from 'vitest';
import { RecruitmentCommandError } from './recruitment-client';
import { describeRecruitmentError } from './recruitment-errors';

describe('describeRecruitmentError (BDD-REC §11.6)', () => {
  it('traduce CANDIDATE_STATE_TRANSITION_INVALID a lenguaje de negocio', () => {
    const error = new RecruitmentCommandError(422, { code: 'CANDIDATE_STATE_TRANSITION_INVALID', detail: 'x' });
    const message = describeRecruitmentError(error, 'fallback');
    expect(message).toMatch(/primero registra el resultado de la entrevista/);
    expect(message).not.toBe('fallback');
  });

  it('un 422 sin código conocido usa el mensaje genérico de reglas de negocio', () => {
    expect(describeRecruitmentError(new RecruitmentCommandError(422, { code: 'OTRO' }), 'fallback')).toBe(
      'La operación no cumple las reglas de negocio vigentes.',
    );
  });
});
