import { Link } from 'react-router-dom';
import type { ReturnFlowState } from './useReturnFlow';
import styles from './ReturnForms.module.css';

/**
 * Estados defensivos comunes de las pantallas del proceso (LOADING,
 * RECOVERABLE_ERROR, NOT_FOUND). Devuelve null cuando el expediente esta
 * listo para renderizar.
 */
export function returnFlowGuard({ state, hasReturn }: { state: ReturnFlowState; hasReturn: boolean }) {
  if (state === 'LOADING') return <p className={styles.statusText}>Cargando expediente de devolución…</p>;
  if (state === 'NOT_FOUND') {
    return (
      <p className={styles.statusText}>
        No encontramos esta devolución en tu empresa y sede.{' '}
        <Link to="/devoluciones">Volver a la bandeja</Link>
      </p>
    );
  }
  if (state === 'RECOVERABLE_ERROR' || !hasReturn) {
    return <p className={styles.statusText}>No pudimos cargar el expediente de devolución. Intenta de nuevo.</p>;
  }
  return null;
}
