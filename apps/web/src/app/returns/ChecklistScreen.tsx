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
import { REQUIRED_PHOTOS, REQUIRED_VIDEOS, RETURN_ZONES } from './return-evidence';
import { useReturnPermissions } from './return-permissions';
import { getResponsibilityTemplate, type ResponsibilityTemplateResult } from './returns-client';
import styles from './ReturnForms.module.css';

function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/**
 * DEV-04 - Checklist de recepcion (movil primero). Sube fotos/videos reales
 * por URL firmada (mismo patron que ALQ-09). Version ONLINE-ONLY: sin cola
 * offline/IndexedDB (eso es TR-08, fuera de este track): sin conexion la
 * captura se pausa (estado OFFLINE_READ_ONLY). No se marca "confirmado" hasta
 * que el listado del servidor cumple 35 fotos + 3 videos (estado SYNCED).
 *
 * Documento de responsabilidad (BR-DEV-009 / EX-DEV-001): el cliente declara no
 * haber incurrido en infracciones; si el titular no esta, firma quien este
 * presente (nombre, relacion con el titular y firma). Es obligatorio para
 * completar el checklist; se guarda en el borrador y se envia en
 * complete-inspection (DEV-05). Sin prototipo Stitch propio: ver reporte.
 *
 * Prototipo(s) aprobado(s): PROTO-DEV-04-CHECKLIST-RECEPCION (+ -MOVIL, -CONFIRMADO-POR-SERVIDOR-MOVIL/-DESKTOP, -SIN-CONEXION-MOVIL).
 */
export function ChecklistScreen() {
  const { id, state, ret, context, getIdToken } = useReturnFlow();
  const navigate = useNavigate();
  const { can } = useReturnPermissions();
  const online = useOnline();
  const { evidence, loaded, uploading, error, upload } = useReturnEvidence(id, context, getIdToken);
  const [zone, setZone] = useState(RETURN_ZONES[0].value);
  const [draft, setDraft] = useState<ReturnChecklistDraft>(() => loadReturnChecklist(id));
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [template, setTemplate] = useState<ResponsibilityTemplateResult | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

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
  const synced = loaded && photosCount >= REQUIRED_PHOTOS && videosCount >= REQUIRED_VIDEOS;
  const signedDoc = ret.responsibilityDocument;
  const doc = draft.responsibilityDocument;
  const docComplete = Boolean(signedDoc) || isResponsibilityDocumentComplete(doc);
  const wrongState = ret.status !== 'INSPECCION' && ret.status !== 'SIN_DANOS' && ret.status !== 'CON_DANOS';
  const canUpload = online && can('UPLOAD_EVIDENCE') && !uploading && !wrongState;

  function update(patch: Partial<ReturnChecklistDraft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveReturnChecklist(id, next);
      return next;
    });
  }

  function updateDoc(patch: Partial<ResponsibilityDocumentDraft>) {
    update({ responsibilityDocument: { ...draft.responsibilityDocument, ...patch } });
  }

  function onFiles(type: 'PHOTO' | 'VIDEO', event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void upload(type, zone, files);
  }

  const photoPct = Math.min(100, Math.round((photosCount / REQUIRED_PHOTOS) * 100));

  return (
    <ReturnFlowShell
      step={3}
      title="Checklist de recepción"
      onContinue={() => navigate(`/devoluciones/${id}/resultado`, { state: context })}
      continueLabel="Continuar a Resultado"
      continueDisabled={!synced || !docComplete}
    >
      <h1 className={styles.pageHeading}>
        Recepción — {ret.vehiclePlate ?? 'Vehículo'}
      </h1>
      <p className={styles.pageSubtitle}>35 fotos, 3 videos, FIV y FCKE del vehículo devuelto.</p>

      {!online && (
        <p className={`${styles.banner} ${styles.banner_warning}`} role="status">
          Sin conexión — la captura se pausa hasta recuperar la conexión; esta versión no guarda archivos en el dispositivo.
        </p>
      )}
      {online && uploading && (
        <p className={`${styles.banner} ${styles.banner_info}`} role="status">
          Sincronizando archivos con el servidor…
        </p>
      )}
      {online && !uploading && synced && (
        <p className={`${styles.banner} ${styles.banner_success}`} role="status">
          Confirmado por el servidor — recepción completa
        </p>
      )}
      {online && !uploading && !synced && loaded && (
        <p className={`${styles.banner} ${styles.banner_info}`} role="status">
          Faltan {Math.max(0, REQUIRED_PHOTOS - photosCount)} fotos y {Math.max(0, REQUIRED_VIDEOS - videosCount)} videos
          para completar la recepción.
        </p>
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
          Fotos ({photosCount}/{REQUIRED_PHOTOS})
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
          <button type="button" className={styles.secondaryButton} disabled={!canUpload} onClick={() => photoInputRef.current?.click()}>
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
          <button type="button" className={styles.secondaryButton} disabled={!canUpload} onClick={() => videoInputRef.current?.click()}>
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

      {error && (
        <p className={styles.evidenceError} role="alert">
          {error}
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
