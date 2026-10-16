import { useState } from 'react';
import styles from './EvidenceDeleteButton.module.css';

interface EvidenceDeleteButtonProps {
  /** Descripcion del archivo para lectores de pantalla ("Foto Frontal"). */
  label: string;
  /** Se invoca solo tras confirmar; si lanza, el padre muestra el error. */
  onConfirm: () => Promise<void>;
  disabled?: boolean;
}

/**
 * Eliminar una foto/video del checklist con confirmacion en linea
 * ("¿Eliminar? Sí / No"), para evitar borrados por un toque accidental sin
 * recurrir a dialogos del navegador.
 */
export function EvidenceDeleteButton({ label, onConfirm, disabled = false }: EvidenceDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className={`${styles.link} ${styles.danger}`}
        aria-label={`Eliminar ${label}`}
        disabled={disabled}
        onClick={() => setConfirming(true)}
      >
        Eliminar
      </button>
    );
  }

  return (
    <span className={styles.actions} role="group" aria-label={`Confirmar eliminación de ${label}`}>
      <span className={styles.question}>¿Eliminar?</span>
      <button type="button" className={`${styles.link} ${styles.danger}`} disabled={busy} onClick={() => void confirm()}>
        {busy ? 'Eliminando…' : 'Sí'}
      </button>
      <button type="button" className={styles.link} disabled={busy} onClick={() => setConfirming(false)}>
        No
      </button>
    </span>
  );
}
