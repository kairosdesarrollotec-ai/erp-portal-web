import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import { loadChecklistDraft, saveChecklistDraft, RentalChecklistDraft } from './rental-checklist-draft';
import {
  listRentalEvidence,
  recordEvidence,
  requestEvidenceUploadSession,
  uploadEvidenceToGcs,
  RentalCommandError,
  RentalEvidenceResponse,
  RentalEvidenceType,
  RentalEvidenceZone,
} from './rentals-client';
import styles from './RentalStageForms.module.css';

const REQUIRED_PHOTOS = 35;
const REQUIRED_VIDEOS = 3;
const MIN_TECHNICAL_MINUTES = 30;
const MIN_DOCUMENTARY_MINUTES = 15;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024; // 12 MB — SDD-00 §16.5, mismo limite que Fleet
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // supuesto propio de esta tarea (sin BR que fije un maximo)

const ZONES: { value: RentalEvidenceZone; label: string }[] = [
  { value: 'FRONTAL', label: 'Frontal' },
  { value: 'LATERAL_IZQUIERDO', label: 'Lateral izquierdo' },
  { value: 'LATERAL_DERECHO', label: 'Lateral derecho' },
  { value: 'POSTERIOR', label: 'Posterior' },
  { value: 'INTERIOR', label: 'Interior' },
];

/**
 * ENTREGA-04 / ALQ-09 - Checklist y evidencias (mapea a complete-delivery, ejecutado
 * en ENTREGA-05). Sube fotos/videos reales a GCS (mismo patron de 2 pasos
 * que Fleet/NewVehicleModal: pedir URL firmada -> PUT a GCS -> confirmar con
 * POST /rentals/:id/evidence) en vez de los contadores manuales anteriores.
 * Version ONLINE-ONLY: si no hay conexion, la subida falla con un mensaje de
 * error (no hay cola offline/IndexedDB - eso es TR-08, fuera de este track).
 */
export function Stage4ChecklistScreen() {
  const { id, state, rental, context, getIdToken } = useRentalWizard();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<RentalChecklistDraft>(() => loadChecklistDraft(id));
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [zone, setZone] = useState<RentalEvidenceZone>('FRONTAL');
  const [evidence, setEvidence] = useState<RentalEvidenceResponse[]>([]);
  const [evidenceLoaded, setEvidenceLoaded] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const loadEvidence = useCallback(async () => {
    if (!context || !id) return;
    try {
      const idToken = await getIdToken();
      const records = await listRentalEvidence(idToken, id, context.companyId, context.branchId);
      setEvidence(records);
    } catch {
      // ver nota de clase: version online-only, un fallo de lectura no bloquea
      // la pantalla, solo deja el progreso en 0 hasta el proximo reintento.
    } finally {
      setEvidenceLoaded(true);
    }
  }, [context, id, getIdToken]);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  function update(patch: Partial<RentalChecklistDraft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (id) saveChecklistDraft(id, next);
      return next;
    });
  }

  const photosCount = evidence.filter((item) => item.type === 'PHOTO').length;
  const videosCount = evidence.filter((item) => item.type === 'VIDEO').length;
  const checklistComplete = evidenceLoaded && photosCount >= REQUIRED_PHOTOS && videosCount >= REQUIRED_VIDEOS;
  const timeBelowMinimum =
    draft.technicalMinutes < MIN_TECHNICAL_MINUTES || draft.documentaryMinutes < MIN_DOCUMENTARY_MINUTES;

  async function handleFileSelected(type: RentalEvidenceType, file: File) {
    if (!context || !id) return;

    const allowedTypes = type === 'PHOTO' ? ['image/jpeg', 'image/webp'] : ['video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        type === 'PHOTO' ? 'Solo se admiten imágenes JPEG o WebP.' : 'Solo se admiten videos MP4 o WebM.',
      );
      return;
    }
    const maxBytes = type === 'PHOTO' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      setUploadError(`El archivo supera el tamaño máximo de ${Math.round(maxBytes / (1024 * 1024))} MB.`);
      return;
    }

    setUploadError(null);
    const setUploading = type === 'PHOTO' ? setUploadingPhoto : setUploadingVideo;
    setUploading(true);
    try {
      const idToken = await getIdToken();
      const session = await requestEvidenceUploadSession(
        idToken,
        id,
        context.companyId,
        context.branchId,
        type,
        zone,
        file.type as never,
        file.size,
      );
      await uploadEvidenceToGcs(session.uploadUrl, file);
      await recordEvidence(idToken, id, context.companyId, context.branchId, type, zone, session.objectUrl);
      await loadEvidence();
    } catch (err) {
      if (err instanceof RentalCommandError) setUploadError(err.message);
      else setUploadError('No pudimos subir el archivo. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  }

  function onPhotoInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void handleFileSelected('PHOTO', file);
  }

  function onVideoInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void handleFileSelected('VIDEO', file);
  }

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
      <label className={styles.fieldLabel}>
        Zona del vehículo
        <select className={styles.select} value={zone} onChange={(e) => setZone(e.target.value as RentalEvidenceZone)}>
          {ZONES.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className={styles.fieldset}>
        <legend>
          Fotos ({photosCount}/{REQUIRED_PHOTOS})
        </legend>
        <div className={styles.evidenceToolbar}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={uploadingPhoto}
            onClick={() => photoInputRef.current?.click()}
          >
            {uploadingPhoto ? 'Subiendo…' : 'Agregar foto'}
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={onPhotoInputChange}
          />
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>
          Videos ({videosCount}/{REQUIRED_VIDEOS})
        </legend>
        <div className={styles.evidenceToolbar}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={uploadingVideo}
            onClick={() => videoInputRef.current?.click()}
          >
            {uploadingVideo ? 'Subiendo…' : 'Agregar video'}
          </button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            style={{ display: 'none' }}
            onChange={onVideoInputChange}
          />
        </div>
      </fieldset>

      {uploadError && <p className={styles.evidenceError}>{uploadError}</p>}

      {evidence.length > 0 && (
        <ul className={styles.evidenceList}>
          {evidence.map((item) => (
            <li key={item.id} className={styles.evidenceListItem}>
              <span>
                {item.type === 'PHOTO' ? 'Foto' : 'Video'} · {ZONES.find((z) => z.value === item.zone)?.label ?? item.zone}
              </span>
              <span>{new Date(item.uploadedAt).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      )}

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
