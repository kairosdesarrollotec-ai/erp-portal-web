import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import { CancelRentalControl } from './CancelRentalControl';
import { loadChecklistDraft, saveChecklistDraft, RentalChecklistDraft } from './rental-checklist-draft';
import {
  listRentalEvidence,
  recordEvidence,
  requestEvidenceUploadSession,
  uploadEvidenceToGcs,
  RentalCommandError,
  RentalEvidenceType,
  RentalEvidenceZone,
} from './rentals-client';
import { recordVehicleOperationalFormat, listVehicleOperationalRecords } from '../fleet/fleet-client';
import { FIV_ITEMS, FCKE_ITEMS } from '../shared/vehicle-checklist-items';
import { RequestEvidenceDeletionButton } from '../evidence/RequestEvidenceDeletionButton';
import { useOpenEvidenceDeletions } from '../evidence/useOpenEvidenceDeletions';
import { addEvidenceToQueue } from '../../offline/queue/evidence-upload-queue';
import { useSyncManager } from '../../offline/synchronization/use-sync-manager';
import { saveFieldEdit } from '../../offline/queue/sync-draft-store';
import { SyncConflictPanel } from '../sync/SyncConflictPanel';
import { useChecklistSyncStatus } from '../sync/useChecklistSyncStatus';
import { canSyncAction } from '../sync/sync-permissions';
import { usePermissions } from '../shared/usePermissions';
import styles from './RentalStageForms.module.css';
import { formatLimaTime } from '../shared/lima-time';
import { useOnlineStatus } from '../shared/useOnlineStatus';
import {
  REQUIRED_EVIDENCE_PHOTOS,
  REQUIRED_EVIDENCE_VIDEOS,
  deriveEvidenceSyncState,
  type EvidenceSyncInput,
} from '../shared/evidence-sync-state';
import { VehicleChecklistForm } from '../shared/VehicleChecklistForm';

const REQUIRED_PHOTOS = REQUIRED_EVIDENCE_PHOTOS;
const REQUIRED_VIDEOS = REQUIRED_EVIDENCE_VIDEOS;
const MIN_TECHNICAL_MINUTES = 30;
const MIN_DOCUMENTARY_MINUTES = 15;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024; // 12 MB — SDD-00 §16.5, mismo limite que Fleet
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const ZONES: { value: RentalEvidenceZone; label: string }[] = [
  { value: 'FRONTAL', label: 'Frontal' },
  { value: 'LATERAL_IZQUIERDO', label: 'Lateral izquierdo' },
  { value: 'LATERAL_DERECHO', label: 'Lateral derecho' },
  { value: 'POSTERIOR', label: 'Posterior' },
  { value: 'INTERIOR', label: 'Interior' },
];

/**
 * ENTREGA-04 / ALQ-09 - Checklist y evidencias.
 *
 * Soporta captura de fotos/videos en modo OFFLINE mediante cola Dexie
 * (ADR-KAI-004: complete-delivery solo online; Continuar deshabilitado
 * mientras haya items pendientes de sincronización).
 *
 * Online: sube directamente a GCS (mismo patrón de 2 pasos que Fleet).
 * Offline: guarda Blob en Dexie vía evidence-upload-queue.
 * Sincronizando: useSyncManager detecta `online` y sube items pendientes.
 * Sincronizado: query listRentalEvidence reporta ≥35 fotos y ≥3 videos.
 */
export function Stage4ChecklistScreen() {
  const { id, state, rental, context, getIdToken } = useRentalWizard();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<RentalChecklistDraft>(() => loadChecklistDraft(id));
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [zone, setZone] = useState<RentalEvidenceZone>('FRONTAL');
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const { can } = usePermissions();

  // sync.yaml: el estado SYNCED/SYNC_CONFLICT lo confirma el SERVIDOR (GET /sync/checklists/ENTREGA/{id}).
  const serverSync = useChecklistSyncStatus({
    checklistType: 'ENTREGA',
    sourceId: id,
    companyId: context?.companyId,
    branchId: context?.branchId,
    getIdToken,
    enabled: !!context && isOnline,
  });

  const { data: evidence = [], isSuccess: evidenceLoaded } = useQuery({
    queryKey: ['rental', id, 'evidence'] as const,
    queryFn: async () => {
      const idToken = await getIdToken();
      return listRentalEvidence(idToken, id, context!.companyId, context!.branchId);
    },
    enabled: !!context && isOnline,
  });

  const { syncing, pendingCount, failedCount, refreshCounts, syncError } = useSyncManager({
    rentalId: id ?? null,
    getIdToken,
    companyId: context?.companyId ?? '',
    branchId: context?.branchId ?? '',
    onSyncComplete: () => {
      void queryClient.invalidateQueries({ queryKey: ['rental', id, 'evidence'] });
      void serverSync.reload();
    },
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Eliminar evidencia = SOLICITUD con doble aprobacion (DEC-EVID-DELETE-002); el borrado directo ya no se usa aqui.
  const openDeletions = useOpenEvidenceDeletions(context, 'RENTAL', id);

  function update(patch: Partial<RentalChecklistDraft>) {
    // Sin conexion cada campo editado tambien queda en el borrador Dexie (con su revision base) para /sync.
    if (id && !isOnline) {
      for (const [key, value] of Object.entries(patch)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          void saveFieldEdit('ENTREGA', id, { key, value }).catch(() => undefined);
        }
      }
    }
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (id) saveChecklistDraft(id, next);
      return next;
    });
  }

  // La foto del alcoholímetro (zona ALCOHOL_TEST, ENTREGA-02) NO cuenta para las 35 fotos del checklist (rentals.yaml 1.12.0).
  const photosCount = evidence.filter((item) => item.type === 'PHOTO' && item.zone !== 'ALCOHOL_TEST').length;
  const videosCount = evidence.filter((item) => item.type === 'VIDEO').length;

  // El checklist está completo solo cuando el servidor confirma las evidencias
  // y no hay items locales pendientes de sincronización (ADR-KAI-004).
  const syncInput: EvidenceSyncInput = {
    isOnline,
    syncing,
    serverLoaded: evidenceLoaded,
    photosCount,
    videosCount,
    pendingCount,
    serverSync: {
      loaded: serverSync.loaded,
      status: serverSync.data?.status,
      serverConfirmedAt: serverSync.data?.serverConfirmedAt ?? null,
    },
  };
  const syncState = deriveEvidenceSyncState(syncInput);
  const checklistComplete = syncState === 'SYNCED';

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

    // ── OFFLINE: guardar en cola Dexie ─────────────────────────────────────
    if (!isOnline) {
      try {
        await addEvidenceToQueue({
          rentalId: id,
          returnId: null,
          type,
          zone,
          mimeType: file.type,
          blob: file,
        });
        await refreshCounts();
      } catch {
        setUploadError('No pudimos guardar el archivo localmente. Intenta de nuevo.');
      }
      return;
    }

    // ── ONLINE: subida directa a GCS ───────────────────────────────────────
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
      await queryClient.invalidateQueries({ queryKey: ['rental', id, 'evidence'] });
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

  // Cargar datos previos de formatos FIV, FCKE y RNC guardados (C2)
  useEffect(() => {
    if (!context || !id || !rental?.vehicleId || !isOnline) return;
    let cancelled = false;
    getIdToken()
      .then((token) =>
        listVehicleOperationalRecords(token, rental.vehicleId, {
          companyId: context.companyId,
          branchId: context.branchId,
        }),
      )
      .then((res) => {
        if (cancelled || !res?.items?.length) return;
        const rentalRecords = res.items.filter(
          (r: any) => r.processType === 'RENTAL' && r.processId === id,
        );
        if (!rentalRecords.length) return;
        const patch: Record<string, unknown> = {};
        for (const rec of rentalRecords) {
          if (rec.odometerKm !== null && rec.odometerKm !== undefined) patch.rnc_kilometraje = rec.odometerKm;
          if (rec.fuelLevelLines !== null && rec.fuelLevelLines !== undefined) patch.rnc_nivel_combustible_lineas = rec.fuelLevelLines;
          if (rec.data && typeof rec.data === 'object') {
            Object.assign(patch, rec.data);
          }
        }
        setDraft((prev) => ({ ...patch, ...prev }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, context, rental?.vehicleId, isOnline, getIdToken]);

  async function persistChecklistFormats() {
    if (!context || !id || !rental?.vehicleId) return;
    try {
      const idToken = await getIdToken();
      const vehicleId = rental.vehicleId;
      const companyId = context.companyId;
      const branchId = context.branchId;

      const fivData: Record<string, unknown> = {};
      for (const item of FIV_ITEMS) {
        if (draft[item.key] !== undefined) fivData[item.key] = draft[item.key];
      }

      const fckeData: Record<string, unknown> = {};
      for (const item of FCKE_ITEMS) {
        if (draft[item.key] !== undefined) fckeData[item.key] = draft[item.key];
      }

      const fuelLines = typeof draft.rnc_nivel_combustible_lineas === 'number' ? Number(draft.rnc_nivel_combustible_lineas) : undefined;
      const odometer = typeof draft.rnc_kilometraje === 'number' ? Number(draft.rnc_kilometraje) : undefined;
      const performedBy = (context as any)?.firebaseUid || 'operador';

      await Promise.all([
        recordVehicleOperationalFormat(idToken, vehicleId, {
          companyId,
          branchId,
          formatType: 'FORMATO_02_FIV',
          processType: 'RENTAL',
          processId: id,
          odometerKm: odometer,
          fuelLevelLines: fuelLines,
          data: fivData,
          observations: draft.notes || undefined,
          performedBy,
        }, `rental-${id}-fiv`).catch(() => undefined),

        recordVehicleOperationalFormat(idToken, vehicleId, {
          companyId,
          branchId,
          formatType: 'FORMATO_08_FCKE',
          processType: 'RENTAL',
          processId: id,
          data: fckeData,
          observations: draft.notes || undefined,
          performedBy,
        }, `rental-${id}-fcke`).catch(() => undefined),

        recordVehicleOperationalFormat(idToken, vehicleId, {
          companyId,
          branchId,
          formatType: 'FORMATO_06_RNC',
          processType: 'RENTAL',
          processId: id,
          odometerKm: odometer,
          fuelLevelLines: fuelLines,
          data: { sugerencia: draft.rnc_sugerencia ?? null },
          observations: draft.notes || undefined,
          performedBy,
        }, `rental-${id}-rnc`).catch(() => undefined),
      ]);
    } catch {
      // Fallback a borrador local
    }
  }

  function handleContinue() {
    if (timeBelowMinimum && !draft.exceptionReason.trim()) {
      setShowExceptionModal(true);
      return;
    }
    void persistChecklistFormats();
    navigate(`/alquileres/${id}/entrega-05`, { state: context ?? undefined });
  }

  if (state === 'LOADING') return <p className={styles.statusText}>Cargando expediente…</p>;
  if (state === 'RECOVERABLE_ERROR' || state === 'NOT_FOUND' || !rental) {
    return <p className={styles.statusText}>No pudimos cargar el expediente. Intenta de nuevo.</p>;
  }

  // El botón Continuar se deshabilita si: el checklist no está completo,
  // o estamos offline, o hay sincronización en progreso, o hay items pendientes
  // (ADR-KAI-004: complete-delivery solo online).
  const continueDisabled = !checklistComplete || !isOnline || syncing || pendingCount > 0;

  return (
    <RentalWizardShell stage={4} title="Checklist y evidencias" cancelControl={<CancelRentalControl rental={rental} context={context} getIdToken={getIdToken} />} onContinue={handleContinue} continueDisabled={continueDisabled}>

      {/* ── Banner de estado de conectividad ── */}
      {syncState === 'OFFLINE' && (
        <div className={styles.offlineBanner} role="status" aria-live="polite">
          {/* Ícono wifi-off per prototipo PROTO-ALQ-09-CHECKLIST-SIN-CONEXION-MOVIL */}
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3l18 18M9.88 9.88A3 3 0 1014.12 14.12M6.1 7.2A7 7 0 004 12a5 5 0 005 5h8a4.97 4.97 0 002.5-.68M19.83 15.13A5 5 0 0018 10h-1.26A8 8 0 009.17 4.67" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            Sin conexión — tu trabajo se guarda en este dispositivo y se sube cuando vuelvas a tener señal
            {pendingCount > 0 && (
              <span className={styles.offlinePendingBadge} style={{ marginLeft: '0.5rem' }}>
                {pendingCount} {pendingCount === 1 ? 'archivo pendiente' : 'archivos pendientes'}
              </span>
            )}
          </span>
        </div>
      )}

      {syncState === 'SYNC_CONFLICT' && (
        <div className={styles.offlineBanner} role="alert">
          <span>Hay conflictos de sincronización. «Continuar» queda deshabilitado hasta que un supervisor los resuelva.</span>
        </div>
      )}

      {serverSync.data && context && (
        <SyncConflictPanel
          checklistType="ENTREGA"
          companyId={context.companyId}
          branchId={context.branchId}
          getIdToken={getIdToken}
          conflicts={serverSync.data.openConflicts}
          canResolve={canSyncAction(can, 'ENTREGA', 'RESOLVE')}
          onChanged={async () => {
            await serverSync.reload();
            await queryClient.invalidateQueries({ queryKey: ['rental', id, 'evidence'] });
          }}
        />
      )}

      {isOnline && !serverSync.loaded && serverSync.error && (
        <p className={styles.evidenceError} role="alert">
          {serverSync.error} «Continuar» se habilita cuando el servidor confirme la sincronización.
        </p>
      )}

      {syncError && (
        <p className={styles.evidenceError} role="alert">
          {syncError}
        </p>
      )}

      {syncState === 'SYNCING' && (
        <div className={styles.syncingBanner} role="status" aria-live="polite">
          {/* Spinner animado */}
          <svg className={styles.spinnerIcon} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.2" />
            <path d="M12 3a9 9 0 019 9" strokeLinecap="round" />
          </svg>
          <span>
            Sincronizando {pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? 'archivo' : 'archivos'}` : 'archivos'}…
          </span>
        </div>
      )}

      {syncState === 'SYNCED' && (
        <div className={styles.syncedBanner} role="status" aria-live="polite">
          {/* Ícono check per prototipo PROTO-ALQ-09-CHECKLIST-CONFIRMADO-POR-SERVIDOR-MOVIL */}
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            Confirmado por servidor
            <span className={styles.syncedBadge} style={{ marginLeft: '0.5rem' }}>
              {photosCount} fotos · {videosCount} videos
            </span>
          </span>
        </div>
      )}

      {failedCount > 0 && (
        <p className={styles.evidenceError} role="alert">
          {failedCount} {failedCount === 1 ? 'archivo no pudo sincronizarse' : 'archivos no pudieron sincronizarse'}. Vuelve a tener conexión para reintentar.
        </p>
      )}

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
          Fotos ({photosCount}/{REQUIRED_PHOTOS}
          {pendingCount > 0 && ` + ${pendingCount} local`})
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
              <span>{formatLimaTime(item.uploadedAt)}</span>
              {context && id && (
                <RequestEvidenceDeletionButton
                  companyId={context.companyId}
                  branchId={context.branchId}
                  targetKind="RENTAL"
                  targetId={id}
                  evidenceId={item.id}
                  label={`${item.type === 'PHOTO' ? 'foto' : 'video'} ${ZONES.find((z) => z.value === item.zone)?.label ?? item.zone}`}
                  openRequest={openDeletions.byEvidence[item.id]}
                  disabled={!isOnline}
                  onRequested={openDeletions.track}
                />
              )}
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

      <VehicleChecklistForm
        values={draft}
        onChange={(k, v) => update({ [k]: v })}
      />

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
                  void persistChecklistFormats();
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
