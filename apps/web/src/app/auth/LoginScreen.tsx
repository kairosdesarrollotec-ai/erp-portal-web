import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, Lock, WifiOff } from 'lucide-react';
import { loginSchema, type LoginFormValues } from './login.schema';
import { useLogin } from './useLogin';
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
 */
export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const { state, submit } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const isValidating = state === 'VALIDATING';

  // BLOCKING_ERROR y EXTERNAL_DEPENDENCY_PENDING reemplazan el formulario
  // por completo (tabla TR-01: EXTERNAL_DEPENDENCY_PENDING sigue "el mismo
  // patron que BLOCKING_ERROR") - PROTO-TR-01-CUENTA-BLOQUEADA.
  if (state === 'BLOCKING_ERROR' || state === 'EXTERNAL_DEPENDENCY_PENDING') {
    const isBlocked = state === 'BLOCKING_ERROR';
    return (
      <main className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.brand}>VeloxRent</p>
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

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <div className={`${styles.brandRow} ${styles.mobileOnly}`}>
          <span className={styles.brandMark}>VR</span>
          <span className={styles.brandWordmark}>VeloxRent</span>
        </div>
        <p className={`${styles.brand} ${styles.desktopOnly}`}>VeloxRent</p>
        <h1 className={styles.title}>Ingresa a tu cuenta</h1>
        <p className={`${styles.subtitle} ${styles.mobileOnly}`}>
          Acceso al sistema interno de gestión operativa
        </p>

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

        <button type="button" className={styles.forgotPassword}>
          ¿Olvidaste tu contraseña?
        </button>

        <p className={`${styles.mobileFooter} ${styles.mobileOnly}`}>
          VeloxRent ERP v2.6 · Uso exclusivo para personal autorizado
        </p>
      </div>
    </main>
  );
}
