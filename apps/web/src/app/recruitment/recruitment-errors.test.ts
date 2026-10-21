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

  it.each([
    [409, 'ONBOARDING_ALREADY_COMPLETED', /ya fue incorporada/],
    [422, 'DECISION_REASON_REQUIRED', /motivo del descarte/],
    [403, 'GERENCIA_DECISION_REQUIRED', /solo la toma Gerencia General/],
  ])('recruitment 0.4.0: %i %s se explica en lenguaje de negocio', (status, code, expected) => {
    expect(describeRecruitmentError(new RecruitmentCommandError(status, { code }), 'fallback')).toMatch(expected);
  });
});
