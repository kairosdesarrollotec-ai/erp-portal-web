import { useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NotificationsPanel } from '../notifications/NotificationsPanel';
import { useNotifications } from '../notifications/useNotifications';
import type { RoleRef } from './role-ref';
import { APP_BRAND } from '../config/brand';
import { useWorkSession } from './useWorkSession';
import { UserMenuDropdown } from './UserMenuDropdown';
import { GlobalSearch } from './GlobalSearch/GlobalSearch';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  /** Título de la pantalla — aparece entre la marca y el lado derecho */
  pageTitle?: string;
  /** Controles o indicadores de la pantalla (botones de acción, badge de autosave, back link…) */
  actions?: React.ReactNode;
  /** Rol del usuario (nombre visible desde la API) — lo pasan las pantallas que lo conocen; si no, se usa el de la sesión */
  role?: RoleRef | null;
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
  const { unreadCount } = useNotifications(companyId, branchId);

  const branchBadge = companyName && branchName ? `${companyName} — ${branchName}` : null;

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
          <GlobalSearch />
          <button
            type="button"
            className={styles.bellButton}
            onClick={() => setNotificationsOpen(true)}
            aria-label="Notificaciones"
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className={styles.bellBadge}>{unreadCount}</span>}
          </button>
          <UserMenuDropdown role={role} />
        </div>
      </header>

      {notificationsOpen && companyId && branchId && (
        <NotificationsPanel
          companyId={companyId}
          branchId={branchId}
          onClose={() => setNotificationsOpen(false)}
          onNavigate={(deepLink) => {
            setNotificationsOpen(false);
            // Las pantallas autenticadas leen empresa/sede de location.state;
            // sin propagarlo, el destino no tiene contexto y vuelve al inicio.
            navigate(deepLink, { state: location.state });
          }}
        />
      )}
    </>
  );
}
