/**
 * LogoutConfirmModal.tsx
 *
 * Modal de confirmación para cerrar sesión cuando hay formularios/borradores
 * pendientes de sincronización en el dispositivo.
 *
 * UX-ID: TR-09
 * PROTO-ID: PROTO-TR-09-MODAL-CERRAR-SESION-CON-FORMULARIOS-PEND
 * screen_state: MODAL
 * viewport: desktop 1440×1024
 *
 * Referencia visual:
 * docs/prototypes/approved/stitch_veloxrent_prototipo_b/
 *   modal_cerrar_sesi_n_con_formularios_pendientes_veloxrent/screen.png
 */
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, FileText, ClipboardList, Info, LogOut, X } from 'lucide-react';
import styles from './LogoutConfirmModal.module.css';

export interface LogoutConfirmModalProps {
  open: boolean;
  /** Número de borradores locales pendientes de sync. Fuente: getLocalDraftCount() */
  draftCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Ítems de ejemplo mostrados en el prototipo aprobado.
 * TR-08 pendiente: cuando esté implementado, los ítems reales vendrán de Dexie.
 * Mientras tanto se muestra un placeholder genérico acorde al conteo.
 */
function DraftPlaceholderList({ count }: { count: number }) {
  // Genera ítems placeholder hasta que TR-08 provea los datos reales.
  const items = Array.from({ length: Math.min(count, 5) }, (_, i) => ({
    id: i,
    icon: i % 2 === 0 ? 'file' : 'clipboard',
    label: `Borrador pendiente #${i + 1}`,
    meta: 'Guardado localmente · Pendiente de sincronización',
  }));

  return (
    <div className={styles.draftTable} role="list" aria-label="Formularios pendientes de sincronización">
      <div className={styles.draftTableHeader} aria-hidden="true">
        <span className={styles.draftTableHeaderLabel}>Formularios pendientes de sincronización</span>
        <span className={styles.draftTableHeaderBadge}>Almacenamiento Local</span>
      </div>
      {items.map((item) => (
        <div key={item.id} className={styles.draftItem} role="listitem">
          <div className={styles.draftItemLeft}>
            <span className={styles.draftItemIcon} aria-hidden="true">
              {item.icon === 'file' ? (
                <FileText size={16} />
              ) : (
                <ClipboardList size={16} />
              )}
            </span>
            <div>
              <p className={styles.draftItemName}>{item.label}</p>
              <p className={styles.draftItemMeta}>{item.meta}</p>
            </div>
          </div>
          <span className={styles.draftItemBadge}>Pendiente sync</span>
        </div>
      ))}
    </div>
  );
}

export function LogoutConfirmModal({
  open,
  draftCount,
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-labelledby="logout-modal-title"
          aria-describedby="logout-modal-desc"
          onEscapeKeyDown={onCancel}
          onInteractOutside={onCancel}
        >
          {/* ── Cabecera ── */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.warnIcon} aria-hidden="true">
                <AlertTriangle size={20} />
              </div>
              <div className={styles.titleGroup}>
                <Dialog.Title asChild>
                  <h2 id="logout-modal-title" className={styles.title}>
                    ¿Cerrar sesión ahora?
                  </h2>
                </Dialog.Title>
                <span className={styles.subtitle}>
                  <span className={styles.subtitleDot} aria-hidden="true" />
                  Alerta de persistencia local antes de salir
                </span>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Cancelar y cerrar"
                onClick={onCancel}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* ── Cuerpo ── */}
          <div className={styles.body}>
            {/* Aviso principal */}
            <div className={styles.warnBox}>
              <p id="logout-modal-desc" className={styles.warnText}>
                <strong className={styles.warnHighlight}>
                  Tienes {draftCount} formulario{draftCount !== 1 ? 's' : ''} sin sincronizar.
                </strong>{' '}
                Si cierras sesión, se conservarán en este dispositivo hasta que vuelvas a
                conectarte y los completes.
              </p>
            </div>

            {/* Lista de borradores */}
            <DraftPlaceholderList count={draftCount} />

            {/* Nota de seguridad */}
            <p className={styles.securityNote}>
              <Info size={14} className={styles.securityNoteIcon} aria-hidden="true" />
              En equipos compartidos de mostrador, nadie podrá ver ni modificar estos datos
              sin iniciar sesión con tus credenciales.
            </p>
          </div>

          {/* ── Acciones ── */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.confirmButton}
              onClick={onConfirm}
            >
              <LogOut size={14} aria-hidden="true" />
              Cerrar sesión de todas formas
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
            >
              Cancelar
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
