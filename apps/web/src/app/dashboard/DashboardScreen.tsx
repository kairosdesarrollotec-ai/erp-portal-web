import { useState } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { useDashboard } from './useDashboard';
import { WORKER_ROLE_LABELS } from './worker-role';
import { NotificationsPanel } from '../notifications/NotificationsPanel';
import { useNotifications } from '../notifications/useNotifications';
import styles from './DashboardScreen.module.css';

/**
 * TR-06 - Tablero por rol. Fuente: PANTALLAS-V3-B-TRANSVERSAL.md
 * (rediseno v3.0). Prototipos aprobados: 7 vistas desktop READY (una por
 * rol) + 1 mobile READY (Gerencia) en docs/prototype-manifest.yaml.
 *
 * ALCANCE REAL (no sobre-declarado): el backend hoy solo proyecta
 * tareas reales para el rol Front-office, a partir del ciclo de vida de
 * Reserva (ver reservation-event.projector.ts) - los otros 6 roles
 * siguen recibiendo siempre `state: EMPTY` porque sus modulos de
 * dominio (Alquiler, Devolucion, Reclutamiento, RR.HH.) todavia no
 * proyectan eventos. Por eso esta pantalla NO implementa las 7
 * composiciones visuales distintas del contrato v3.0 (esas dependen de
 * datos que hoy no existen para 6 de los 7 roles) - implementa un unico
 * widget de lista de tareas, genérico por diseño, que ya funciona con
 * datos reales para Front-office y respeta el criterio "un widget sin
 * datos no ocupa espacio" (contrato punto 14) para el resto. Cuando
 * Alquiler/Devolucion/Reclutamiento/RR.HH. existan como modulos reales
 * y generen sus propios eventos, cada rol puede ganar su composicion de
 * widgets propia sobre esta misma base.
 */
export function DashboardScreen() {
  const { state, role, branchName, dashboardState, tasks, companyId, branchId } = useDashboard();
  const navigate = useNavigate();
  const email = getFirebaseAuth().currentUser?.email ?? '';
  const initial = email.charAt(0).toUpperCase();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  // TR-07 - solo se usa para el contador del badge; el panel al abrirse
  // hace su propia carga a traves de otra instancia del hook.
  const { unreadCount } = useNotifications(companyId, branchId);

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
    navigate('/');
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
            className={styles.bellButton}
            onClick={() => setNotificationsOpen(true)}
            aria-label="Notificaciones"
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className={styles.bellBadge}>{unreadCount}</span>}
          </button>
          <button type="button" className={styles.signOutButton} onClick={() => void handleSignOut()}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {notificationsOpen && (
        <NotificationsPanel
          companyId={companyId}
          branchId={branchId}
          onClose={() => setNotificationsOpen(false)}
          onNavigate={(deepLink) => {
            setNotificationsOpen(false);
            navigate(deepLink);
          }}
        />
      )}

      <div className={styles.content}>
        {state === 'LOADING' && <p className={styles.loadingText}>Cargando tu tablero…</p>}

        {state === 'READY' && (
          <>
            <h1 className={styles.greeting}>Hola</h1>
            {role && <p className={styles.roleSubtitle}>{WORKER_ROLE_LABELS[role]}</p>}

            {dashboardState === 'EMPTY' && (
              <p className={styles.emptyMessage}>No tienes pendientes por ahora.</p>
            )}

            {dashboardState === 'READY' && tasks.length > 0 && (
              <ul className={styles.taskList}>
                {tasks.map((task) => (
                  <li key={task.id}>
                    <Link to={task.deepLink} className={styles.taskCard}>
                      <span className={styles.taskTitle}>{task.title}</span>
                      {task.detail && <span className={styles.taskDetail}>{task.detail}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {state === 'UNRESOLVED' && (
          <p className={styles.emptyMessage}>
            No pudimos determinar tu contexto de trabajo. Vuelve a iniciar sesión para continuar.
          </p>
        )}
      </div>
    </main>
  );
}
