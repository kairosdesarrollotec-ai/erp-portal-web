import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ADJUSTMENT_TYPES, ADJUSTMENT_TYPE_LABELS, type AdjustmentType } from './payment-domain';
import styles from './RegisterAdjustmentDialog.module.css';

/**
 * Modal de registro de ajuste de garantía (PAG-02 "Registrar ajuste").
 * Fuente: payments.yaml v0.1.0 RegisterAdjustmentRequest — amount ≥ 0.01, reason minLength 5.
 * Accesibilidad: foco atrapado y Escape via Radix Dialog (mismo patrón que IncidentDialog).
 */

const schema = z.object({
  type: z.enum(['DISCOUNT', 'FULL_RETENTION', 'RELEASE', 'IMMOBILIZATION_CHARGE'] as const, {
    error: 'Selecciona el tipo de ajuste',
  }),
  amount: z
    .number({ error: 'Ingresa un monto válido' })
    .min(0.01, 'El monto debe ser mayor a 0'),
  reason: z
    .string()
    .min(5, 'El motivo debe tener al menos 5 caracteres')
    .max(500, 'El motivo no puede superar 500 caracteres'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  busy: boolean;
  error: string | null;
  onConfirm: (data: { type: AdjustmentType; amount: number; reason: string }) => void;
  onCancel: () => void;
}

export function RegisterAdjustmentDialog({ busy, error, onConfirm, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  function onSubmit(values: FormValues) {
    if (busy) return;
    onConfirm({ type: values.type, amount: values.amount, reason: values.reason });
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.card} aria-labelledby="adj-dialog-title">
          <Dialog.Title id="adj-dialog-title" className={styles.title}>
            Registrar ajuste de garantía
          </Dialog.Title>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Tipo de ajuste */}
            <div className={styles.field}>
              <label htmlFor="adj-type" className={styles.label}>
                Tipo de ajuste <span aria-hidden="true">*</span>
              </label>
              <select
                id="adj-type"
                className={`${styles.input} ${errors.type ? styles.inputError : ''}`}
                aria-required="true"
                aria-describedby={errors.type ? 'adj-type-err' : undefined}
                {...register('type')}
                disabled={busy}
              >
                <option value="">Selecciona un tipo…</option>
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ADJUSTMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p id="adj-type-err" className={styles.fieldError} role="alert">
                  {errors.type.message}
                </p>
              )}
            </div>

            {/* Monto */}
            <div className={styles.field}>
              <label htmlFor="adj-amount" className={styles.label}>
                Monto (S/) <span aria-hidden="true">*</span>
              </label>
              <input
                id="adj-amount"
                type="number"
                step="0.01"
                min="0.01"
                className={`${styles.input} ${errors.amount ? styles.inputError : ''}`}
                placeholder="0.00"
                aria-required="true"
                aria-describedby={errors.amount ? 'adj-amount-err' : undefined}
                {...register('amount', { valueAsNumber: true })}
                disabled={busy}
              />
              {errors.amount && (
                <p id="adj-amount-err" className={styles.fieldError} role="alert">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* Motivo */}
            <div className={styles.field}>
              <label htmlFor="adj-reason" className={styles.label}>
                Motivo <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="adj-reason"
                className={`${styles.textarea} ${errors.reason ? styles.inputError : ''}`}
                placeholder="Describe el motivo del ajuste (mínimo 5 caracteres)…"
                maxLength={500}
                aria-required="true"
                aria-describedby={errors.reason ? 'adj-reason-err' : undefined}
                {...register('reason')}
                disabled={busy}
              />
              {errors.reason && (
                <p id="adj-reason-err" className={styles.fieldError} role="alert">
                  {errors.reason.message}
                </p>
              )}
            </div>

            <p className={styles.immutabilityNote}>
              Los ajustes son definitivos y no pueden modificarse (BR-PAG-003).
            </p>

            {error && (
              <p className={styles.errorBanner} role="alert">
                {error}
              </p>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onCancel}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={!isValid || busy}
              >
                {busy ? 'Guardando…' : 'Registrar ajuste'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
