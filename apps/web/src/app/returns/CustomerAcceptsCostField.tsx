import styles from './ReturnForms.module.css';

interface Props {
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  name?: string;
}

/**
 * "¿El cliente acepta el costo?" (DEV-06/07/08). Afecta el semaforo del
 * cliente: LEVE/MODERADO aceptado -> ambar. No aplica a dano GRAVE (siempre rojo).
 */
export function CustomerAcceptsCostField({ value, onChange, disabled, name = 'customer-accepts-cost' }: Props) {
  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <legend>¿El cliente acepta el costo?</legend>
      <div className={styles.radioRow}>
        <label className={styles.radioOption}>
          <input type="radio" name={name} checked={value === true} onChange={() => onChange(true)} />
          Sí, acepta el costo
        </label>
        <label className={styles.radioOption}>
          <input type="radio" name={name} checked={value === false} onChange={() => onChange(false)} />
          No acepta el costo
        </label>
      </div>
    </fieldset>
  );
}
