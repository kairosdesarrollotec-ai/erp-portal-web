import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { usePermissions } from '../shared/usePermissions';
import { EvidenceDialog } from './EvidenceDialog';
import {
  requestEvidenceDeletion,
  type EvidenceDeletionRequest,
  type EvidenceDeletionTargetKind,
} from './evidence-client';
import { MAX_REASON_LENGTH, MIN_REASON_LENGTH, STATUS_LABELS, describeEvidenceError } from './evidence-domain';
import styles from './EvidenceDialog.module.css';

export const EVIDENCE_REQUESTS_PATH = '/evidencia/solicitudes';

interface Props {
  companyId: string;
  branchId: string;
  targetKind: EvidenceDeletionTargetKind;
  /** rentalId (RENTAL) o returnId (RETURN). */
  targetId: string;
  evidenceId: string;
  /** Descripcion del archivo para lectores de pantalla ("foto Frontal"). */
  label: string;
  /** Solicitud abierta de esta evidencia, si existe. */
  openRequest?: EvidenceDeletionRequest;
  disabled?: boolean;
  /** Se invoca con la solicitud creada, para que el padre refleje el estado "Eliminación solicitada". */
  onRequested?: (request: EvidenceDeletionRequest) => void;
}

/**
 * Reemplaza al borrado directo de evidencia (DEC-EVID-DELETE-002, Respuestas #35): eliminar una foto/video exige
 * DOBLE APROBACION de personas distintas. Este boton solo SOLICITA (motivo obligatorio); no borra nada. Si ya hay una
 * solicitud abierta muestra su estado y enlaza a la bandeja. Sin EVIDENCE.REQUEST_DELETION no se ofrece la accion.
 */
export function RequestEvidenceDeletionButton({
  companyId,
  branchId,
  targetKind,
  targetId,
  evidenceId,
  label,
  openRequest,
  disabled = false,
  onRequested,
}: Props) {
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = reason.trim();
  const reasonValid = trimmed.length >= MIN_REASON_LENGTH && trimmed.length <= MAX_REASON_LENGTH;

  function close() {
    if (busy) return;
    setOpen(false);
    setReason('');
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reasonValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const created = await requestEvidenceDeletion(idToken, {
        companyId,
        branchId,
        targetKind,
        targetId,
        evidenceId,
        reason: trimmed,
      });
      setOpen(false);
      setReason('');
      onRequested?.(created);
    } catch (err) {
      setError(describeEvidenceError(err, 'No pudimos enviar la solicitud. Intenta de nuevo.'));
    } finally {
      setBusy(false);
    }
  }

  if (openRequest) {
    return (
      <span className={styles.inlineGroup}>
        <span className={styles.badge} data-testid="evidence-deletion-status">
          Eliminación solicitada · {STATUS_LABELS[openRequest.status]}
        </span>
        <Link className={styles.linkAction} to={EVIDENCE_REQUESTS_PATH} state={{ companyId, branchId }}>
          Ver solicitud
        </Link>
      </span>
    );
  }

  if (!can('EVIDENCE', 'REQUEST_DELETION')) return null;

  const titleId = `evidence-request-${evidenceId}`;
  return (
    <>
      <button
        type="button"
        className={styles.linkAction}
        aria-label={`Solicitar eliminación de ${label}`}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Solicitar eliminación
      </button>
      {open && (
        <EvidenceDialog titleId={titleId} title="Solicitar eliminación de evidencia" onClose={close}>
          <form onSubmit={(e) => void submit(e)} noValidate>
            <p className={styles.warning}>
              La evidencia <strong>no se borra todavía</strong>: se necesitan dos aprobaciones de personas distintas a ti
              (Gerencia o Administración). Si nadie la completa, la solicitud vence.
            </p>
            <div className={styles.field}>
              <label htmlFor={`${titleId}-reason`}>
                Motivo <span className={styles.hint}>(obligatorio, {MIN_REASON_LENGTH}-{MAX_REASON_LENGTH} caracteres)</span>
              </label>
              <textarea
                id={`${titleId}-reason`}
                className={styles.input}
                value={reason}
                maxLength={MAX_REASON_LENGTH}
                aria-required="true"
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={close} disabled={busy}>
                Cancelar
              </button>
              <button type="submit" className={styles.primaryButton} disabled={!reasonValid || busy}>
                {busy ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        </EvidenceDialog>
      )}
    </>
  );
}
