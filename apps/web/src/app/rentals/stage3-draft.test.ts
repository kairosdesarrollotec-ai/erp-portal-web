import { beforeEach, describe, expect, it } from 'vitest';
import { clearStage3Draft, loadStage3Draft, saveStage3Draft } from './stage3-draft';

describe('V-15: borrador de ENTREGA-03', () => {
  beforeEach(() => window.sessionStorage.clear());

  const draft = {
    holderType: 'LEGAL' as const,
    withCompanyDriver: true,
    justification: 'motivo',
    paymentAmountInput: '1500',
    payment: { method: 'EFECTIVO' as const, operationNumber: '123', payerType: 'TITULAR' as const, payerName: 'A', payerDocumentNumber: '' },
  };

  it('guarda y recupera lo digitado por alquiler', () => {
    saveStage3Draft('r1', draft);
    expect(loadStage3Draft('r1')).toMatchObject({ holderType: 'LEGAL', withCompanyDriver: true, justification: 'motivo', paymentAmountInput: '1500' });
    expect(loadStage3Draft('r2')).toBeNull();
  });

  it('nunca guarda atestaciones ni archivos: biometría, huella, firma, voucher y agente externo se confirman de nuevo', () => {
    saveStage3Draft('r1', draft);
    const raw = window.sessionStorage.getItem('kairos.stage3Draft.r1') ?? '';
    for (const forbidden of ['biometric', 'fingerprint', 'signature', 'file', 'externalAgentVerified']) {
      expect(raw.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it('clearStage3Draft lo borra y un JSON dañado se ignora', () => {
    saveStage3Draft('r1', draft);
    clearStage3Draft('r1');
    expect(loadStage3Draft('r1')).toBeNull();
    window.sessionStorage.setItem('kairos.stage3Draft.r1', '{no-json');
    expect(loadStage3Draft('r1')).toBeNull();
  });
});
