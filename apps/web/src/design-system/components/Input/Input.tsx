/**
 * Input — primitiva del Design System Kairos Corporation
 * Fuente: veloxrent_erp_design_system/DESIGN.md — Components > Form Inputs & Select Fields
 *
 * Campo de texto controlado con HTML semantico accesible.
 * Estados: default, focus (border #1F2A33), error (border #C22B2B + mensaje).
 */
import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function Input({
  label,
  error,
  hint,
  required,
  id: externalId,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const inputClasses = [
    styles.input,
    error ? styles.inputError : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              {' *'}
            </span>
          )}
        </label>
      )}

      <input
        {...props}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? errorId : '', hint ? hintId : ''].filter(Boolean).join(' ') ||
          undefined
        }
        className={inputClasses}
      />

      {hint && !error && (
        <span id={hintId} className={styles.hintText}>
          {hint}
        </span>
      )}

      {error && (
        <span id={errorId} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
