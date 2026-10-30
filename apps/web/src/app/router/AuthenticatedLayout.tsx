import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from '../shared/AppSidebar';
import { useSyncPermissionsWithContext } from '../shared/useSyncPermissionsWithContext';
import { GuardLoadingScreen, OfflineRestrictedScreen } from './GuardScreens';
import { isOfflineAllowedPath, useOfflineMode } from '../../offline/session/offline-mode';
import { useExpiredDraftPurge } from '../../offline/queue/use-expired-draft-purge';
import { useLocalDataProtection } from '../../offline/crypto/use-local-data-protection';
import styles from './AuthenticatedLayout.module.css';

/**
 * Layout compartido de todas las pantallas de negocio autenticadas.
 * Renderiza el sidebar de módulos (persistente en desktop, drawer en mobile)
 * junto al contenido de la ruta activa. WorkContextScreen queda fuera de
 * este layout a propósito — es una pantalla de selección transitoria.
 *
 * También mantiene cargados los permisos efectivos del contexto de trabajo
 * vigente (GET /me/permissions), también ante recargas directas por URL.
 */
export function AuthenticatedLayout() {
  useSyncPermissionsWithContext();
  // SDD-00 §17.4: cifra al iniciar lo que haya quedado en texto plano en este dispositivo.
  useLocalDataProtection();
  // Respuestas 2026-10-20 #25: el borrador offline que no se termina en 72 h se borra (al iniciar y cada 30 min).
  const { notice, dismiss } = useExpiredDraftPurge();
  // V-27: sin conexión (sesión offline de 8 h) solo los 2 checklists y Sincronización (SDD-TRANSVERSAL §17.1).
  const offlineActive = useOfflineMode((s) => s.active);
  const { pathname } = useLocation();
  const restricted = offlineActive && !isOfflineAllowedPath(pathname);

  return (
    <div className={styles.shell}>
      <AppSidebar />
      <div className={styles.rightPanel}>
        {notice && (
          <div className={styles.draftNotice} role="status">
            <span>{notice}</span>
            <button type="button" className={styles.draftNoticeClose} onClick={dismiss}>
              Entendido
            </button>
          </div>
        )}
        {offlineActive && (
          <div className={styles.draftNotice} role="status">
            <span>
              Sin conexión: tu trabajo se guarda en este dispositivo. Al volver la señal se verificará tu cuenta y se
              sincronizará.
            </span>
          </div>
        )}
        <Suspense fallback={<GuardLoadingScreen />}>
          {restricted ? <OfflineRestrictedScreen /> : <Outlet />}
        </Suspense>
      </div>
    </div>
  );
}
