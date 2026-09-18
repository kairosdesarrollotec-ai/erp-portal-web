import { useRef, useState } from 'react';
import styles from './OtpInput.module.css';

const ERROR_MESSAGE_ID = 'otp-input-error';

/**
 * Seis casillas para el codigo TOTP de 6 digitos. Extraido de
 * ActivationScreen.tsx (hallazgo de revision: tamaño/responsabilidad del
 * archivo original) y con la accesibilidad que faltaba (otro hallazgo):
 * las 6 casillas se agrupan semanticamente con `fieldset`/`legend`, cada
 * una expone `aria-invalid` cuando el codigo es invalido, y el grupo esta
 * asociado al mensaje de error via `aria-describedby`. No hay un patron de
 * OTP previo en el repo (el modal MFA del login todavia no existe, se hace
 * en HU-22) para reutilizar, asi que esta es la primera implementacion.
 */
export function OtpInput({
  value,
  onChange,
  hasError,
  errorMessage,
  disabled,
}: {
  value: string[];
  onChange: (digits: string[]) => void;
  hasError: boolean;
  errorMessage?: string;
  disabled: boolean;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function handleDigitChange(index: number, raw: string) {
    const clean = raw.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[index] = clean;
    onChange(next);
    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pasted)) return;
    const chars = pasted.slice(0, 6).split('');
    const next = [...value];
    chars.forEach((char, i) => {
      next[i] = char;
    });
    onChange(next);
    const nextIndex = Math.min(chars.length, 5);
    inputRefs.current[nextIndex]?.focus();
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Código de 6 dígitos</legend>
      <div className={styles.digitInputs}>
        {value.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoFocus={index === 0}
            className={`${styles.digitBox} ${hasError ? styles.digitBoxError : ''}`}
            value={digit}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? ERROR_MESSAGE_ID : undefined}
            onChange={(event) => handleDigitChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
          />
        ))}
      </div>
      {hasError ? (
        <p id={ERROR_MESSAGE_ID} role="alert" className={styles.mfaError}>
          {errorMessage ??
            'Código incorrecto o expirado — genera uno nuevo en tu app e intenta de nuevo'}
        </p>
      ) : (
        <p className={styles.mfaHint}>Ingresa el código temporal de 6 dígitos de tu app</p>
      )}
    </fieldset>
  );
}

export function useOtpDigits() {
  return useState<string[]>(Array(6).fill(''));
}
