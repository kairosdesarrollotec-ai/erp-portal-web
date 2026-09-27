import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, LogIn, User } from 'lucide-react';
import { PasswordStep } from './activation/PasswordStep';
import { TotpEnrollmentStep } from './activation/TotpEnrollmentStep';
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
 * Cobertura mobile real: los 3 estados con prototipo (paso 1, paso 2 y
 * paso 2 con error) tienen su layout mobile aprobado implementado; los
 * estados sin prototipo propio (LOADING, BACKEND_UNAVAILABLE,
 * REAUTH_REQUIRED, NETWORK_ERROR) son texto plano que hereda el mismo
 * wrapper/card responsive, sin un mockup mobile especifico que replicar.
 *
 * El paso 1 (PasswordStep) y el paso 2 (TotpEnrollmentStep, con
 * QrEnrollmentCard + OtpInput) viven en archivos propios bajo ./activation
 * (hallazgo de revision: tamaño/responsabilidad de este archivo).
 */
export function ActivationScreen() {
  const {
    step,
    state,
    passwordError,
    qrCodeUrl,
    secretKey,
    submitPassword,
    submitMfaCode,
    retryCompleteActivation,
  } = useActivation();
  const navigate = useNavigate();

  if (state === 'LOADING') {
    return (
      <main className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.brand}>Kairos Corporation</p>
          <div className={styles.loadingNotice} role="status" aria-live="polite">
            <Loader2 size={28} aria-hidden="true" />
          </div>
        </div>
      </main>
    );
  }

  if (state === 'REAUTH_REQUIRED') {
    return (
      <main className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.brand}>Kairos Corporation</p>
          <div role="alert">
            <h1>Tu sesión expiró</h1>
            <p>Vuelve a iniciar sesión para continuar con la activación de tu cuenta.</p>
            <button type="button" onClick={() => navigate('/')}>
              <LogIn size={16} /> Volver a iniciar sesión
            </button>
          </div>
        </div>
      </main>
    );
  }

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
        <p className={`${styles.brand} ${step === 'MFA' ? styles.desktopOnly : ''}`}>Kairos Corporation</p>
        <Stepper activeStep={step === 'PASSWORD' ? 1 : 2} />
        {step === 'PASSWORD' ? (
          <PasswordStep
            isValidating={state === 'VALIDATING'}
            passwordError={passwordError}
            onSubmit={submitPassword}
          />
        ) : (
          <TotpEnrollmentStep
            state={state}
            qrCodeUrl={qrCodeUrl}
            secretKey={secretKey}
            onSubmit={submitMfaCode}
            onRetryComplete={retryCompleteActivation}
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
