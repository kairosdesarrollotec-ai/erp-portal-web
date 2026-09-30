import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { activationPasswordSchema, evaluatePasswordRequirements } from '../activation.schema';
import type { ActivationPasswordFormValues } from '../activation.schema';
import type { PasswordStepErrorKind } from '../useActivation';
import shared from './shared.module.css';
import styles from './PasswordStep.module.css';

const PASSWORD_ERROR_MESSAGES: Record<PasswordStepErrorKind, string> = {
  REAUTH_REQUIRED: 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.',
  NETWORK_ERROR: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
  VALIDATION_ERROR: 'No pudimos guardar tu nueva contraseña. Intenta de nuevo.',
};

/**
 * TR-02 paso 1 - Crea tu nueva contraseña. Extraido de ActivationScreen.tsx
 * (hallazgo de revision: tamaño/responsabilidad del archivo original).
 */
export function PasswordStep({
  isValidating,
  passwordError,
  onSubmit,
}: {
  isValidating: boolean;
  passwordError: PasswordStepErrorKind | null;
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

  // eslint-disable-next-line react-hooks/incompatible-library
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
        <p className={`${styles.greetingDescription} ${shared.mobileOnly}`}>
          Configura tu credencial corporativa para acceder a la plataforma interna.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {passwordError && (
          <div role="alert" className={shared.stepAlert}>
            <AlertCircle size={16} />
            <span>{PASSWORD_ERROR_MESSAGES[passwordError]}</span>
          </div>
        )}

        <div className={shared.field}>
          <label className={shared.label} htmlFor="newPassword">
            Nueva contraseña
          </label>
          <div className={shared.passwordRow}>
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={shared.input}
              disabled={isValidating}
              autoFocus
              {...register('newPassword')}
            />
            <button
              type="button"
              className={shared.toggleVisibility}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className={shared.field}>
          <label className={shared.label} htmlFor="confirmPassword">
            Confirmar contraseña
          </label>
          <div className={shared.passwordRow}>
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={shared.input}
              disabled={isValidating}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              className={shared.toggleVisibility}
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className={shared.fieldError}>{errors.confirmPassword.message}</p>
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
              className={shared.mobileOnly}
            />
          </ul>
        </div>

        <button
          type="submit"
          className={shared.submit}
          disabled={!allRequirementsMet || !passwordsMatch || isValidating}
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
