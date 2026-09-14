import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from './login.schema';
import { useLogin } from './useLogin';
import styles from './LoginScreen.module.css';

/**
 * TR-01 - Inicio de sesion.
 * Fuente: PANTALLAS-V2-B-TRANSVERSAL.md, prototipos aprobados
 * PROTO-TR-01-LOGIN-MOVIL (READY, movil), PROTO-TR-01-CREDENCIALES-INVALIDAS
 * (ERROR, desktop), PROTO-TR-01-CUENTA-BLOQUEADA (BLOCKED, desktop).
 *
 * NOTA de trazabilidad: no existe un prototipo aprobado READY en desktop
 * (solo movil) - el layout desktop de esta implementacion sigue el
 * contrato escrito de la tabla TR-01 (punto 12: "mismo layout en los 3
 * breakpoints, ancho maximo 380px"), validado cruzando los prototipos
 * ERROR/BLOCKED de desktop que comparten esa misma base. Pendiente:
 * solicitar el prototipo READY desktop para cerrar este hueco.
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
  const isBlocked = state === 'BLOCKING_ERROR';

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.brand}>VeloxRent</p>
        <h1 className={styles.title}>Ingresa a tu cuenta</h1>

        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="emailOrUsername">
              Correo o usuario
            </label>
            <input
              id="emailOrUsername"
              type="text"
              autoComplete="username"
              className={styles.input}
              disabled={isValidating || isBlocked}
              {...register('emailOrUsername')}
            />
            {errors.emailOrUsername && (
              <p className={styles.fieldError}>{errors.emailOrUsername.message}</p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Contrasena
            </label>
            <div className={styles.passwordRow}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={styles.input}
                disabled={isValidating || isBlocked}
                {...register('password')}
              />
              <button
                type="button"
                className={styles.toggleVisibility}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}
          </div>

          <button type="submit" className={styles.submit} disabled={isValidating || isBlocked}>
            {isValidating ? 'Ingresando...' : 'Ingresar'}
          </button>

          {state === 'RECOVERABLE_ERROR' && (
            <p role="alert" className={styles.recoverableError}>
              Credenciales invalidas
            </p>
          )}
          {state === 'BLOCKING_ERROR' && (
            <p role="alert" className={styles.blockingError}>
              Cuenta bloqueada, contacta a tu administrador
            </p>
          )}
          {state === 'EXTERNAL_DEPENDENCY_PENDING' && (
            <p role="alert" className={styles.externalDependencyError}>
              Servicio no disponible, intenta en unos minutos
            </p>
          )}
        </form>

        <button type="button" className={styles.forgotPassword}>
          ¿Olvidaste tu contrasena?
        </button>
      </div>
    </main>
  );
}
