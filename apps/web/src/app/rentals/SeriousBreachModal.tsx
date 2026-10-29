import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { getFirebaseAuth } from '../providers/firebase';
import { reportExtensionBreach, RentalCommandError, type RentalResponse } from './rentals-client';
import styles from './SeriousBreachModal.module.css';

export interface SeriousBreachModalProps {
  open: boolean;
  rental: RentalResponse;
  companyId: string;
  branchId: string;
  onSuccess: () => void;
  onClose: () => void;
}

type RequirementKey = 'noticeGiven' | 'authorized' | 'paid' | 'addendumSigned';

const EXTENSION_REQUIREMENTS: { id: RequirementKey; label: string; unmet: string; met: string }[] = [
  {
    id: 'noticeGiven',
    label: '1. Aviso con al menos 12 horas de anticipación',
    unmet: 'Solicitud recibida sin anticipación suficiente (vencimiento ya superado)',
    met: 'Aviso registrado con la anticipación requerida',
  },
  {
    id: 'authorized',
    label: '2. Autorización formal de Gerencia',
    unmet: 'Sin registro de autorización en el expediente',
    met: 'Autorización registrada en el expediente',
  },
  {
    id: 'paid',
    label: '3. Pago del periodo adicional',
    unmet: 'Sin pago registrado para el periodo extendido',
    met: 'Pago del periodo extendido registrado',
  },
  {
    id: 'addendumSigned',
    label: '4. Adenda de ampliación firmada',
    unmet: 'Sin adenda generada ni firmada (DAT-ALQ-009)',
    met: 'Adenda firmada registrada',
  },
];

/** Ultima solicitud de ampliacion del expediente (la que se evalua como falta grave). */
function latestExtensionRequirements(rental: RentalResponse): Record<RequirementKey, boolean> {
  const list = rental.extensions ?? [];
  const last = list.length > 0 ? list[0] : null; // más reciente primero
  const r = last?.requirements;
  return {
    noticeGiven: r?.noticeGiven === true,
    authorized: r?.authorized === true,
    paid: r?.paid === true,
    addendumSigned: r?.addendumSigned === true,
  };
}

/**
 * UC-ALQ-006b / BR-ALQ-013 — Confirmar falta grave de ampliación.
 * PROTO-ALQ-11-FALTA-GRAVE-BR-ALQ-013 (CONFIRM_SERIOUS_BREACH, desktop 1440px).
 * Decision: DEC-PROTO-ALQ-013-2026-10-11.
 *
 * Actor: GERENCIA (RENTAL.REPORT_EXTENSION_BREACH).
 * Acción irreversible: retención total de garantía + cliente rojo + registro legal.
 * CTA destructivo habilitado solo cuando checkbox confirmado Y observaciones no vacías.
 */
export function SeriousBreachModal({
  open,
  rental,
  companyId,
  branchId,
  onSuccess,
  onClose,
}: SeriousBreachModalProps) {
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requirements = latestExtensionRequirements(rental);
  const metCount = EXTENSION_REQUIREMENTS.filter((req) => requirements[req.id]).length;
  const canSubmit = confirmed && notes.trim().length > 0 && !busy;

  const depositLabel = rental.deposit
    ? `${rental.deposit.currency} ${rental.deposit.originalAmount}`
    : rental.depositRequired === false
      ? 'Sin garantía (conductor de la empresa)'
      : '—';

  function resetState() {
    setNotes('');
    setConfirmed(false);
    setError(null);
  }

  function handleClose() {
    if (busy) return;
    resetState();
    onClose();
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) handleClose();
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      await reportExtensionBreach(idToken, rental.id, companyId, branchId, rental.version, notes.trim());
      resetState();
      onClose();
      onSuccess();
    } catch (err) {
      if (err instanceof RentalCommandError && err.status === 409) {
        setError('El estado del expediente ha cambiado. Recarga la bandeja e intenta de nuevo.');
      } else if (err instanceof RentalCommandError && err.status === 412) {
        setError('El expediente fue modificado. Recarga la bandeja e intenta de nuevo.');
      } else {
        setError('No pudimos registrar la falta grave. Intenta de nuevo o contacta al soporte.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.modal}
          aria-describedby="breach-description"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon} aria-hidden="true">
              <AlertTriangle size={20} />
            </div>
            <div className={styles.headerContent}>
              <div className={styles.headerTitleRow}>
                <Dialog.Title className={styles.title}>
                  Registrar falta grave — Incumplimiento de ampliación
                </Dialog.Title>
                <span className={styles.brTag}>BR-ALQ-013</span>
              </div>
              <Dialog.Description id="breach-description" className={styles.description}>
                El cliente no cumplió los requisitos obligatorios de ampliación (BR-ALQ-012). Esta acción es{' '}
                <strong>irreversible</strong> y activa consecuencias normativas inmediatas.
              </Dialog.Description>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Cerrar sin confirmar"
              disabled={busy}
              onClick={handleClose}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {/* Context block */}
            <div className={styles.contextGrid}>
              <div>
                <span className={styles.contextLabel}>Expediente</span>
                <span className={styles.contextValueMono}>{rental.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div>
                <span className={styles.contextLabel}>Cliente</span>
                <span className={styles.contextValue}>{rental.customerName}</span>
              </div>
              <div>
                <span className={styles.contextLabel}>Garantía en depósito</span>
                <span className={styles.contextValueError}>{depositLabel}</span>
              </div>
            </div>

            {/* 4 requirements */}
            <div>
              <div className={styles.requirementsHeader}>
                <h3 className={styles.sectionTitle}>Requisitos de ampliación — Estado</h3>
                <span className={styles.zeroBadge}>{metCount} de 4 cumplidos</span>
              </div>
              <ul className={styles.requirementsList}>
                {EXTENSION_REQUIREMENTS.map((req) => (
                  <li key={req.id} className={styles.requirementItem}>
                    <span className={styles.xCircle} aria-hidden="true">{requirements[req.id] ? '✓' : '✕'}</span>
                    <div>
                      <span className={styles.requirementLabel}>{req.label}</span>
                      <p className={styles.requirementDetail}>{requirements[req.id] ? req.met : req.unmet}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Consequences */}
            <div className={styles.consequences}>
              <h3 className={styles.consequencesTitle}>Consecuencias que se activarán al confirmar</h3>
              <ul className={styles.consequencesList}>
                {rental.depositRequired !== false && (
                  <li>
                    <strong>Retención total de garantía:</strong> {depositLabel} queda retenido íntegramente (no se devuelve al cliente)
                  </li>
                )}
                <li>
                  <strong>Cliente marcado como Rojo de inmediato:</strong>{' '}
                  {rental.customerName} quedará inhabilitado para nuevos alquileres hasta revisión de Gerencia
                </li>
                <li>
                  <strong>Proceso penal evaluado:</strong> Gerencia decidirá en las próximas 24h si se inicia denuncia formal por apropiación ilícita de bien
                </li>
                <li>
                  <strong>Falta grave registrada:</strong> El expediente quedará en estado de incumplimiento grave con retención total de garantía
                </li>
              </ul>
            </div>

            {/* Notes textarea */}
            <div>
              <label htmlFor="breach-notes" className={styles.notesLabel}>
                Observaciones de Gerencia <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <textarea
                id="breach-notes"
                className={styles.notesTextarea}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describa brevemente el contexto del incumplimiento, intentos de contacto y cualquier evidencia adicional relevante para el expediente…"
                disabled={busy}
                aria-required="true"
                aria-describedby="breach-notes-hint"
              />
              <p id="breach-notes-hint" className={styles.notesHint}>
                Este texto quedará registrado en el expediente y podrá ser utilizado en el proceso penal si procede.
              </p>
            </div>

            {/* Confirmation checkbox */}
            <div className={styles.confirmBox}>
              <label className={styles.confirmLabel}>
                <input
                  type="checkbox"
                  className={styles.confirmCheckbox}
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={busy}
                  aria-describedby="breach-confirm-hint"
                />
                <span id="breach-confirm-hint" className={styles.confirmText}>
                  Confirmo que he verificado personalmente el estado de los requisitos de ampliación y que el cliente incumplió los obligatorios, y entiendo que esta acción activará la retención total de garantía, la inhabilitación del cliente y la evaluación de proceso penal de forma{' '}
                  <strong>inmediata e irreversible</strong>.
                </span>
              </label>
            </div>

            {/* Error message */}
            {error && (
              <p className={styles.errorMessage} role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelButton}
              disabled={busy}
              onClick={handleClose}
            >
              Cancelar — volver a verificar
            </button>
            <button
              type="button"
              className={styles.submitButton}
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {busy ? 'Registrando…' : 'Confirmar falta grave y retener garantía'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
