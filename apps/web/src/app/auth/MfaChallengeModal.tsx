import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertCircle, Lock, ShieldCheck, WifiOff, X } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
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
 * Este componente es intencionalmente generico (no depende de login):
 * quien lo dispare decide que pasa en onConfirm/onCancel. Hoy solo se usa
 * desde el reto de MFA recurrente en el login (HU-22); el contrato lo
 * define tambien para "cualquier accion critica", lo que queda como
 * trabajo futuro cuando exista un segundo disparador real.
 *
 * Hallazgos de revision corregidos en esta version:
 * - Foco: se delega a @radix-ui/react-dialog (ya era dependencia del
 *   proyecto, sin usar) en vez de reimplementar focus trap/Escape/
 *   restauracion de foco a mano - Dialog.Content ya hace las tres cosas.
 *   El cierre por click en el overlay queda deshabilitado a proposito
 *   (onPointerDownOutside/onInteractOutside) para no cambiar el
 *   comportamiento existente: solo "Cancelar"/cerrar cierran el reto.
 * - Una sola variante montada a la vez (useMediaQuery), no desktop+mobile
 *   simultaneos ocultos con CSS - evita doble autoFocus, doble formulario
 *   para el lector de pantalla y autocomplete ambiguo.
 * - "Reenviar codigo" (decorativo, TOTP no tiene reenvio) se retira. En su
 *   lugar, una nota correcta sobre la renovacion periodica del codigo.
 * - Casillas de codigo con aria-invalid/aria-describedby, mensaje de error
 *   con role="alert".
 * - Estados SESSION_EXPIRED / UNSUPPORTED_FACTOR / VERIFICATION_UNAVAILABLE
 *   (ver useLogin.ts) con su propio mensaje - nunca se le dice al usuario
 *   "código incorrecto" para un problema que no es el código.
 *
 * Restauracion de foco (nota tecnica): Dialog.Content de Radix solo
 * restaura el foco automaticamente al elemento que abrio el dialogo cuando
 * ese elemento es un <Dialog.Trigger>. Este componente es generico (ver
 * arriba) y quien lo dispara vive en otro componente (el boton "Ingresar"
 * de LoginScreen), asi que no hay un Dialog.Trigger que envolver aqui. Por
 * eso se guarda manualmente el elemento con foco al abrirse (triggerRef) y
 * se restaura a mano en onCloseAutoFocus - sin esto, Radix llama
 * preventDefault() internamente para el caso modal y el foco queda perdido
 * en document.body al cerrar (hallazgo de revision).
 */
export type MfaChallengeState =
  | 'READY'
  | 'VALIDATING'
  | 'RECOVERABLE_ERROR'
  | 'VERIFICATION_UNAVAILABLE'
  | 'SESSION_EXPIRED'
  | 'UNSUPPORTED_FACTOR';

interface MfaChallengeModalProps {
  isOpen: boolean;
  state: MfaChallengeState;
  onConfirm: (code: string) => void | Promise<void>;
  onCancel: () => void;
}

const ERROR_MESSAGE_ID = 'mfa-challenge-error';

export function MfaChallengeModal({ isOpen, state, onConfirm, onCancel }: MfaChallengeModalProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const isMobile = useMediaQuery('(max-width: 480px)');
  // Elemento que tenia el foco justo antes de abrirse (normalmente el
  // boton "Ingresar" de LoginScreen) - ver nota de "Restauracion de foco"
  // arriba del componente.
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen]);

  const isValidating = state === 'VALIDATING';
  // RECOVERABLE_ERROR (codigo invalido) y VERIFICATION_UNAVAILABLE (no se
  // pudo verificar - red/backend) permiten reintentar con el mismo u otro
  // codigo, asi que ambas muestran las casillas en rojo. SESSION_EXPIRED y
  // UNSUPPORTED_FACTOR son bloqueantes - ningun codigo puede resolverlos,
  // asi que ni siquiera se muestran las casillas (ver `isBlocked` abajo).
  const hasRetryableError = state === 'RECOVERABLE_ERROR' || state === 'VERIFICATION_UNAVAILABLE';
  const isBlocked = state === 'SESSION_EXPIRED' || state === 'UNSUPPORTED_FACTOR';

  // Hallazgo de lint (react-hooks/set-state-in-effect, PR#4 Bloque 2):
  // resetear las casillas de forma sincronica en un efecto disparaba un
  // render en cascada evitable. Se ajusta durante el render, comparando
  // contra el ultimo `isOpen` visto (patron oficial de React:
  // https://react.dev/learn/you-might-not-need-an-effect), en vez de
  // esperar al efecto para sincronizarlo.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setDigits(Array(6).fill(''));
    }
  }

  if (!isOpen) return null;

  function handleDigitChange(index: number, value: string) {
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

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
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

  function handleOpenChange(open: boolean) {
    if (!open) onCancel();
  }

  const errorMessage =
    state === 'RECOVERABLE_ERROR'
      ? 'Código incorrecto o expirado — genera uno nuevo en tu app e intenta de nuevo'
      : state === 'VERIFICATION_UNAVAILABLE'
        ? 'No pudimos verificar el código por un problema de conexión. Intenta de nuevo.'
        : null;

  const digitInputs = (
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
          aria-invalid={hasRetryableError}
          aria-describedby={hasRetryableError ? ERROR_MESSAGE_ID : undefined}
          data-testid={`mfa-digit-${index}`}
          className={`${styles.digitBox} ${hasRetryableError ? styles.digitBoxError : ''}`}
          value={digit}
          disabled={isValidating}
          onChange={(event) => handleDigitChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );

  // Nota correcta de renovacion (reemplaza el "Reenviar código" decorativo
  // - TOTP no tiene reenvio, lo genera la app cada 30s).
  const renewalHint = 'El código cambia automáticamente cada 30 segundos en tu app autenticadora.';

  const blockedMessage =
    state === 'SESSION_EXPIRED'
      ? {
          icon: <WifiOff size={32} />,
          title: 'Tu sesión de verificación expiró',
          body: 'Cierra esta ventana e inicia sesión de nuevo para generar un nuevo reto de verificación.',
        }
      : {
          // UNSUPPORTED_FACTOR
          icon: <AlertCircle size={32} />,
          title: 'No podemos verificar este método desde aquí',
          body: 'Tu cuenta no tiene un código de aplicación autenticadora (TOTP) disponible. Contacta a tu administrador.',
        };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <div className={styles.overlay}>
          <Dialog.Content
            asChild
            // El reto de MFA no se cierra por click fuera / Escape en
            // silencio - solo "Cancelar"/cerrar explicito, mismo
            // comportamiento que tenia antes de agregar Dialog. Escape SI
            // sigue funcionando (dispara onOpenChange(false) -> onCancel),
            // que es justamente el hallazgo que pedia la revision.
            onPointerDownOutside={(event: { preventDefault: () => void }) => event.preventDefault()}
            onInteractOutside={(event: { preventDefault: () => void }) => event.preventDefault()}
            onCloseAutoFocus={(event: { preventDefault: () => void }) => {
              event.preventDefault();
              triggerRef.current?.focus();
            }}
          >
            <div className={isMobile ? styles.sheet : styles.modal}>
              {isMobile ? (
                <>
                  <header className={styles.sheetHeader}>
                    <Dialog.Close asChild>
                      <button type="button" className={styles.sheetClose} aria-label="Cerrar" onClick={onCancel}>
                        <X size={20} />
                      </button>
                    </Dialog.Close>
                    <span className={styles.sheetHeaderTag}>
                      <Lock size={13} />
                      Verificación 2FA
                    </span>
                    <span className={styles.sheetHeaderSpacer} />
                  </header>

                  <main className={styles.sheetMain}>
                    <Dialog.Title asChild>
                      <h1 className={styles.sheetTitle}>Confirma tu identidad</h1>
                    </Dialog.Title>

                    {isBlocked ? (
                      <div className={styles.blockedNotice} role="alert">
                        <div className={styles.blockedIcon}>{blockedMessage.icon}</div>
                        <p className={styles.blockedTitle}>{blockedMessage.title}</p>
                        <p className={styles.blockedBody}>{blockedMessage.body}</p>
                      </div>
                    ) : (
                      <>
                        <p className={styles.sheetDescription}>
                          Esta acción requiere verificación adicional. Ingresa el código de 6 dígitos generado
                          por tu aplicación autenticadora.
                        </p>

                        <form onSubmit={handleSubmit} noValidate>
                          <div className={styles.sheetFieldLabelRow}>
                            <span className={styles.sheetFieldLabel}>Código de seguridad</span>
                            <span className={styles.syncBadge}>
                              <span className={styles.syncDot} />
                              Sincronizado
                            </span>
                          </div>

                          {digitInputs}

                          {errorMessage ? (
                            <p id={ERROR_MESSAGE_ID} role="alert" className={styles.mfaErrorMobile}>
                              {errorMessage}
                            </p>
                          ) : (
                            <p className={styles.resendRow}>{renewalHint}</p>
                          )}

                          <div className={styles.infoCard}>
                            <p className={styles.infoCardText}>
                              Protocolo de seguridad operativa. Esta verificación caduca en 60 segundos por
                              normatividad interna de Kairos Corporation ERP.
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
                      </>
                    )}

                    {isBlocked && (
                      <button type="button" className={`${styles.submit} ${styles.blockedAction}`} onClick={onCancel}>
                        Cerrar
                      </button>
                    )}
                  </main>
                </>
              ) : (
                <>
                  <Dialog.Close asChild>
                    <button type="button" className={styles.closeButton} aria-label="Cerrar" onClick={onCancel}>
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                  <Dialog.Title asChild>
                    <h2 className={styles.title}>Confirma tu identidad</h2>
                  </Dialog.Title>

                  {isBlocked ? (
                    <div className={styles.blockedNotice} role="alert">
                      <div className={styles.blockedIcon}>{blockedMessage.icon}</div>
                      <p className={styles.blockedTitle}>{blockedMessage.title}</p>
                      <p className={styles.blockedBody}>{blockedMessage.body}</p>
                      <button type="button" className={styles.submit} onClick={onCancel}>
                        Cerrar
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className={styles.subtitle}>Esta acción requiere verificación adicional</p>

                      <form onSubmit={handleSubmit} noValidate>
                        <div className={styles.field}>{digitInputs}</div>

                        {errorMessage && (
                          <p id={ERROR_MESSAGE_ID} role="alert" className={styles.mfaError}>
                            {errorMessage}
                          </p>
                        )}

                        <button type="submit" className={styles.submit} disabled={!isComplete || isValidating}>
                          {isValidating ? 'Confirmando...' : 'Confirmar'}
                        </button>

                        {!errorMessage && <span className={styles.resendStatic}>{renewalHint}</span>}
                      </form>
                    </>
                  )}
                </>
              )}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
