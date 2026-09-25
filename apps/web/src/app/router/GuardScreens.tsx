import { Loader2, WifiOff } from 'lucide-react';
import styles from './GuardScreens.module.css';

/**
 * Pantallas compartidas por los guards de ruta (RequireAuthenticatedUser,
 * RequireCompletedActivation). No tienen prototipo propio: son estados
 * intermedios/tecnicos (verificando sesion, backend no disponible) que no
 * deberian ser visibles en el uso normal, pero deben existir para no dejar
 * a un usuario viendo una pantalla en blanco o, peor, colada hacia una
 * ruta protegida mientras la verificacion esta pendiente o fallo.
 */
export function GuardLoadingScreen() {
  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.brand}>VeloxRent</p>
        <div className={styles.notice} role="status" aria-live="polite">
          <Loader2 className={styles.noticeIcon} size={32} aria-hidden="true" />
          <p className={styles.noticeSubtitle}>Verificando tu sesión…</p>
        </div>
      </div>
    </main>
  );
}

export function GuardBlockingScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.brand}>VeloxRent</p>
        <div className={styles.notice} role="alert">
          <WifiOff className={styles.noticeIcon} size={40} aria-hidden="true" />
          <h1 className={styles.noticeTitle}>No pudimos verificar tu cuenta</h1>
          <p className={styles.noticeSubtitle}>
            Intenta de nuevo en unos minutos. Si el problema continúa, contacta a tu
            administrador.
          </p>
          <button type="button" className={styles.noticeAction} onClick={onRetry}>
            Reintentar
          </button>
        </div>
      </div>
    </main>
  );
}
