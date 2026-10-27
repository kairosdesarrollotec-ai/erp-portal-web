import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail, type AuthError } from 'firebase/auth';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { getFirebaseAuth } from '../providers/firebase';
import styles from './LoginScreen.module.css';

export type PasswordResetState = 'READY' | 'VALIDATING' | 'SUCCESS';

export function PasswordResetScreen() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<PasswordResetState>('READY');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Ingresa tu correo electrónico');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Ingresa un correo electrónico válido');
      return;
    }

    setError(null);
    setState('VALIDATING');

    try {
      await sendPasswordResetEmail(getFirebaseAuth(), cleanEmail);
      setState('SUCCESS');
    } catch (err) {
      const authError = err as AuthError;
      // TR-04 / Anti-enumeration: No revelar si el correo existe o no en el sistema
      if (authError.code === 'auth/user-not-found') {
        setState('SUCCESS');
        return;
      }
      if (authError.code === 'auth/invalid-email') {
        setError('El formato del correo es inválido');
        setState('READY');
        return;
      }
      if (authError.code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
        setState('READY');
        return;
      }
      setError('No se pudo enviar el correo de recuperación. Inténtalo más tarde.');
      setState('READY');
    }
  };

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.brand}>Kairos Corporation</p>
        <h1 className={styles.title}>Recuperar acceso</h1>

        {state === 'SUCCESS' ? (
          <div role="status" className={styles.fullScreenNotice} data-testid="reset-success-card">
            <div className={styles.noticeIcon} style={{ color: 'var(--color-success, #16a34a)' }}>
              <CheckCircle size={40} />
            </div>
            <h2 className={styles.noticeTitle}>Revisa tu correo</h2>
            <p className={styles.noticeSubtitle}>
              Si el correo está registrado, te llegará un enlace de restablecimiento. Revisa tu bandeja de entrada o spam.
            </p>
            <Link to="/login" className={styles.noticeAction} style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <>
            <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
              Ingresa tu correo para recibir las instrucciones de restablecimiento de contraseña.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="resetEmail">
                  Correo electrónico
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@veloxrent.pe"
                  className={styles.input}
                  disabled={state === 'VALIDATING'}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  autoFocus
                />
                {error && <p className={styles.fieldError}>{error}</p>}
              </div>

              <button
                type="submit"
                className={styles.submit}
                disabled={state === 'VALIDATING'}
              >
                {state === 'VALIDATING' ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '14px',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                }}
              >
                <ArrowLeft size={16} /> Volver a iniciar sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
