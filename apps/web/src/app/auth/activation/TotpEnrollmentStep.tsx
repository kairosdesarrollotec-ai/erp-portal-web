import { WifiOff } from 'lucide-react';
import type { ActivationScreenState } from '../useActivation';
import { OtpInput, useOtpDigits } from './OtpInput';
import { QrEnrollmentCard } from './QrEnrollmentCard';
import shared from './shared.module.css';
import styles from './TotpEnrollmentStep.module.css';

/**
 * TR-02 paso 2 - Protege tu cuenta (QR + codigo TOTP). Extraido de
 * ActivationScreen.tsx (hallazgo de revision: tamaño/responsabilidad del
 * archivo original), compuesto por QrEnrollmentCard + OtpInput.
 *
 * BACKEND_UNAVAILABLE (hallazgo de revision: flujo no recuperable/
 * transaccional): el enrolamiento MFA ya quedo hecho en Firebase, solo
 * falta que el backend lo confirme - se muestra un panel dedicado con
 * reintento en vez del formulario de codigo (que ya no aplica).
 */
export function TotpEnrollmentStep({
  state,
  qrCodeUrl,
  secretKey,
  onSubmit,
  onRetryComplete,
}: {
  state: ActivationScreenState;
  qrCodeUrl: string | null;
  secretKey: string | null;
  onSubmit: (code: string) => void | Promise<void>;
  onRetryComplete: () => void | Promise<void>;
}) {
  const [digits, setDigits] = useOtpDigits();
  const isValidating = state === 'VALIDATING';
  const code = digits.join('');
  const isComplete = code.length === 6;

  if (state === 'BACKEND_UNAVAILABLE') {
    return (
      <>
        <h1 className={styles.title}>Protege tu cuenta</h1>
        <div className={styles.backendUnavailable} role="alert">
          <WifiOff className={styles.backendUnavailableIcon} size={32} aria-hidden="true" />
          <p className={styles.backendUnavailableText}>
            Tu segundo factor ya quedó configurado, pero no pudimos confirmarlo con el servidor.
            Intenta de nuevo en unos minutos.
          </p>
        </div>
        <button
          type="button"
          className={shared.submit}
          onClick={() => void onRetryComplete()}
          disabled={isValidating}
        >
          {isValidating ? 'Confirmando...' : 'Reintentar'}
        </button>
      </>
    );
  }

  const hasInvalidCode = state === 'RECOVERABLE_ERROR';
  const hasNetworkError = state === 'NETWORK_ERROR';

  return (
    <>
      <h1 className={styles.title}>Protege tu cuenta</h1>
      <p className={styles.mfaDescription}>
        Escanea el código QR con tu aplicación autenticadora (Google Authenticator, Microsoft
        Authenticator o similar) e ingresa el código de 6 dígitos generado.
      </p>

      <QrEnrollmentCard qrCodeUrl={qrCodeUrl} secretKey={secretKey} />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isComplete) void onSubmit(code);
        }}
        noValidate
      >
        <div className={shared.field}>
          <OtpInput
            value={digits}
            onChange={setDigits}
            hasError={hasInvalidCode || hasNetworkError}
            errorMessage={
              hasNetworkError
                ? 'No pudimos conectar con el servidor. Intenta de nuevo.'
                : undefined
            }
            disabled={isValidating}
          />
        </div>

        <button type="submit" className={shared.submit} disabled={!isComplete || isValidating}>
          {isValidating ? 'Activando...' : 'Activar cuenta'}
        </button>
      </form>
    </>
  );
}
