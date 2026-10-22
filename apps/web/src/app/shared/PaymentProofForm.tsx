import { useState } from 'react';
import { PaymentProofFields } from './PaymentProofFields';
import {
  emptyPaymentDraft,
  hasPaymentErrors,
  validatePaymentDraft,
  type PaymentProofDraft,
  type PaymentProofRules,
} from './payment-proof';
import styles from './PaymentProofForm.module.css';

export interface PaymentProofFormProps extends PaymentProofRules {
  /** Texto del boton de envio (ej. "Enviar comprobante"). */
  submitLabel: string;
  busy?: boolean;
  /** Error devuelto por el backend (ej. INVALID_DEPOSIT_AMOUNT); se muestra bajo el formulario. */
  error?: string | null;
  /** Texto informativo (ej. el monto vigente de la reserva). */
  hint?: string;
  /** Valor inicial del monto pagado (reserva). */
  initialAmount?: string;
  onSubmit: (draft: PaymentProofDraft) => void | Promise<void>;
  onCancel?: () => void;
}

/** Formulario autonomo (campos + boton de envio) del pago verificado por comprobante. */
export function PaymentProofForm({
  submitLabel,
  busy = false,
  error,
  hint,
  initialAmount = '',
  onSubmit,
  onCancel,
  requireAmount,
  externalAgentFields,
}: PaymentProofFormProps) {
  const [draft, setDraft] = useState<PaymentProofDraft>(() => emptyPaymentDraft(initialAmount));
  const [attempted, setAttempted] = useState(false);

  const errors = validatePaymentDraft(draft, { requireAmount, externalAgentFields });

  function handleSubmit() {
    setAttempted(true);
    if (hasPaymentErrors(errors)) return;
    void onSubmit(draft);
  }

  return (
    <div>
      {hint && <p className={styles.hint}>{hint}</p>}
      <PaymentProofFields
        draft={draft}
        onChange={setDraft}
        errors={attempted ? errors : {}}
        disabled={busy}
        requireAmount={requireAmount}
        externalAgentFields={externalAgentFields}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.submit} disabled={busy} onClick={handleSubmit}>
          {busy ? 'Enviando…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
