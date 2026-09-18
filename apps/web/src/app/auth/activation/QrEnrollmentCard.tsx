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
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!qrCodeUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(qrCodeUrl, { width: 148, margin: 0 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [qrCodeUrl]);

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

      <div className={`${styles.manualSecret} ${shared.mobileOnly}`}>
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
