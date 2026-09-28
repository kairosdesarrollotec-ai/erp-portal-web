import { useState } from 'react';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { NotificationsPanel } from '../notifications/NotificationsPanel';
import { useNotifications } from '../notifications/useNotifications';
import { WORKER_ROLE_LABELS, type WorkerRole } from '../dashboard/worker-role';
import { APP_BRAND } from '../config/brand';
import { useWorkSession } from './useWorkSession';
import { useSignOut } from './useSignOut';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  /** Título de la pantalla — aparece entre la marca y el lado derecho */
  pageTitle?: string;
  /** Controles o indicadores de la pantalla (botones de acción, badge de autosave, back link…) */
  actions?: React.ReactNode;
  /** Rol del usuario — lo pasan las pantallas que lo conocen (Dashboard, ModuleHub) */
  role?: WorkerRole | null;
}

interface NavState {
  companyId?: string;
  companyName?: string;
  branchId?: string;
  branchName?: string;
}

/**
 * Header persistente de todas las pantallas autenticadas.
 * Lee companyName/branchName desde location.state (presente en toda navegación
 * autenticada que pasa por WorkContextScreen) sin requerir props adicionales.
 */
export function AppHeader({ pageTitle, actions, role }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId = null, companyName, branchName, branchId = null } =
    (location.state ?? {}) as NavState;

  const { setSidebarOpen } = useWorkSession();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const email = getFirebaseAuth().currentUser?.email ?? '';
  const initial = email.charAt(0).toUpperCase();
  const { unreadCount } = useNotifications(companyId, branchId);

  const branchBadge = companyName && branchName ? `${companyName} — ${branchName}` : null;
  const roleLabel = role ? WORKER_ROLE_LABELS[role] : null;
  const handleSignOut = useSignOut();

  return (
    <>
      <header className={styles.header}>
        <div className={styles.left}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú de módulos"
          >
            <Menu size={20} />
          </button>
          <button
            type="button"
            className={styles.brandGroup}
            onClick={() => navigate('/modulos', { state: location.state })}
            aria-label={`${APP_BRAND.name} — ir al inicio`}
          >
            <span className={styles.brandMark}>{APP_BRAND.initial}</span>
            <span className={styles.brand}>{APP_BRAND.name}</span>
          </button>
          {(pageTitle || actions) && (
            <span className={styles.sectionDivider} aria-hidden="true" />
          )}
          {pageTitle && <h1 className={styles.pageTitle}>{pageTitle}</h1>}
          {actions && <div className={styles.pageActions}>{actions}</div>}
        </div>

        <div className={styles.right}>
          {branchBadge && (
            <span className={styles.branchBadge}>
              <span className={styles.branchDot} />
              {branchBadge}
            </span>
          )}
          {email && (
            <div className={styles.userGroup}>
              <span className={styles.avatar}>{initial}</span>
              <div className={styles.userText}>
                <span className={styles.userEmail}>{email}</span>
                {roleLabel && <span className={styles.userRole}>{roleLabel}</span>}
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
          <button
            type="button"
            className={styles.signOutButton}
            onClick={() => void handleSignOut()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            <span className={styles.signOutLabel}>Cerrar sesión</span>
          </button>
        </div>
      </header>

      {notificationsOpen && companyId && branchId && (
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
    </>
  );
}
