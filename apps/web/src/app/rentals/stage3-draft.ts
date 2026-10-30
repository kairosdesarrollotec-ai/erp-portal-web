import { emptyPaymentDraft, type PaymentProofDraft } from '../shared/payment-proof';
import type { ContractHolderType } from './rentals-client';

/**
 * V-15: ENTREGA-03 entraba vacía al volver a abrirla antes de formalizar (los datos viven solo en el estado de la pantalla).
 * Se guarda en sessionStorage, por alquiler, SOLO lo que el personal digitó y no es una atestación ni un archivo:
 * tipo de titular, conductor de la empresa, justificación, monto y datos de texto del comprobante. NO se guardan la
 * verificación biométrica, la huella, la firma, el voucher ni la verificación del agente externo: esas se confirman de nuevo.
 * Se borra al formalizar. Es una comodidad del navegador: si falla el storage, la pantalla funciona igual.
 */
export interface Stage3Draft {
  holderType: ContractHolderType;
  withCompanyDriver: boolean;
  justification: string;
  paymentAmountInput: string | null;
  payment: Pick<PaymentProofDraft, 'method' | 'operationNumber' | 'payerType' | 'payerName' | 'payerDocumentNumber'>;
}

const key = (rentalId: string) => `kairos.stage3Draft.${rentalId}`;

export function loadStage3Draft(rentalId: string): Stage3Draft | null {
  try {
    const raw = window.sessionStorage.getItem(key(rentalId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stage3Draft>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      holderType: parsed.holderType === 'LEGAL' ? 'LEGAL' : 'NATURAL',
      withCompanyDriver: parsed.withCompanyDriver === true,
      justification: typeof parsed.justification === 'string' ? parsed.justification : '',
      paymentAmountInput: typeof parsed.paymentAmountInput === 'string' ? parsed.paymentAmountInput : null,
      payment: { ...emptyPaymentDraft(), ...(parsed.payment ?? {}) },
    };
  } catch {
    return null;
  }
}

export function saveStage3Draft(rentalId: string, draft: Stage3Draft): void {
  try {
    window.sessionStorage.setItem(key(rentalId), JSON.stringify(draft));
  } catch {
    // storage no disponible (modo privado, cuota): se ignora.
  }
}

export function clearStage3Draft(rentalId: string): void {
  try {
    window.sessionStorage.removeItem(key(rentalId));
  } catch {
    // ignorado.
  }
}
