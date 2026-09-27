import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { MODULE_ITEMS } from '../modules/module-definitions';
import { useWorkSession } from './useWorkSession';
import styles from './AppSidebar.module.css';

function isModuleActive(modulePath: string | null, currentPath: string): boolean {
  if (!modulePath) return false;
  const section = `/${modulePath.split('/')[1]}`;
  return currentPath === section || currentPath.startsWith(`${section}/`);
}

export function AppSidebar() {
  const location = useLocation();
  const { role, sidebarOpen, setSidebarOpen } = useWorkSession();

  const visibleItems = MODULE_ITEMS.filter((m) => {
    if (m.adminOnly) return role === null || role === 'ADMINISTRACION';
    return true;
  });

  return (
    <>
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}
        aria-label="Módulos del sistema"
      >
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Módulos</span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <ul className={styles.navList} role="list">
          {visibleItems.map((item) => {
            const active = isModuleActive(item.path, location.pathname);
            const disabled = !item.path;

            if (disabled) {
              return (
                <li key={item.id}>
                  <span className={`${styles.navItem} ${styles.navItemDisabled}`}>
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span className={styles.navLabel}>{item.label}</span>
                    <span className={styles.comingSoon}>Próximamente</span>
                  </span>
                </li>
              );
            }

            return (
              <li key={item.id}>
                <Link
                  to={item.path!}
                  state={location.state}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
