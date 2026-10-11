import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import styles from './HrDialog.module.css';

interface Props {
  titleId: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

/** Modal accesible (Radix): foco atrapado, Esc cierra, el foco vuelve al disparador. */
export function HrDialog({ titleId, title, description, onClose, children }: Props) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.card} aria-labelledby={titleId} aria-describedby={description ? `${titleId}-desc` : undefined}>
          <Dialog.Title id={titleId} className={styles.title}>
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description id={`${titleId}-desc`} className={styles.description}>
              {description}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
