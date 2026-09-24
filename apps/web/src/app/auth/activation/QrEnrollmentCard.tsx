import { useEffect, useState } from 'react';
import { Check, Copy, Key } from 'lucide-react';
import QRCode from 'qrcode';
import shared from './shared.module.css';
import styles from './QrEnrollmentCard.module.css';

/**
 * Tarjeta con el QR de enrolamiento TOTP + alternativa de clave manual.
 * Extraido de ActivationScreen.tsx (hallazgo de revision: tamaño/
 * responsabilidad del archivo original).
 */
export function QrEnrollmentCard({
  qrCodeUrl,
  secretKey,
}: {
  qrCodeUrl: string | null;
  secretKey: string | null;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  // regla de eslint react-hooks/set-state-in-effect: "ajustar estado
  // cuando cambia una prop" se hace durante el render (patron oficial de
  // React: https://react.dev/learn/you-might-not-need-an-effect), no
  // dentro del cuerpo del efecto - evita el round-trip de render extra
  // que produce un setState sincrono al inicio de un useEffect.
  const [trackedCodeUrl, setTrackedCodeUrl] = useState(qrCodeUrl);
  if (qrCodeUrl !== trackedCodeUrl) {
    setTrackedCodeUrl(qrCodeUrl);
    setQrDataUrl(null);
    setQrError(false);
  }

  // Hallazgo medio de revalidacion PR#4 ("fallo al generar el QR bloquea
  // activacion en desktop"): antes, si QRCode.toDataURL() rechazaba, se
  // dejaba qrDataUrl=null y la alternativa de clave manual estaba
  // restringida a mobileOnly (oculta en desktop via CSS) - un usuario de
  // escritorio se quedaba con un recuadro vacio sin alternativa ni forma
  // de reintentar. Ahora se rastrea el error explicitamente y, cuando
  // ocurre, la clave manual se muestra en cualquier breakpoint junto con
  // un mensaje accesible y un boton de reintento.
  useEffect(() => {
    if (!qrCodeUrl) {
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(qrCodeUrl, { width: 148, margin: 0 })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setQrError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          setQrError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [qrCodeUrl, retryCount]);

  const formattedSecret = secretKey ? secretKey.replace(/(.{4})/g, '$1-').replace(/-$/, '') : '';

  function handleCopySecret() {
    if (!secretKey) return;
    void navigator.clipboard.writeText(secretKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={styles.qrCard}>
      <div className={styles.qrBox}>
        {qrDataUrl && <img src={qrDataUrl} alt="Código QR para app de autenticación" width={148} height={148} />}
      </div>
      <p className={`${styles.helpText} ${shared.desktopOnly}`}>
        Escanea este código con tu app de autenticación (Google Authenticator, Authy, etc.)
      </p>

      {qrError && (
        <p role="alert" className={styles.qrErrorText}>
          No pudimos generar el código QR. Usa la clave manual o vuelve a
          intentarlo.{' '}
          <button type="button" className={styles.qrRetryButton} onClick={() => setRetryCount((c) => c + 1)}>
            Reintentar
          </button>
        </p>
      )}

      <div className={`${styles.manualSecret} ${qrError ? styles.manualSecretForced : shared.mobileOnly}`}>
        <button
          type="button"
          className={styles.manualSecretToggle}
          onClick={() => setShowSecret((v) => !v)}
        >
          <Key size={16} />
          <span>¿No puedes escanear el código? Ingresar clave manual</span>
        </button>
        {showSecret && secretKey && (
          <div className={styles.manualSecretPanel}>
            <div>
              <span className={styles.manualSecretLabel}>Clave secreta segura</span>
              <span className={styles.manualSecretValue}>{formattedSecret}</span>
            </div>
            <button
              type="button"
              className={styles.manualSecretCopy}
              onClick={handleCopySecret}
              aria-label="Copiar clave secreta"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
