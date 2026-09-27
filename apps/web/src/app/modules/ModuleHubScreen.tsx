import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { useModuleHub } from './useModuleHub';
import { WORKER_ROLE_LABELS, type WorkerRole } from '../dashboard/worker-role';
import { NotificationsPanel } from '../notifications/NotificationsPanel';
import { useNotifications } from '../notifications/useNotifications';
import { MODULE_ITEMS } from './module-definitions';
import styles from './ModuleHubScreen.module.css';

/**
 * TR-11 — Hub de módulos de navegación (HU-25).
 *
 * Baselines aprobados PROVISIONALMENTE (23-sep-2026):
 *   PROTO-TR-11-MENU-MODULOS       (desktop, 1600×1000)
 *   PROTO-TR-11-MENU-MODULOS-MOVIL (mobile,  390×844)
 *
 * MISSING_SOURCE registrado: PANTALLAS-V3-B-TRANSVERSAL.md no existe en
 * el repo; TR-11 no tiene entradas en BDD/SDD/TDD. Ver:
 *   docs/conflicts/MISSING_TR11_UXUI_CONTRACT.md
 *   docs/decision-log.md fila PROV-TR-11-001
 *
 * Las reglas de visibilidad por rol son provisionales (inferidas desde el
 * toggle admin/operador del prototipo + plan Bloque 3). Reemplazar cuando
 * ADM-02 exista.
 */
export function ModuleHubScreen() {
  const { state, role, branchLabel, companyId, branchId } = useModuleHub();
  const navigate = useNavigate();
  const email = getFirebaseAuth().currentUser?.email ?? '';
  const initial = email.charAt(0).toUpperCase();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unreadCount } = useNotifications(companyId, branchId);

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
    navigate('/');
  }

  const visibleModules = MODULE_ITEMS.filter((m) => {
    if (m.adminOnly) return role === 'ADMINISTRACION';
    return true;
  });

  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <span className={styles.brandMark}>K</span>
          <span className={styles.brand}>Kairos Corporation</span>
        </div>
        <div className={styles.headerRight}>
          {branchLabel && (
            <span className={styles.branchBadge}>
              <span className={styles.branchDot} />
              {branchLabel}
            </span>
          )}
          {email && (
            <div className={styles.userGroup}>
              <span className={styles.avatar}>{initial}</span>
              <div className={styles.userText}>
                <span className={styles.userEmail}>{email}</span>
                {role && <span className={styles.userRole}>{WORKER_ROLE_LABELS[role as WorkerRole]}</span>}
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
          >
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
        {state === 'LOADING' && <p className={styles.loadingText}>Cargando módulos…</p>}

        {state === 'UNRESOLVED' && (
          <p className={styles.errorText}>
            No pudimos determinar tu contexto de trabajo. Vuelve a iniciar sesión.
          </p>
        )}

        {state === 'READY' && (
          <>
            <div className={styles.pageHeader}>
              <div>
                <p className={styles.pageLabel}>Centro de Operaciones ERP</p>
                <h1 className={styles.pageTitle}>Módulos del Sistema</h1>
                <p className={styles.pageSubtitle}>
                  Acceso a la gestión integral de operaciones y administración.
                </p>
              </div>
            </div>

            <ul className={styles.grid} role="list" aria-label="Módulos del sistema">
              {visibleModules.map((mod) => (
                <li key={mod.id}>
                  {mod.path ? (
                    <Link to={mod.path} className={styles.card} aria-label={mod.label}>
                      <span className={styles.cardIcon} aria-hidden="true">
                        {mod.icon}
                      </span>
                      <span className={styles.cardLabel}>{mod.label}</span>
                      <span className={styles.cardDescription}>{mod.description}</span>
                    </Link>
                  ) : (
                    <div
                      className={`${styles.card} ${styles.cardDisabled}`}
                      aria-disabled="true"
                      role="img"
                      aria-label={`${mod.label} — próximamente`}
                    >
                      <span className={styles.cardIcon} aria-hidden="true">
                        {mod.icon}
                      </span>
                      <span className={styles.cardLabel}>{mod.label}</span>
                      <span className={styles.cardDescription}>{mod.description}</span>
                      <span className={styles.comingSoonBadge}>Próximamente</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
