import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Clock, Eye, EyeOff, Lock, WifiOff } from 'lucide-react';
import { loginSchema, type LoginFormValues } from './login.schema';
import { useLogin } from './useLogin';
import { MfaChallengeModal } from './MfaChallengeModal';
import styles from './LoginScreen.module.css';

/**
 * TR-01 - Inicio de sesion.
 * Fuente: PANTALLAS-V2-B-TRANSVERSAL.md, prototipos aprobados
 * PROTO-TR-01-LOGIN-DESKTOP (READY, desktop), PROTO-TR-01-LOGIN-MOVIL (READY,
 * mobile), PROTO-TR-01-CREDENCIALES-INVALIDAS (RECOVERABLE_ERROR, desktop) y
 * PROTO-TR-01-CUENTA-BLOQUEADA (BLOCKING_ERROR, desktop).
 *
 * El prototipo mobile de READY tiene contenido propio (no es solo un reflow
 * del desktop): isotipo "VR" + wordmark en vez de solo texto, subtitulo de
 * contexto bajo el titulo, y pie de pagina con version/uso restringido.
 * Visibilidad controlada por CSS (.mobileOnly/.desktopOnly via @media), igual
 * que en TR-02. RECOVERABLE_ERROR y BLOCKING_ERROR no tienen prototipo mobile
 * propio aprobado, asi que solo reflowan (sin contenido mobile-only nuevo).
 *
 * NOTA: el campo del prototipo se llama "Correo o usuario", pero Firebase
 * Authentication (TDD-KAIROS-TRANSVERSAL 8.1/8.4) solo soporta email.
 * Mientras no exista una resolucion de usuario->email en el backend, este
 * campo se trata siempre como email.
 *
 * TR-03 (HU-22) - Desafio MFA: cuando la cuenta tiene el segundo factor
 * (TOTP) enrolado, useLogin abre mfaChallenge en vez de autenticar de una
 * vez. Ver MfaChallengeModal.tsx para el detalle de los prototipos y las
 * notas pendientes para Producto ("Reenviar codigo" incompatible con TOTP,
 * segundo prototipo mobile sin marcar superseded).
 */
export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  // SEC-F3 / TR-10 SESSION_EXPIRED: useSessionTimeout redirige aqui con ?motivo=sesion-expirada.
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('motivo') === 'sesion-expirada';
  const { state, submit, sendPasswordReset, retryActivationCheck, mfaChallenge } = useLogin();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const isValidating = state === 'VALIDATING';

  const handleForgotPassword = async () => {
    const email = getValues('emailOrUsername')?.trim();
    if (!email) {
      setError('emailOrUsername', { message: 'Ingresa tu correo para restablecer la contraseña' });
      return;
    }
    setIsResetting(true);
    setResetError(null);
    try {
      await sendPasswordReset(email);
      setResetEmailSent(true);
    } catch {
      setResetError('No se pudo enviar el correo de recuperación. Inténtalo más tarde.');
    } finally {
      setIsResetting(false);
    }
  };

  // C8: Bloqueo temporal por demasiados intentos en Firebase
  if (state === 'TOO_MANY_REQUESTS') {
    return (
      <main className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.brand}>Kairos Corporation</p>
          <div className={styles.fullScreenNotice} role="alert">
            <div className={styles.noticeIcon} style={{ color: 'var(--color-warning, #d97706)' }}>
              <Clock size={40} />
            </div>
            <h1 className={styles.noticeTitle}>Demasiados intentos fallidos</h1>
            <p className={styles.noticeSubtitle}>
              Demasiados intentos. Espera unos minutos e inténtalo de nuevo.
            </p>
            <button type="button" className={styles.noticeAction} onClick={() => window.location.reload()}>
              Volver
            </button>
          </div>
        </div>
      </main>
    );
  }

  // BLOCKING_ERROR y EXTERNAL_DEPENDENCY_PENDING reemplazan el formulario
  // por completo (tabla TR-01: EXTERNAL_DEPENDENCY_PENDING sigue "el mismo
  // patron que BLOCKING_ERROR") - PROTO-TR-01-CUENTA-BLOQUEADA.
  if (state === 'BLOCKING_ERROR' || state === 'EXTERNAL_DEPENDENCY_PENDING') {
    const isBlocked = state === 'BLOCKING_ERROR';
    return (
      <main className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.brand}>Kairos Corporation</p>
          <div className={styles.fullScreenNotice}>
            <div className={styles.noticeIcon}>
              {isBlocked ? <Lock size={40} /> : <WifiOff size={40} />}
            </div>
            <h1 className={styles.noticeTitle}>
              {isBlocked ? 'Tu cuenta está bloqueada' : 'Servicio no disponible'}
            </h1>
            <p className={styles.noticeSubtitle}>
              {isBlocked
                ? 'Contacta a tu administrador para reactivarla'
                : 'Intenta en unos minutos'}
            </p>
            <button type="button" className={styles.noticeAction} onClick={() => window.location.reload()}>
              Volver
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ACTIVATION_CHECK_FAILED (hallazgo de revision, portado del fix
  // fail-closed de HU-21): el usuario ya se autentico en Firebase (login
  // directo o via reto MFA de TR-03) pero no se pudo confirmar con el
  // backend si tiene una activacion pendiente - no se navega al tablero "a
  // ciegas". Se ofrece reintentar sin pedir credenciales de nuevo.
  if (state === 'ACTIVATION_CHECK_FAILED') {
    return (
      <main className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.brand}>Kairos Corporation</p>
          <div className={styles.fullScreenNotice} role="alert">
            <div className={styles.noticeIcon}>
              <AlertCircle size={40} />
            </div>
            <h1 className={styles.noticeTitle}>No pudimos verificar tu cuenta</h1>
            <p className={styles.noticeSubtitle}>
              Intenta de nuevo en unos minutos. Si el problema continúa, contacta a tu administrador.
            </p>
            <button type="button" className={styles.noticeAction} onClick={() => void retryActivationCheck()}>
              Reintentar
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <div className={`${styles.brandRow} ${styles.mobileOnly}`}>
          <span className={styles.brandMark}>KC</span>
          <span className={styles.brandWordmark}>Kairos Corporation</span>
        </div>
        <p className={`${styles.brand} ${styles.desktopOnly}`}>Kairos Corporation</p>
        <h1 className={styles.title}>Ingresa a tu cuenta</h1>
        <p className={`${styles.subtitle} ${styles.mobileOnly}`}>
          Acceso al sistema interno de gestión operativa
        </p>

        {sessionExpired && (
          <p role="status" className={styles.sessionExpiredNotice}>
            Tu sesión expiró. Vuelve a iniciar sesión para continuar.
          </p>
        )}

        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="emailOrUsername">
              Correo o usuario
            </label>
            <input
              id="emailOrUsername"
              type="text"
              autoComplete="username"
              placeholder="nombre@veloxrent.pe o usuario"
              className={styles.input}
              disabled={isValidating}
              autoFocus
              {...register('emailOrUsername')}
            />
            {errors.emailOrUsername && (
              <p className={styles.fieldError}>{errors.emailOrUsername.message}</p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Contraseña
            </label>
            <div className={styles.passwordRow}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                className={styles.input}
                disabled={isValidating}
                {...register('password')}
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
            {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}
          </div>

          {state === 'RECOVERABLE_ERROR' && (
            <div role="alert" className={styles.alertBanner}>
              <AlertCircle size={18} />
              <span>Correo o contraseña incorrectos</span>
            </div>
          )}

          <button type="submit" className={styles.submit} disabled={isValidating}>
            {isValidating ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className={styles.forgotPasswordContainer}>
          <button
            type="button"
            className={styles.forgotPasswordButton}
            onClick={handleForgotPassword}
            disabled={isValidating || isResetting}
          >
            {isResetting ? 'Enviando enlace...' : '¿Olvidaste tu contraseña?'}
          </button>
          <div style={{ marginTop: '0.25rem' }}>
            <Link to="/recuperar-acceso" className={styles.forgotPasswordButton} style={{ fontSize: '12px', opacity: 0.8 }}>
              Ir a recuperación de acceso
            </Link>
          </div>
        </div>

        {resetEmailSent && (
          <p role="status" className={styles.resetSuccessNotice} data-testid="reset-email-success">
            Se envió un enlace para restablecer tu contraseña a tu correo.
          </p>
        )}
        {resetError && (
          <p role="alert" className={styles.fieldError} style={{ textAlign: 'center' }}>
            {resetError}
          </p>
        )}

        <p className={`${styles.mobileFooter} ${styles.mobileOnly}`}>
          Kairos Corporation ERP v2.6 · Uso exclusivo para personal autorizado
        </p>
      </div>

      <MfaChallengeModal
        isOpen={mfaChallenge.isOpen}
        state={mfaChallenge.state}
        onConfirm={mfaChallenge.onConfirm}
        onCancel={mfaChallenge.onCancel}
      />
    </main>
  );
}
