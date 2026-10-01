import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import { loadChecklistDraft, saveChecklistDraft, RentalChecklistDraft } from './rental-checklist-draft';
import styles from './RentalStageForms.module.css';

const REQUIRED_PHOTOS = 35;
const REQUIRED_VIDEOS = 3;
const MIN_TECHNICAL_MINUTES = 30;
const MIN_DOCUMENTARY_MINUTES = 15;

/**
 * ENTREGA-04 / ALQ-09 - Checklist y evidencias (mapea a complete-delivery, ejecutado
 * recien en ENTREGA-05). Version ONLINE-ONLY: la captura se modela como
 * contadores de fotos/videos (35 fotos + 3 videos por 5 zonas) mas
 * formularios FIV/FCKE resumidos en notas; el envio real de archivos a GCS
 * (patron ya usado por Fleet/NewVehicleModal) y el modo offline con
 * IndexedDB + cola de sincronizacion NO estan implementados - ver resumen
 * final de la tarea para el detalle de lo pendiente.
 */
export function Stage4ChecklistScreen() {
  const { id, state, rental, context } = useRentalWizard();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<RentalChecklistDraft>(() => loadChecklistDraft(id));
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  function update(patch: Partial<RentalChecklistDraft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (id) saveChecklistDraft(id, next);
      return next;
    });
  }

  const checklistComplete = draft.photosCount >= REQUIRED_PHOTOS && draft.videosCount >= REQUIRED_VIDEOS;
  const timeBelowMinimum =
    draft.technicalMinutes < MIN_TECHNICAL_MINUTES || draft.documentaryMinutes < MIN_DOCUMENTARY_MINUTES;

  function handleContinue() {
    if (timeBelowMinimum && !draft.exceptionReason.trim()) {
      setShowExceptionModal(true);
      return;
    }
    navigate(`/alquileres/${id}/entrega-05`, { state: context ?? undefined });
  }

  if (state === 'LOADING') return <p className={styles.statusText}>Cargando expediente…</p>;
  if (state === 'RECOVERABLE_ERROR' || state === 'NOT_FOUND' || !rental) {
    return <p className={styles.statusText}>No pudimos cargar el expediente. Intenta de nuevo.</p>;
  }

  return (
    <RentalWizardShell stage={4} title="Checklist y evidencias" onContinue={handleContinue} continueDisabled={!checklistComplete}>
      <fieldset className={styles.fieldset}>
        <legend>
          Fotos por zona ({draft.photosCount}/{REQUIRED_PHOTOS})
        </legend>
        <div className={styles.counterRow}>
          <button type="button" className={styles.counterButton} onClick={() => update({ photosCount: Math.max(0, draft.photosCount - 1) })}>
            −
          </button>
          <span className={styles.counterValue}>{draft.photosCount}</span>
          <button
            type="button"
            className={styles.counterButton}
            onClick={() => update({ photosCount: Math.min(REQUIRED_PHOTOS, draft.photosCount + 1) })}
          >
            +
          </button>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>
          Videos ({draft.videosCount}/{REQUIRED_VIDEOS})
        </legend>
        <div className={styles.counterRow}>
          <button type="button" className={styles.counterButton} onClick={() => update({ videosCount: Math.max(0, draft.videosCount - 1) })}>
            −
          </button>
          <span className={styles.counterValue}>{draft.videosCount}</span>
          <button
            type="button"
            className={styles.counterButton}
            onClick={() => update({ videosCount: Math.min(REQUIRED_VIDEOS, draft.videosCount + 1) })}
          >
            +
          </button>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Temporizador (mínimo 30 min técnico + 15 min documentario)</legend>
        <label className={styles.fieldLabel}>
          Minutos técnicos
          <input
            type="number"
            min="0"
            className={styles.input}
            value={draft.technicalMinutes}
            onChange={(e) => update({ technicalMinutes: Number(e.target.value) })}
          />
        </label>
        <label className={styles.fieldLabel}>
          Minutos documentarios
          <input
            type="number"
            min="0"
            className={styles.input}
            value={draft.documentaryMinutes}
            onChange={(e) => update({ documentaryMinutes: Number(e.target.value) })}
          />
        </label>
      </fieldset>

      <label className={styles.fieldLabel}>
        Notas (FIV / FCKE)
        <textarea className={styles.textarea} rows={3} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} />
      </label>

      {showExceptionModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <p className={styles.modalTitle}>Tiempo por debajo del mínimo</p>
            <p className={styles.summaryLine}>
              Indica el motivo por el que la inspección tomó menos del tiempo mínimo requerido.
            </p>
            <textarea
              className={styles.textarea}
              rows={3}
              value={draft.exceptionReason}
              onChange={(e) => update({ exceptionReason: e.target.value })}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setShowExceptionModal(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={!draft.exceptionReason.trim()}
                onClick={() => {
                  setShowExceptionModal(false);
                  navigate(`/alquileres/${id}/entrega-05`, { state: context ?? undefined });
                }}
              >
                Continuar con excepción
              </button>
            </div>
          </div>
        </div>
      )}
    </RentalWizardShell>
  );
}
