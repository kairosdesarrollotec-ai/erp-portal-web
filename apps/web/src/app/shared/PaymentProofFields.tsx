import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type PaymentProofDraft,
  type PaymentProofErrors,
  type PaymentProofRules,
} from './payment-proof';
import styles from './PaymentProofForm.module.css';

export interface PaymentProofFieldsProps extends PaymentProofRules {
  draft: PaymentProofDraft;
  onChange: (next: PaymentProofDraft) => void;
  /** Errores a mostrar (el padre decide cuando: normalmente tras el primer intento de envio). */
  errors?: PaymentProofErrors;
  disabled?: boolean;
  /** Prefijo para ids/etiquetas cuando hay mas de un formulario en pantalla. */
  idPrefix?: string;
}

/**
 * Campos del pago verificado por comprobante (decision 22-oct #8): metodo (TRANSFERENCIA, DEPOSITO, PLIN, YAPE,
 * EFECTIVO, POS), nº de operacion, pagador y comprobante adjunto. Componente controlado; lo usan la reserva (RES-04)
 * y la garantia del alquiler (ENTREGA-03).
 */
export function PaymentProofFields({
  draft,
  onChange,
  errors = {},
  disabled = false,
  requireAmount = false,
  externalAgentFields = false,
}: PaymentProofFieldsProps) {
  const set = (patch: Partial<PaymentProofDraft>) => onChange({ ...draft, ...patch });

  return (
    <div className={styles.form} data-testid="payment-proof-form">
      <label className={styles.label}>
        Método de pago
        <select
          className={styles.select}
          value={draft.method}
          disabled={disabled}
          onChange={(e) => set({ method: e.target.value as PaymentMethod })}
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </label>

      {requireAmount && (
        <label className={styles.label}>
          Monto pagado (S/)
          <input
            className={styles.input}
            type="number"
            min="0"
            step="0.01"
            value={draft.amount}
            disabled={disabled}
            onChange={(e) => set({ amount: e.target.value })}
            aria-invalid={Boolean(errors.amount)}
          />
          {errors.amount && <span className={styles.error}>{errors.amount}</span>}
        </label>
      )}

      <label className={styles.label}>
        {draft.method === 'EFECTIVO' ? 'Nº de recibo (opcional)' : 'Nº de operación'}
        <input
          className={styles.input}
          type="text"
          value={draft.operationNumber}
          disabled={disabled}
          onChange={(e) => set({ operationNumber: e.target.value })}
          aria-invalid={Boolean(errors.operationNumber)}
        />
        {errors.operationNumber && <span className={styles.error}>{errors.operationNumber}</span>}
      </label>

      <div className={styles.chips} role="group" aria-label="Pagador">
        <button
          type="button"
          disabled={disabled}
          aria-pressed={draft.payerType === 'TITULAR'}
          className={`${styles.chip} ${draft.payerType === 'TITULAR' ? styles.chipActive : ''}`}
          onClick={() => set({ payerType: 'TITULAR' })}
        >
          Paga el titular
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={draft.payerType === 'AGENTE_EXTERNO'}
          className={`${styles.chip} ${draft.payerType === 'AGENTE_EXTERNO' ? styles.chipActive : ''}`}
          onClick={() => set({ payerType: 'AGENTE_EXTERNO' })}
        >
          Paga un agente externo
        </button>
      </div>
      {draft.payerType === 'AGENTE_EXTERNO' && (
        <>
          <label className={styles.label}>
            Nombre de quien paga
            <input
              className={styles.input}
              type="text"
              value={draft.payerName}
              disabled={disabled}
              onChange={(e) => set({ payerName: e.target.value })}
              aria-invalid={Boolean(errors.payerName)}
            />
            {errors.payerName && <span className={styles.error}>{errors.payerName}</span>}
          </label>
          {externalAgentFields && (
            <>
              <label className={styles.label}>
                Documento del agente externo
                <input
                  className={styles.input}
                  type="text"
                  value={draft.payerDocumentNumber}
                  disabled={disabled}
                  onChange={(e) => set({ payerDocumentNumber: e.target.value })}
                  aria-invalid={Boolean(errors.payerDocumentNumber)}
                />
                {errors.payerDocumentNumber && <span className={styles.error}>{errors.payerDocumentNumber}</span>}
              </label>
              <label className={styles.label}>
                <span>
                  <input
                    type="checkbox"
                    checked={draft.externalAgentVerified}
                    disabled={disabled}
                    onChange={(e) => set({ externalAgentVerified: e.target.checked })}
                  />{' '}
                  Verifiqué al agente externo (verificación adicional obligatoria)
                </span>
                {errors.externalAgentVerified && <span className={styles.error}>{errors.externalAgentVerified}</span>}
              </label>
            </>
          )}
        </>
      )}

      <label className={styles.label}>
        Comprobante de pago
        <input
          type="file"
          accept="image/jpeg,image/webp,image/png,application/pdf"
          disabled={disabled}
          onChange={(e) => set({ file: e.target.files?.[0] ?? null })}
        />
        {draft.file && <span className={styles.hint}>{draft.file.name}</span>}
        {errors.file && <span className={styles.error}>{errors.file}</span>}
        <span className={styles.hint}>El pago se verifica con el envío del comprobante.</span>
      </label>
    </div>
  );
}
