import { X } from 'lucide-react';
import { useNotifications } from './useNotifications';
import styles from './NotificationsPanel.module.css';
import { formatLimaDateTime } from '../shared/lima-time';

interface NotificationsPanelProps {
  companyId: string | null;
  branchId: string | null;
  onClose: () => void;
  onNavigate: (deepLink: string) => void;
}

function formatDate(iso: string): string {
  return formatLimaDateTime(iso);
}

/**
 * TR-07 - centro de notificaciones. Contrato: PANTALLAS-V2-B-TRANSVERSAL.md
 * punto 7 - panel lateral de 360px en desktop (aqui vive como overlay
 * fijo posicionado a la derecha via CSS; el layout fullscreen mobile se
 * resuelve con la misma clase mediante media query, ver .module.css),
 * accion primaria = tocar la notificacion (navega a su deepLink),
 * accion secundaria = "marcar todas como leidas".
 *
 * ALCANCE REAL (no sobre-declarado): el contrato pide distinguir
 * visualmente las notificaciones "escaladas" - esa clase visual
 * (.escalated) existe y esta lista, pero nunca se activa hoy porque
 * `isEscalated` siempre llega en `false` desde el backend (no existe
 * todavia ninguna regla real de escalamiento, ver NotificationReadModel
 * en el schema de erp-api-local). No se filtra por tipo en esta primera
 * version: la lista es unica, ordenada por fecha de creacion (orden que
 * ya entrega el backend) - el filtro de tipo/lectura queda como mejora
 * futura si el volumen de notificaciones lo justifica.
 */
export function NotificationsPanel({ companyId, branchId, onClose, onNavigate }: NotificationsPanelProps) {
  const { state, notifications, markAllRead } = useNotifications(companyId, branchId);

  return (
    <div className={styles.overlay} role="dialog" aria-label="Notificaciones">
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Notificaciones</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {notifications.some((n) => n.readAt === null) && (
          <button type="button" className={styles.markAllButton} onClick={() => void markAllRead()}>
            Marcar todas como leídas
          </button>
        )}

        <div className={styles.panelBody}>
          {state === 'LOADING' && <p className={styles.statusText}>Cargando…</p>}
          {state === 'RECOVERABLE_ERROR' && (
            <p className={styles.statusText}>No pudimos cargar tus notificaciones.</p>
          )}
          {state === 'EMPTY' && <p className={styles.statusText}>No tienes notificaciones.</p>}

          {state === 'READY' && (
            <ul className={styles.list}>
              {notifications.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.item} ${item.readAt === null ? styles.unread : ''} ${
                      item.isEscalated ? styles.escalated : ''
                    }`}
                    onClick={() => onNavigate(item.deepLink)}
                  >
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.itemDate}>{formatDate(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
