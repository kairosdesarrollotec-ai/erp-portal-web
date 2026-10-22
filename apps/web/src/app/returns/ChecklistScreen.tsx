import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReturnFlowShell } from './ReturnFlowShell';
import { returnFlowGuard } from './ReturnGuards';
import { useReturnFlow } from './useReturnFlow';
import { useReturnEvidence } from './useReturnEvidence';
import {
  isResponsibilityDocumentComplete,
  loadReturnChecklist,
  saveReturnChecklist,
  type ResponsibilityDocumentDraft,
  type ReturnChecklistDraft,
} from './return-session-draft';
import { SignaturePad } from './SignaturePad';
import { PHOTO_TYPES, REQUIRED_PHOTOS, REQUIRED_VIDEOS, RETURN_ZONES, VIDEO_TYPES } from './return-evidence';
import { useReturnPermissions } from './return-permissions';
import { getResponsibilityTemplate, type ResponsibilityTemplateResult } from './returns-client';
import { addEvidenceToQueue } from '../../offline/queue/evidence-upload-queue';
import { useSyncManager } from '../../offline/synchronization/use-sync-manager';
import { useOnlineStatus } from '../shared/useOnlineStatus';
import { RequestEvidenceDeletionButton } from '../evidence/RequestEvidenceDeletionButton';
import { useOpenEvidenceDeletions } from '../evidence/useOpenEvidenceDeletions';
import { deriveEvidenceSyncState, type EvidenceSyncInput } from '../shared/evidence-sync-state';
import { usePermissions } from '../shared/usePermissions';
import { saveFieldEdit } from '../../offline/queue/sync-draft-store';
import { SyncConflictPanel } from '../sync/SyncConflictPanel';
import { useChecklistSyncStatus } from '../sync/useChecklistSyncStatus';
import { canSyncAction } from '../sync/sync-permissions';
import styles from './ReturnForms.module.css';

/**
 * DEV-04 - Checklist de recepcion (movil primero). Sube fotos/videos reales
 * por URL firmada (mismo patron que ALQ-09). Con soporte offline/Dexie
 * (ADR-KAI-004, DEV-04): sin conexion, la captura se guarda en la cola local
 * de Dexie; al recuperar conexion, useSyncManager sube automaticamente.
 * No se marca "confirmado" hasta que el listado del servidor cumple 35 fotos
 * + 3 videos (estado SYNCED).
 *
 * REGLA CRITICA (ADR-KAI-004): complete-inspection (DEV-05) solo puede
 * ejecutarse cuando hay conexion y todo esta SYNCED.
 *
 * Documento de responsabilidad (BR-DEV-009 / EX-DEV-001): el cliente declara
 * no haber incurrido en infracciones; si el titular no esta, firma quien este
 * presente (nombre, relacion con el titular y firma). Es obligatorio para
 * completar el checklist; se guarda en el borrador y se envia en
 * complete-inspection (DEV-05).
 *
 * Prototipos aprobados:
 *   - PROTO-DEV-04-CHECKLIST-RECEPCION (READY desktop 1440px)
 *   - PROTO-DEV-04-CHECKLIST-RECEPCION-MOVIL (READY mobile 390px)
 *   - PROTO-DEV-04-CHECKLIST-RECEPCION-SIN-CONEXION-MOVIL (OFFLINE mobile 390px)
 *   - PROTO-DEV-04-CHECKLIST-RECEPCION-CONFIRMADO-POR-SERVIDOR-MOVIL (SYNCED mobile 390px)
 *   - PROTO-DEV-04-CHECKLIST-RECEPCION-CONFIRMADO-POR-SERVIDOR-DESKTOP (SYNCED desktop 1440px)
 */
export function ChecklistScreen() {
  const { id, state, ret, context, getIdToken } = useReturnFlow();
  const navigate = useNavigate();
  const { can } = useReturnPermissions();
  const online = useOnlineStatus();
  const { can: canPermission } = usePermissions();
  const { evidence, loaded, uploading, error, upload, reload } = useReturnEvidence(id, context, getIdToken);
  const openDeletions = useOpenEvidenceDeletions(context, 'RETURN', id);
  const [zone, setZone] = useState(RETURN_ZONES[0].value);
  const [draft, setDraft] = useState<ReturnChecklistDraft>(() => loadReturnChecklist(id));
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [template, setTemplate] = useState<ResponsibilityTemplateResult | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  /** Error al encolar en Dexie (p.ej. almacenamiento lleno). */
  const [queueError, setQueueError] = useState<string | null>(null);

  // sync.yaml: SYNCED / SYNC_CONFLICT lo confirma el SERVIDOR (GET /sync/checklists/RECEPCION/{id}).
  const serverSync = useChecklistSyncStatus({
    checklistType: 'RECEPCION',
    sourceId: id,
    companyId: context?.companyId,
    branchId: context?.branchId,
    getIdToken,
    enabled: !!context && online,
  });

  const {
    syncing: syncerSyncing,
    pendingCount: syncerPending,
    failedCount: syncerFailed,
    triggerSync,
    refreshCounts,
    syncError,
  } = useSyncManager({
    returnId: id,
    companyId: context?.companyId ?? '',
    branchId: context?.branchId ?? '',
    getIdToken,
    onSyncComplete: () => {
      void reload();
      void serverSync.reload();
    },
  });

  // Disparar sincronizacion al montar si ya hay conexion y existen items pendientes
  // de sesiones previas. syncingRef en useSyncManager evita doble ejecucion.
  const triggeredOnMount = useRef(false);
  useEffect(() => {
    if (online && !triggeredOnMount.current) {
      triggeredOnMount.current = true;
      triggerSync();
    }
  }, [online, triggerSync]);

  useEffect(() => {
    if (!id || !context || !context.companyId || !context.branchId) return;
    const { companyId, branchId } = context;
    let cancelled = false;
    getIdToken()
      .then((token) => getResponsibilityTemplate(token, id, companyId, branchId))
      .then((tpl) => { if (!cancelled) setTemplate(tpl); })
      .catch(() => { if (!cancelled) setTemplateError('No se pudo cargar el documento de responsabilidad.'); });
    return () => { cancelled = true; };
  }, [id, context, getIdToken]);

  const guard = returnFlowGuard({ state, hasReturn: Boolean(ret) });
  if (guard || !ret) return guard;

  const photosCount = evidence.filter((e) => e.type === 'PHOTO').length;
  const videosCount = evidence.filter((e) => e.type === 'VIDEO').length;
  const syncInput: EvidenceSyncInput = {
    isOnline: online,
    syncing: syncerSyncing || uploading,
    serverLoaded: loaded,
    photosCount,
    videosCount,
    pendingCount: syncerPending,
    serverSync: {
      loaded: serverSync.loaded,
      status: serverSync.data?.status,
      serverConfirmedAt: serverSync.data?.serverConfirmedAt ?? null,
    },
  };
  const conflictState = deriveEvidenceSyncState({ ...syncInput, syncing: false }) === 'SYNC_CONFLICT';
  // Conteos del listado + confirmacion /sync del servidor (sin uso offline el servidor responde SYNCED y rige el conteo).
  const synced =
    !conflictState &&
    deriveEvidenceSyncState({ ...syncInput, syncing: false, pendingCount: 0 }) === 'SYNCED';
  const signedDoc = ret.responsibilityDocument;
  const doc = draft.responsibilityDocument;
  const docComplete = Boolean(signedDoc) || isResponsibilityDocumentComplete(doc);
  const wrongState = ret.status !== 'INSPECCION' && ret.status !== 'SIN_DANOS' && ret.status !== 'CON_DANOS';

  /** Items pendientes en la cola Dexie (mismo contador que ENTREGA-04: refreshCounts tras encolar). */
  const totalPending = syncerPending;
  const hasPending = totalPending > 0;

  /**
   * La captura (foto/video) esta habilitada aunque sin conexion para poder
   * guardar en la cola offline de Dexie. Se bloquea solo si el estado del
   * retorno no permite evidencia o si hay una subida directa en curso.
   */
  const canCapture = can('UPLOAD_EVIDENCE') && !uploading && !wrongState;

  /**
   * ADR-KAI-004: complete-inspection SOLO puede ejecutarse online y sin
   * items pendientes de sincronizar.
   */
  const continueDisabled = !online || syncerSyncing || hasPending || !synced || !docComplete;

  function update(patch: Partial<ReturnChecklistDraft>) {
    // Sin conexion los campos escalares del checklist tambien quedan en el borrador Dexie para /sync.
    if (id && !online) {
      for (const key of ['fivDone', 'fckeDone', 'notes'] as const) {
        const value = patch[key];
        if (value !== undefined) void saveFieldEdit('RECEPCION', id, { key, value }).catch(() => undefined);
      }
    }
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveReturnChecklist(id, next);
      return next;
    });
  }

  function updateDoc(patch: Partial<ResponsibilityDocumentDraft>) {
    update({ responsibilityDocument: { ...draft.responsibilityDocument, ...patch } });
  }

  async function enqueueFiles(type: 'PHOTO' | 'VIDEO', files: File[]): Promise<void> {
    setQueueError(null);
    let added = 0;
    for (const file of files) {
      const allowed = type === 'PHOTO' ? PHOTO_TYPES : VIDEO_TYPES;
      if (!allowed.includes(file.type)) {
        setQueueError(type === 'PHOTO' ? 'Solo se admiten imágenes JPEG o WebP.' : 'Solo se admiten videos MP4 o WebM.');
        continue;
      }
      try {
        await addEvidenceToQueue({
          returnId: id,
          rentalId: null,
          type,
          zone,
          mimeType: file.type,
          blob: file,
        });
        added++;
      } catch {
        setQueueError('No se pudo guardar el archivo en el dispositivo. Verifica el espacio disponible.');
        break;
      }
    }
    if (added > 0) await refreshCounts();
  }

  function onFiles(type: 'PHOTO' | 'VIDEO', event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    if (!online) {
      void enqueueFiles(type, files);
      return;
    }
    void upload(type, zone, files);
  }

  const photoPct = Math.min(100, Math.round((photosCount / REQUIRED_PHOTOS) * 100));

  return (
    <ReturnFlowShell
      step={3}
      title="Checklist de recepción"
      onContinue={() => navigate(`/devoluciones/${id}/resultado`, { state: context })}
      continueLabel="Continuar a Resultado"
      continueDisabled={continueDisabled}
      lateness={ret.lateness}
      latenessCharge={ret.latenessCharge}
    >
      <h1 className={styles.pageHeading}>
        Recepción — {ret.vehiclePlate ?? 'Vehículo'}
      </h1>
      <p className={styles.pageSubtitle}>35 fotos, 3 videos, FIV y FCKE del vehículo devuelto.</p>

      {/* ── Banners de estado ── */}
      {!online && (
        <p className={`${styles.banner} ${styles.banner_warning}`} role="status">
          Sin conexión — tu trabajo se guarda en este dispositivo
          {totalPending > 0 && ` ${totalPending} archivo${totalPending !== 1 ? 's' : ''} pendiente${totalPending !== 1 ? 's' : ''} de sincronizar.`}
        </p>
      )}
      {online && syncerSyncing && (
        <p className={`${styles.banner} ${styles.banner_info}`} role="status">
          Sincronizando {totalPending > 0 ? `${totalPending} archivo${totalPending !== 1 ? 's' : ''}` : 'archivos'}…
        </p>
      )}
      {online && !syncerSyncing && uploading && (
        <p className={`${styles.banner} ${styles.banner_info}`} role="status">
          Sincronizando archivos con el servidor…
        </p>
      )}
      {conflictState && (
        <p className={`${styles.banner} ${styles.banner_error}`} role="alert">
          Hay conflictos de sincronización. «Continuar a Resultado» queda deshabilitado hasta que un supervisor los resuelva.
        </p>
      )}
      {serverSync.data && context && (
        <SyncConflictPanel
          checklistType="RECEPCION"
          companyId={context.companyId}
          branchId={context.branchId}
          getIdToken={getIdToken}
          conflicts={serverSync.data.openConflicts}
          canResolve={canSyncAction(canPermission, 'RECEPCION', 'RESOLVE')}
          onChanged={async () => {
            await serverSync.reload();
            await reload();
          }}
        />
      )}
      {online && !serverSync.loaded && serverSync.error && (
        <p className={`${styles.banner} ${styles.banner_warning}`} role="alert">
          {serverSync.error} «Continuar a Resultado» se habilita cuando el servidor confirme la sincronización.
        </p>
      )}
      {syncError && (
        <p className={`${styles.banner} ${styles.banner_warning}`} role="alert">
          {syncError}
        </p>
      )}
      {online && !syncerSyncing && !uploading && synced && !hasPending && (
        <p className={`${styles.banner} ${styles.banner_success}`} role="status">
          Confirmado por el servidor — recepción completa
        </p>
      )}
      {online && !syncerSyncing && !uploading && !synced && loaded && !hasPending && (
        <p className={`${styles.banner} ${styles.banner_info}`} role="status">
          Faltan {Math.max(0, REQUIRED_PHOTOS - photosCount)} fotos y {Math.max(0, REQUIRED_VIDEOS - videosCount)} videos
          para completar la recepción.
        </p>
      )}
      {online && !syncerSyncing && hasPending && !uploading && syncerFailed === 0 && (
        <p className={`${styles.banner} ${styles.banner_info}`} role="status">
          {totalPending} archivo{totalPending !== 1 ? 's' : ''} pendiente{totalPending !== 1 ? 's' : ''} de sincronizar.
        </p>
      )}
      {online && !syncerSyncing && syncerFailed > 0 && !uploading && (
        <div className={`${styles.banner} ${styles.banner_warning}`} role="alert">
          {syncerFailed} archivo{syncerFailed !== 1 ? 's' : ''} no pudo sincronizarse. Verifica tu conexión.{' '}
          <button type="button" className={styles.textLink} onClick={triggerSync}>
            Reintentar sincronización
          </button>
        </div>
      )}

      <label className={styles.fieldLabel}>
        Zona del vehículo
        <select className={styles.select} value={zone} onChange={(e) => setZone(e.target.value)}>
          {RETURN_ZONES.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className={styles.fieldset}>
        <legend>
          Fotos ({photosCount}/{REQUIRED_PHOTOS}{totalPending > 0 ? ` + ${totalPending} en cola` : ''})
        </legend>
        <div
          className={styles.meter}
          role="progressbar"
          aria-label="Progreso de fotos"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={photoPct}
        >
          <div className={styles.meterFill} style={{ width: `${photoPct}%` }} />
        </div>
        <div className={styles.evidenceToolbar}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!canCapture}
            onClick={() => photoInputRef.current?.click()}
          >
            {uploading ? 'Subiendo…' : 'Agregar fotos'}
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/webp"
            capture="environment"
            multiple
            hidden
            aria-label="Seleccionar fotos"
            onChange={(e) => onFiles('PHOTO', e)}
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
            disabled={!canCapture}
            onClick={() => videoInputRef.current?.click()}
          >
            {uploading ? 'Subiendo…' : 'Agregar video'}
          </button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            capture="environment"
            hidden
            aria-label="Seleccionar video"
            onChange={(e) => onFiles('VIDEO', e)}
          />
        </div>
      </fieldset>

      {(error ?? queueError) && (
        <p className={styles.evidenceError} role="alert">
          {error ?? queueError}
        </p>
      )}

      <fieldset className={styles.fieldset}>
        <legend>Progreso por zona</legend>
        <ul className={styles.evidenceList}>
          {RETURN_ZONES.map((z) => {
            const photos = evidence.filter((e) => e.zone === z.value && e.type === 'PHOTO').length;
            const videos = evidence.filter((e) => e.zone === z.value && e.type === 'VIDEO').length;
            return (
              <li key={z.value} className={styles.evidenceListItem}>
                <span>{z.label}</span>
                <span>
                  {photos} fotos · {videos} videos
                </span>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {evidence.length > 0 && (
        <fieldset className={styles.fieldset}>
          <legend>Archivos subidos</legend>
          <ul className={styles.evidenceList}>
            {evidence.map((item) => {
              const zoneLabel = RETURN_ZONES.find((z) => z.value === item.zone)?.label ?? item.zone;
              const kind = item.type === 'PHOTO' ? 'Foto' : 'Video';
              return (
                <li key={item.id} className={styles.evidenceListItem}>
                  <span>
                    {kind} · {zoneLabel}
                  </span>
                  {context && id && (
                    <RequestEvidenceDeletionButton
                      companyId={context.companyId}
                      branchId={context.branchId}
                      targetKind="RETURN"
                      targetId={id}
                      evidenceId={item.id}
                      label={`${kind.toLowerCase()} ${zoneLabel}`}
                      openRequest={openDeletions.byEvidence[item.id]}
                      disabled={!online}
                      onRequested={openDeletions.track}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <fieldset className={styles.fieldset}>
        <legend>Formatos</legend>
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={draft.fivDone} onChange={(e) => update({ fivDone: e.target.checked })} />
          FIV — inspección vehicular completada
        </label>
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={draft.fckeDone} onChange={(e) => update({ fckeDone: e.target.checked })} />
          FCKE — control de kit de emergencia completado
        </label>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Documento de responsabilidad</legend>
        <p className={styles.summaryLine}>
          El cliente declara no haber incurrido en infracciones durante el alquiler (respaldo ante la SAT). Si el titular no
          está presente, firma quien devuelve el vehículo.
        </p>
        {signedDoc ? (
          <p className={`${styles.banner} ${styles.banner_success}`} role="status">
            Documento firmado por {signedDoc.signerName} (
            {signedDoc.signerIsHolder
              ? 'titular'
              : `no es el titular${signedDoc.signerRelationToHolder ? ` — ${signedDoc.signerRelationToHolder}` : ''}`}
            ).
          </p>
        ) : (
          <>
            {!docComplete && (
              <p className={`${styles.banner} ${styles.banner_info}`} role="status">
                Falta el documento de responsabilidad firmado para completar el checklist.
              </p>
            )}
            <label className={styles.fieldLabel}>
              Nombre de quien firma
              <input
                className={styles.input}
                value={doc.signerName}
                onChange={(e) => updateDoc({ signerName: e.target.value })}
                autoComplete="off"
              />
            </label>
            <fieldset className={styles.fieldset}>
              <legend>¿Quien firma es el titular?</legend>
              <div className={styles.radioRow}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="signer-is-holder"
                    checked={doc.signerIsHolder === true}
                    onChange={() => updateDoc({ signerIsHolder: true, signerRelationToHolder: '' })}
                  />
                  Sí, es el titular
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="signer-is-holder"
                    checked={doc.signerIsHolder === false}
                    onChange={() => updateDoc({ signerIsHolder: false })}
                  />
                  No, es otra persona
                </label>
              </div>
            </fieldset>
            {doc.signerIsHolder === false && (
              <label className={styles.fieldLabel}>
                Relación con el titular
                <input
                  className={styles.input}
                  value={doc.signerRelationToHolder}
                  onChange={(e) => updateDoc({ signerRelationToHolder: e.target.value })}
                  autoComplete="off"
                />
              </label>
            )}
            {template && (
              <div className={styles.templateContent}>
                <p className={styles.templateTitle}>{template.name}</p>
                <pre className={styles.templateText}>{template.content}</pre>
              </div>
            )}
            {templateError && !template && (
              <p className={styles.evidenceError} role="alert">{templateError}</p>
            )}
            <p className={styles.summaryLine}>Firma (dibuja con el dedo o el mouse)</p>
            <SignaturePad
              label="Firma del documento de responsabilidad"
              value={doc.signatureData}
              onChange={(signatureData) => updateDoc({ signatureData })}
            />
          </>
        )}
      </fieldset>

      <label className={styles.fieldLabel}>
        Notas
        <textarea className={styles.textarea} rows={3} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} />
      </label>
    </ReturnFlowShell>
  );
}
