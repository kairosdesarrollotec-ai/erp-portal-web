import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { useDashboard } from './useDashboard';
import { WORKER_ROLE_LABELS } from './worker-role';
import styles from './DashboardScreen.module.css';

/**
 * TR-06 - Tablero por rol. Fuente: PANTALLAS-V3-B-TRANSVERSAL.md
 * (rediseno v3.0). Prototipos aprobados: 7 vistas desktop READY (una por
 * rol) + 1 mobile READY (Gerencia) en docs/prototype-manifest.yaml.
 *
 * PROVISIONAL (HU-24, ver docs/decision-log.md PROP-004 en el backend):
 * los modulos de dominio (Consulta, Reserva, Alquiler, Devolucion,
 * Reclutamiento, Administracion de Personal) todavia no existen, asi que
 * no hay tareas/alertas/borradores reales que mostrar. El backend
 * siempre devuelve `state: EMPTY` - esta pantalla implementa unicamente
 * el shell comun a los 7 prototipos (header con marca, sede y usuario) +
 * el estado EMPTY (contrato TR-06 punto 9: "EMPTY, sin pendientes, por
 * rol"), sin inventar el contenido de los widgets por rol que ningun
 * prototipo EMPTY respalda todavia. Cuando existan datos reales, cada
 * rol gana su composicion de widgets propia siguiendo su prototipo
 * READY aprobado.
 */
export function DashboardScreen() {
  const { state, role, branchName, retry } = useDashboard();
  const navigate = useNavigate();
  const email = getFirebaseAuth().currentUser?.email ?? '';
  const initial = email.charAt(0).toUpperCase();
  // Hallazgo de revision (finding #4, segunda parte): antes un fallo de
  // signOut() (red, Firebase caido) quedaba sin manejar - el boton no
  // hacia nada visible y el usuario quedaba con una sesion en un estado
  // ambiguo, sin saber si cerro sesion o no.
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut(getFirebaseAuth());
      navigate('/');
    } catch {
      setSignOutError('No pudimos cerrar tu sesión por un problema de conexión. Intenta de nuevo.');
    }
  }

  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <span className={styles.brandMark}>V</span>
          <span className={styles.brand}>VeloxRent</span>
        </div>
        <div className={styles.headerRight}>
          {branchName && (
            <span className={styles.branchBadge}>
              <span className={styles.branchDot} />
              {branchName}
            </span>
          )}
          {email && (
            <div className={styles.userGroup}>
              <span className={styles.avatar}>{initial}</span>
              <div className={styles.userText}>
                <span className={styles.userEmail}>{email}</span>
                {role && <span className={styles.userRole}>{WORKER_ROLE_LABELS[role]}</span>}
              </div>
            </div>
          )}
          <button
            type="button"
            className={styles.signOutButton}
            onClick={() => void handleSignOut()}
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {signOutError && (
        <p role="alert" className={styles.signOutError}>
          {signOutError}
        </p>
      )}

      <div className={styles.content}>
        {state === 'LOADING' && <p className={styles.loadingText}>Cargando tu tablero…</p>}

        {state === 'READY' && (
          <>
            <h1 className={styles.greeting}>Hola</h1>
            {role && <p className={styles.roleSubtitle}>{WORKER_ROLE_LABELS[role]}</p>}
            <p className={styles.emptyMessage}>No tienes pendientes por ahora.</p>
          </>
        )}

        {state === 'UNRESOLVED' && (
          <p className={styles.emptyMessage}>
            No pudimos determinar tu contexto de trabajo. Vuelve a iniciar sesión para continuar.
          </p>
        )}

        {state === 'RECOVERABLE_ERROR' && (
          <div role="alert" className={styles.emptyMessage}>
            <p>No pudimos cargar tu tablero por un problema de conexión.</p>
            <button type="button" className={styles.signOutButton} onClick={retry}>
              Reintentar
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
