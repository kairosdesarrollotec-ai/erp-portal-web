/**
 * Decision 22-oct (#8): pagos de reserva y de garantia de alquiler. Metodos aceptados y datos que se envian
 * al backend. El pago se verifica con el envio del comprobante (archivo adjunto, subido con el mecanismo de
 * documentos del modulo; el backend recibe el id del documento en `voucherDocumentId`).
 */
export type PaymentMethod = 'TRANSFERENCIA' | 'DEPOSITO' | 'PLIN' | 'YAPE' | 'EFECTIVO' | 'POS';
export type PayerType = 'TITULAR' | 'AGENTE_EXTERNO';

export const PAYMENT_METHODS: PaymentMethod[] = ['TRANSFERENCIA', 'DEPOSITO', 'PLIN', 'YAPE', 'EFECTIVO', 'POS'];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  TRANSFERENCIA: 'Transferencia',
  DEPOSITO: 'Depósito',
  PLIN: 'Plin',
  YAPE: 'Yape',
  EFECTIVO: 'Efectivo',
  POS: 'POS (tarjeta)',
};

export const PAYMENT_PROOF_ACCEPTED_TYPES = ['image/jpeg', 'image/webp', 'image/png', 'application/pdf'] as const;
export type PaymentProofContentType = (typeof PAYMENT_PROOF_ACCEPTED_TYPES)[number];
export const PAYMENT_PROOF_MAX_BYTES = 10 * 1024 * 1024;

/** Estado del formulario de pago (los campos de texto se guardan tal cual se escriben). */
export interface PaymentProofDraft {
  method: PaymentMethod;
  operationNumber: string;
  payerType: PayerType;
  /** Nombre de quien paga cuando es un agente externo (si paga el titular se usa el nombre del titular). */
  payerName: string;
  /** Solo agente externo (BR-ALQ-011, garantia de alquiler). */
  payerDocumentNumber: string;
  /** El personal confirma la verificacion adicional del agente externo (BR-ALQ-011). */
  externalAgentVerified: boolean;
  /** Monto realmente pagado (solo reserva; el servidor lo compara con el monto de la politica). */
  amount: string;
  file: File | null;
}

export function emptyPaymentDraft(amount = ''): PaymentProofDraft {
  return {
    method: 'TRANSFERENCIA',
    operationNumber: '',
    payerType: 'TITULAR',
    payerName: '',
    payerDocumentNumber: '',
    externalAgentVerified: false,
    amount,
    file: null,
  };
}

export interface PaymentProofErrors {
  amount?: string;
  operationNumber?: string;
  payerName?: string;
  payerDocumentNumber?: string;
  externalAgentVerified?: string;
  file?: string;
}

export interface PaymentProofRules {
  /** Pide y valida el monto pagado (reserva). */
  requireAmount?: boolean;
  /** Pide documento y verificacion del agente externo (garantia de alquiler, BR-ALQ-011). */
  externalAgentFields?: boolean;
}

/** En EFECTIVO el "nº de operacion" es el nº de recibo y es opcional si se adjunta el comprobante; en los demas metodos es obligatorio. */
export function validatePaymentDraft(draft: PaymentProofDraft, rules: PaymentProofRules = {}): PaymentProofErrors {
  const errors: PaymentProofErrors = {};
  if (rules.requireAmount) {
    const amount = Number(draft.amount);
    if (draft.amount.trim() === '' || !Number.isFinite(amount) || amount <= 0) {
      errors.amount = 'Ingresa el monto pagado.';
    }
  }
  if (draft.method !== 'EFECTIVO' && draft.operationNumber.trim().length === 0) {
    errors.operationNumber = 'Ingresa el número de operación.';
  }
  if (draft.payerType === 'AGENTE_EXTERNO') {
    if (draft.payerName.trim().length === 0) errors.payerName = 'Ingresa el nombre de quien paga.';
    if (rules.externalAgentFields) {
      if (draft.payerDocumentNumber.trim().length === 0) {
        errors.payerDocumentNumber = 'Ingresa el documento del agente externo.';
      }
      if (!draft.externalAgentVerified) {
        errors.externalAgentVerified = 'Confirma la verificación adicional del agente externo.';
      }
    }
  }
  if (!draft.file) {
    errors.file = 'Adjunta el comprobante de pago.';
  } else if (!(PAYMENT_PROOF_ACCEPTED_TYPES as readonly string[]).includes(draft.file.type)) {
    errors.file = 'El comprobante debe ser JPG, PNG, WebP o PDF.';
  } else if (draft.file.size > PAYMENT_PROOF_MAX_BYTES) {
    errors.file = 'El comprobante supera el tamaño máximo de 10 MB.';
  }
  return errors;
}

export function hasPaymentErrors(errors: PaymentProofErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Nombre del pagador: el titular, o el agente externo que se escribio. */
export function payerNameOf(draft: PaymentProofDraft, holderName: string): string {
  return (draft.payerType === 'AGENTE_EXTERNO' ? draft.payerName : holderName).trim() || holderName.trim();
}

/** Cuerpo de `register-payment` de la reserva (el monto requerido y la version de politica los lee el servidor). */
export interface ReservationPaymentBody {
  amount: string;
  method: PaymentMethod;
  operationNumber?: string;
  payerName: string;
  voucherDocumentId?: string;
}

export function toReservationPaymentBody(
  draft: PaymentProofDraft,
  holderName: string,
  voucherDocumentId?: string,
): ReservationPaymentBody {
  const operationNumber = draft.operationNumber.trim();
  return {
    amount: Number(draft.amount).toFixed(2),
    method: draft.method,
    ...(operationNumber ? { operationNumber } : {}),
    payerName: payerNameOf(draft, holderName),
    ...(voucherDocumentId ? { voucherDocumentId } : {}),
  };
}

/** Objeto `payment` de `formalize-contract` (cobro de la garantia, BR-ALQ-011). */
export interface GuaranteePaymentBody {
  method: PaymentMethod;
  operationNumber?: string;
  payerName: string;
  payerDocumentNumber?: string;
  payerIsExternalAgent: boolean;
  externalAgentVerified?: boolean;
  voucherDocumentId?: string;
}

export function toGuaranteePaymentBody(
  draft: PaymentProofDraft,
  holderName: string,
  voucherDocumentId?: string,
): GuaranteePaymentBody {
  const operationNumber = draft.operationNumber.trim();
  const external = draft.payerType === 'AGENTE_EXTERNO';
  const docNumber = draft.payerDocumentNumber.trim();
  return {
    method: draft.method,
    ...(operationNumber ? { operationNumber } : {}),
    payerName: payerNameOf(draft, holderName),
    ...(external && docNumber ? { payerDocumentNumber: docNumber } : {}),
    payerIsExternalAgent: external,
    ...(external ? { externalAgentVerified: draft.externalAgentVerified } : {}),
    ...(voucherDocumentId ? { voucherDocumentId } : {}),
  };
}
