import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import styles from './IncidentDialog.module.css';

interface Props {
  titleId: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Dialogo modal accesible usando @radix-ui/react-dialog: foco atrapado,
 * Escape cierra, aria-modal y retorno del foco al disparador gestionados
 * por Radix. Fuente: UX/UI v3.1 §5.8 INC-01/INC-02 + incidents.yaml v0.1.0.
 */
export function IncidentDialog({ titleId, title, onClose, children }: Props) {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.card} aria-labelledby={titleId}>
          <Dialog.Title id={titleId} className={styles.title}>
            {title}
          </Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
