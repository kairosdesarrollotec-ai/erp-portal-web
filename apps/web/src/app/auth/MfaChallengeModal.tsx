import { useEffect, useRef, useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';
import styles from './MfaChallengeModal.module.css';

/**
 * TR-03 - Desafio MFA. Fuente: PANTALLAS-V2-B-TRANSVERSAL.md.
 * Prototipos aprobados: PROTO-TR-03-DESAFIO-MFA-MODAL (READY, desktop,
 * modal centrado 380px con overlay) y PROTO-TR-03-DESAFIO-MFA-MOVIL-1
 * (READY, mobile, hoja completa - regla v3.0 8.2: modales criticos en
 * movil son hoja completa, no modal flotante).
 *
 * NOTA (para Producto): existe un segundo prototipo mobile aprobado,
 * PROTO-TR-03-DESAFIO-MFA-MOVIL-2, casi identico a MOVIL-1 pero con un
 * set de iconos distinto y una descripcion que menciona "o enviado a tu
 * correo corporativo" (MOVIL-1 solo menciona la app autenticadora). Se
 * implemento con MOVIL-1 como base por ser consistente con PROP-002
 * (TOTP nativo de Firebase, sin canal de email) - queda pendiente que
 * Producto marque MOVIL-2 como superseded o aclare si el email es un
 * canal real.
 *
 * RECOVERABLE_ERROR no tiene prototipo propio - el contrato (punto 9)
 * indica explicitamente reusar "el mismo patron visual que TR-02 paso 2"
 * (casillas en rojo + mensaje debajo), igual que aqui.
 *
 * "Reenviar codigo (0:45)" aparece en ambos prototipos, pero el segundo
 * factor es TOTP (Google Authenticator/Authy - PROP-002), que no tiene
 * concepto de reenvio: el codigo lo genera la app cada 30s, nadie lo
 * envia. Se implementa tal como esta dibujado - un temporizador
 * decorativo, siempre deshabilitado - en vez de inventar una accion de
 * reenvio que no existe para TOTP. Pendiente de que Producto confirme o
 * quite este elemento del contrato.
 *
 * Este componente es intencionalmente generico (no depende de login):
 * quien lo dispare decide que pasa en onConfirm/onCancel. Hoy solo se usa
 * desde el reto de MFA recurrente en el login (HU-22); el contrato lo
 * define tambien para "cualquier accion critica", lo que queda como
 * trabajo futuro cuando exista un segundo disparador real.
 */
export type MfaChallengeState = 'READY' | 'VALIDATING' | 'RECOVERABLE_ERROR';

const RESEND_COUNTDOWN_SECONDS = 45;

interface MfaChallengeModalProps {
  isOpen: boolean;
  state: MfaChallengeState;
  onConfirm: (code: string) => void | Promise<void>;
  onCancel: () => void;
}

export function MfaChallengeModal({ isOpen, state, onConfirm, onCancel }: MfaChallengeModalProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COUNTDOWN_SECONDS);
  // Refs independientes por variante (desktop/mobile): ambas copias existen
  // simultaneamente en el DOM (visibilidad por CSS, patron TR-01/TR-02), asi
  // que NO pueden compartir un unico array de refs - solo una copia es
  // visible/interactuable a la vez segun el viewport real, y cada una debe
  // navegar (auto-avance, backspace, paste) dentro de si misma.
  const desktopRefs = useRef<Array<HTMLInputElement | null>>([]);
  const mobileRefs = useRef<Array<HTMLInputElement | null>>([]);
  const isValidating = state === 'VALIDATING';
  const hasError = state === 'RECOVERABLE_ERROR';

  useEffect(() => {
    if (!isOpen) return;
    setDigits(Array(6).fill(''));
    setSecondsLeft(RESEND_COUNTDOWN_SECONDS);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [isOpen, secondsLeft]);

  if (!isOpen) return null;

  const resendLabel = `Reenviar código (0:${String(secondsLeft).padStart(2, '0')})`;

  function handleDigitChange(
    refs: React.MutableRefObject<Array<HTMLInputElement | null>>,
    index: number,
    value: string,
  ) {
    const clean = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    if (clean && index < 5) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    refs: React.MutableRefObject<Array<HTMLInputElement | null>>,
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(
    refs: React.MutableRefObject<Array<HTMLInputElement | null>>,
    event: React.ClipboardEvent<HTMLInputElement>,
  ) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pasted)) return;
    const chars = pasted.slice(0, 6).split('');
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((char, i) => {
        next[i] = char;
      });
      return next;
    });
    refs.current[Math.min(chars.length, 5)]?.focus();
  }

  const code = digits.join('');
  const isComplete = code.length === 6;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isComplete) void onConfirm(code);
  }

  // `variant` distingue las dos copias (desktop/mobile) solo para
  // data-testid - ambas comparten el mismo aria-label ("Dígito N") porque
  // para un usuario real solo una copia es visible/alcanzable a la vez.
  function renderDigitInputs(
    refs: React.MutableRefObject<Array<HTMLInputElement | null>>,
    variant: 'desktop' | 'mobile',
  ) {
    return (
      <div className={styles.digitInputs}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoFocus={index === 0}
            aria-label={`Dígito ${index + 1}`}
            data-testid={`mfa-digit-${variant}-${index}`}
            className={`${styles.digitBox} ${hasError ? styles.digitBoxError : ''}`}
            value={digit}
            disabled={isValidating}
            onChange={(event) => handleDigitChange(refs, index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(refs, index, event)}
            onPaste={(event) => handlePaste(refs, event)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Confirma tu identidad">
      {/* ===== Desktop - PROTO-TR-03-DESAFIO-MFA-MODAL ===== */}
      <div className={`${styles.modal} ${styles.desktopOnly}`}>
        <button type="button" className={styles.closeButton} aria-label="Cerrar" onClick={onCancel}>
          <X size={16} />
        </button>
        <h2 className={styles.title}>Confirma tu identidad</h2>
        <p className={styles.subtitle}>Esta acción requiere verificación adicional</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>{renderDigitInputs(desktopRefs, 'desktop')}</div>

          {hasError && (
            <p className={styles.mfaError}>
              Código incorrecto o expirado — genera uno nuevo en tu app e intenta de nuevo
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={!isComplete || isValidating}>
            {isValidating ? 'Confirmando...' : 'Confirmar'}
          </button>

          {!hasError && <span className={styles.resendStatic}>{resendLabel}</span>}
        </form>
      </div>

      {/* ===== Mobile - PROTO-TR-03-DESAFIO-MFA-MOVIL-1 (hoja completa) ===== */}
      <div className={`${styles.sheet} ${styles.mobileOnly}`}>
        <header className={styles.sheetHeader}>
          <button type="button" className={styles.sheetClose} aria-label="Cerrar" onClick={onCancel}>
            <X size={20} />
          </button>
          <span className={styles.sheetHeaderTag}>
            <Lock size={13} />
            Verificación 2FA
          </span>
          <span className={styles.sheetHeaderSpacer} />
        </header>

        <main className={styles.sheetMain}>
          <h1 className={styles.sheetTitle}>Confirma tu identidad</h1>
          <p className={styles.sheetDescription}>
            Esta acción requiere verificación adicional. Ingresa el código de 6 dígitos generado por tu
            aplicación autenticadora.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.sheetFieldLabelRow}>
              <span className={styles.sheetFieldLabel}>Código de seguridad</span>
              <span className={styles.syncBadge}>
                <span className={styles.syncDot} />
                Sincronizado
              </span>
            </div>

            {renderDigitInputs(mobileRefs, 'mobile')}

            {hasError ? (
              <p className={styles.mfaErrorMobile}>
                Código incorrecto o expirado — genera uno nuevo en tu app e intenta de nuevo
              </p>
            ) : (
              <p className={styles.resendRow}>
                ¿No recibes el código? <span className={styles.resendStatic}>{resendLabel}</span>
              </p>
            )}

            <div className={styles.infoCard}>
              <p className={styles.infoCardText}>
                Protocolo de seguridad operativa. Esta verificación caduca en 60 segundos por normatividad
                interna de VeloxRent ERP.
              </p>
            </div>

            <div className={styles.sheetFooter}>
              <button type="submit" className={styles.submit} disabled={!isComplete || isValidating}>
                <ShieldCheck size={16} />
                {isValidating ? 'Confirmando...' : 'Confirmar'}
              </button>
              <button type="button" className={styles.cancelLink} onClick={onCancel}>
                Cancelar y regresar
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
