import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, Copy, Eye, EyeOff, Key, User } from 'lucide-react';
import QRCode from 'qrcode';
import { activationPasswordSchema, evaluatePasswordRequirements } from './activation.schema';
import type { ActivationPasswordFormValues } from './activation.schema';
import { useActivation } from './useActivation';
import styles from './ActivationScreen.module.css';

/**
 * TR-02 - Activa tu cuenta. Fuente: PANTALLAS-V2-B-TRANSVERSAL.md. Los 6
 * prototipos (desktop + mobile x 3 estados) estan aprobados por Producto:
 * PROTO-TR-02-ACTIVACION-PASO-1 / -PASO-1-MOVIL (READY), PROTO-TR-02-
 * ACTIVACION-PASO-2 / -PASO-2-MOVIL (READY), PROTO-TR-02-ACTIVACION-
 * PASO-2-ERROR / -PASO-2-ERROR-MOVIL (RECOVERABLE_ERROR).
 *
 * El layout mobile del prototipo tiene contenido propio (no es solo un
 * reflow del desktop): header fijo con boton "atras" en paso 2, texto de
 * contexto adicional, y un boton "Ingresar clave manual" como alternativa
 * al QR. Esos bloques se marcan con .mobileOnly/.desktopOnly (visibilidad
 * controlada por CSS via @media, no por JS) para no duplicar componentes.
 */
export function ActivationScreen() {
  const { step, state, qrCodeUrl, secretKey, submitPassword, submitMfaCode } = useActivation();

  return (
    <main className={styles.wrapper}>
      {step === 'MFA' && (
        <header className={`${styles.mobileHeader} ${styles.mobileOnly}`}>
          <button
            type="button"
            className={styles.mobileBack}
            aria-label="Volver"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={20} />
          </button>
          <span className={styles.mobileHeaderTag}>Verificación 2FA</span>
          <span className={styles.mobileHeaderAvatar}>
            <User size={18} />
          </span>
        </header>
      )}
      <div className={styles.card}>
        <p className={`${styles.brand} ${step === 'MFA' ? styles.desktopOnly : ''}`}>VeloxRent</p>
        <Stepper activeStep={step === 'PASSWORD' ? 1 : 2} />
        {step === 'PASSWORD' ? (
          <PasswordStep isValidating={state === 'VALIDATING'} onSubmit={submitPassword} />
        ) : (
          <MfaStep
            isValidating={state === 'VALIDATING'}
            hasError={state === 'RECOVERABLE_ERROR'}
            qrCodeUrl={qrCodeUrl}
            secretKey={secretKey}
            onSubmit={submitMfaCode}
          />
        )}
      </div>
    </main>
  );
}

function Stepper({ activeStep }: { activeStep: 1 | 2 }) {
  return (
    <div className={styles.stepperContainer} aria-label="Progreso de activación">
      <div className={styles.stepperDots}>
        <span className={styles.dot} aria-current={activeStep === 1 ? 'step' : undefined} />
        <span className={styles.stepLine} />
        <span
          className={`${styles.dot} ${activeStep === 1 ? styles.dotInactive : ''}`}
          aria-current={activeStep === 2 ? 'step' : undefined}
        />
      </div>
      <span className={styles.stepLabel}>PASO {activeStep} DE 2</span>
    </div>
  );
}

function PasswordStep({
  isValidating,
  onSubmit,
}: {
  isValidating: boolean;
  onSubmit: (values: ActivationPasswordFormValues) => void | Promise<void>;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ActivationPasswordFormValues>({
    resolver: zodResolver(activationPasswordSchema),
    mode: 'onChange',
  });

  const newPassword = watch('newPassword') ?? '';
  const confirmPassword = watch('confirmPassword') ?? '';
  const requirements = evaluatePasswordRequirements(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const allRequirementsMet =
    requirements.hasLength && requirements.hasUpper && requirements.hasNumber;

  return (
    <>
      <div className={styles.greeting}>
        <h1 className={styles.greetingTitle}>Hola</h1>
        <h2 className={styles.greetingSubtitle}>Crea tu nueva contraseña</h2>
        <p className={`${styles.greetingDescription} ${styles.mobileOnly}`}>
          Configura tu credencial corporativa para acceder a la plataforma interna.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="newPassword">
            Nueva contraseña
          </label>
          <div className={styles.passwordRow}>
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={styles.input}
              disabled={isValidating}
              autoFocus
              {...register('newPassword')}
            />
            <button
              type="button"
              className={styles.toggleVisibility}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirmPassword">
            Confirmar contraseña
          </label>
          <div className={styles.passwordRow}>
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={styles.input}
              disabled={isValidating}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              className={styles.toggleVisibility}
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className={styles.fieldError}>{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className={styles.requirements}>
          <p className={styles.requirementsLabel}>Tu contraseña debe contener:</p>
          <ul className={styles.requirementsList}>
            <RequirementItem met={requirements.hasLength} label="Mínimo 8 caracteres" />
            <RequirementItem met={requirements.hasUpper} label="Al menos una letra mayúscula" />
            <RequirementItem met={requirements.hasNumber} label="Al menos un número" />
            <RequirementItem
              met={passwordsMatch}
              label="Ambas contraseñas son idénticas"
              className={styles.mobileOnly}
            />
          </ul>
        </div>

        <button
          type="submit"
          className={styles.submit}
          disabled={!allRequirementsMet || isValidating}
        >
          {isValidating ? 'Continuando...' : 'Continuar'}
        </button>
      </form>
    </>
  );
}

function RequirementItem({
  met,
  label,
  className,
}: {
  met: boolean;
  label: string;
  className?: string;
}) {
  return (
    <li
      className={`${styles.requirementItem} ${met ? styles.requirementItemMet : ''} ${className ?? ''}`}
    >
      <span className={`${styles.requirementIcon} ${met ? styles.requirementIconMet : ''}`}>
        {met && (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <polyline
              points="3.5 8.5 6.5 11.5 12.5 4.5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </li>
  );
}

function MfaStep({
  isValidating,
  hasError,
  qrCodeUrl,
  secretKey,
  onSubmit,
}: {
  isValidating: boolean;
  hasError: boolean;
  qrCodeUrl: string | null;
  secretKey: string | null;
  onSubmit: (code: string) => void | Promise<void>;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!qrCodeUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(qrCodeUrl, { width: 148, margin: 0 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [qrCodeUrl]);

  function handleDigitChange(index: number, value: string) {
    const clean = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
    const nextIndex = Math.min(chars.length, 5);
    inputRefs.current[nextIndex]?.focus();
  }

  const code = digits.join('');
  const isComplete = code.length === 6;
  const formattedSecret = secretKey ? secretKey.replace(/(.{4})/g, '$1-').replace(/-$/, '') : '';

  function handleCopySecret() {
    if (!secretKey) return;
    void navigator.clipboard.writeText(secretKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <h1 className={styles.title}>Protege tu cuenta</h1>
      <p className={`${styles.mfaDescription} ${styles.mobileOnly}`}>
        Escanea el código QR con tu aplicación autenticadora (Google Authenticator, Microsoft
        Authenticator o similar) e ingresa el código de 6 dígitos generado.
      </p>

      <div className={styles.qrCard}>
        <div className={styles.qrBox}>
          {qrDataUrl && <img src={qrDataUrl} alt="Código QR para app de autenticación" width={148} height={148} />}
        </div>
        <p className={`${styles.helpText} ${styles.desktopOnly}`}>
          Escanea este código con tu app de autenticación (Google Authenticator, Authy, etc.)
        </p>

        <div className={`${styles.manualSecret} ${styles.mobileOnly}`}>
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

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isComplete) void onSubmit(code);
        }}
        noValidate
      >
        <div className={styles.field}>
          <label className={styles.label}>Código de 6 dígitos</label>
          <div className={styles.digitInputs}>
            {digits.map((digit, index) => (
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
                disabled={isValidating}
                onChange={(event) => handleDigitChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
              />
            ))}
          </div>
          {hasError ? (
            <p className={styles.mfaError}>
              Código incorrecto o expirado — genera uno nuevo en tu app e intenta de nuevo
            </p>
          ) : (
            <p className={`${styles.mfaHint} ${styles.mobileOnly}`}>
              Ingresa el código temporal de 6 dígitos de tu app
            </p>
          )}
        </div>

        <button type="submit" className={styles.submit} disabled={!isComplete || isValidating}>
          {isValidating ? 'Activando...' : 'Activar cuenta'}
        </button>
      </form>
    </>
  );
}
