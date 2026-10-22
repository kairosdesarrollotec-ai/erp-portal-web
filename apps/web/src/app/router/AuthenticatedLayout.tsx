import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../shared/AppSidebar';
import { useSyncPermissionsWithContext } from '../shared/useSyncPermissionsWithContext';
import { GuardLoadingScreen } from './GuardScreens';
import { useExpiredDraftPurge } from '../../offline/queue/use-expired-draft-purge';
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
  // Respuestas 2026-10-20 #25: el borrador offline que no se termina en 72 h se borra (al iniciar y cada 30 min).
  const { notice, dismiss } = useExpiredDraftPurge();

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
        <Suspense fallback={<GuardLoadingScreen />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
