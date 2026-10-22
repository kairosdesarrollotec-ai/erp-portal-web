import { useId, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { formatLimaTime } from '../shared/lima-time';
import {
  resolveSyncConflict,
  type SyncChecklistType,
  type SyncConflict,
  type SyncEvidenceVersion,
  type SyncFieldVersion,
  type SyncResolution,
} from './sync-client';
import { describeSyncError, shouldReloadSyncConflicts } from './sync-errors';
import { conflictSubject } from './sync-labels';
import styles from './SyncConflictPanel.module.css';

/**
 * TR-08 / bloque SYNC_CONFLICT de ENTREGA-04 / DEV-04: pantalla COMPARTIDA de conflictos de sincronizacion.
 *
 * Reglas documentadas (SDD-TRANS 17.3-17.4, PANTALLAS-V3-B-TRANSVERSAL):
 *  - tarjeta con dos columnas «Tu version» / «Version del servidor» (campo, quien y cuando);
 *  - botones «Conservar la mia», «Conservar del servidor» y «Combinar» (solo si `canMerge`); NINGUNO preseleccionado;
 *  - resolver exige motivo (10-500) y confirmacion explicita de la version que se conserva; siempre auditado en el
 *    servidor; nunca se resuelve solo;
 *  - solo un supervisor resuelve (permiso del back via SYNC_PERMISSION_MAP; el back sigue autorizando).
 */

const REASON_MIN = 10;
const REASON_MAX = 500;

const RESOLUTION_COPY: Record<SyncResolution, { button: string; keeps: string }> = {
  KEEP_LOCAL: { button: 'Conservar la mía', keeps: 'tu versión (la de este dispositivo)' },
  KEEP_SERVER: { button: 'Conservar del servidor', keeps: 'la versión del servidor' },
  MERGE: { button: 'Combinar', keeps: 'ambas versiones combinadas' },
};

function conflictTitle(conflict: SyncConflict): string {
  const where = conflict.checklistType === 'ENTREGA' ? 'Entrega' : 'Recepción';
  return `Conflicto en ${where}`;
}

function isEvidenceVersion(v: SyncFieldVersion | SyncEvidenceVersion): v is SyncEvidenceVersion {
  return 'contentHash' in v;
}

function displayScalar(value: SyncFieldVersion['value']): string {
  if (value === null || value === '') return '(vacío)';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
}

function VersionColumn({ title, version, conflict }: { title: string; version: SyncFieldVersion | SyncEvidenceVersion; conflict: SyncConflict }) {
  const rows: Array<[string, string]> = [['Campo', conflictSubject(conflict)]];
  if (isEvidenceVersion(version)) {
    rows.push(['Archivo', `${version.type === 'PHOTO' ? 'Foto' : 'Video'} · huella ${version.contentHash.slice(0, 8)}`]);
    rows.push(['Quién', version.capturedBy]);
    rows.push(['Cuándo', formatLimaTime(version.capturedAt)]);
  } else {
    rows.push(['Valor', displayScalar(version.value)]);
    rows.push(['Quién', version.by]);
    rows.push(['Cuándo', formatLimaTime(version.at)]);
  }
  return (
    <div className={styles.column} role="group" aria-label={title}>
      <h4 className={styles.columnTitle}>{title}</h4>
      <dl className={styles.list}>
        {rows.map(([term, def]) => (
          <div key={term}>
            <dt className={styles.term}>{term}</dt>
            <dd className={styles.def}>{def}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export interface SyncConflictPanelProps {
  checklistType: SyncChecklistType;
  companyId: string;
  branchId: string;
  getIdToken: () => Promise<string>;
  conflicts: readonly SyncConflict[];
  /** can(...) del front con la accion RESOLVE de SYNC_PERMISSION_MAP. */
  canResolve: boolean;
  /** Recargar el estado del servidor (conflictos / SYNCED) tras resolver o ante 412. */
  onChanged: () => Promise<void> | void;
}

interface Choice {
  conflict: SyncConflict;
  resolution: SyncResolution;
}

export function SyncConflictPanel({ checklistType, companyId, branchId, getIdToken, conflicts, canResolve, onChanged }: SyncConflictPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const idemKey = useRef<string>('');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reasonId = useId();
  const hintId = useId();

  const trimmed = reason.trim();
  const reasonValid = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;

  // Si el conflicto elegido desaparece de la lista (resuelto por otra persona) el modal se cierra solo.
  const activeChoice = choice && conflicts.some((c) => c.id === choice.conflict.id) ? choice : null;

  function openChoice(conflict: SyncConflict, resolution: SyncResolution) {
    setReason('');
    setConfirmed(false);
    setError(null);
    setNotice(null);
    idemKey.current = crypto.randomUUID();
    setChoice({ conflict, resolution });
  }

  async function submit() {
    if (!choice || !activeChoice || !reasonValid || !confirmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const result = await resolveSyncConflict(
        idToken,
        choice.conflict,
        { companyId, branchId, resolution: choice.resolution, reason: trimmed, confirmed: true },
        idemKey.current,
      );
      setChoice(null);
      setNotice(
        result.checklistStatus === 'SYNCED'
          ? 'Conflicto resuelto. El servidor confirmó la sincronización del checklist.'
          : `Conflicto resuelto. Quedan ${result.openConflicts} por resolver.`,
      );
      await onChanged();
      headingRef.current?.focus();
    } catch (err) {
      setError(describeSyncError(err, 'No pudimos resolver el conflicto. Intenta de nuevo.'));
      if (shouldReloadSyncConflicts(err)) {
        // 412 / ya resuelto: la tarjeta que veias esta desactualizada. Se recarga y se vuelve a elegir.
        setChoice(null);
        await onChanged();
        headingRef.current?.focus();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (conflicts.length === 0 && !notice) return null;

  return (
    <section className={styles.panel} aria-labelledby={`${reasonId}-h`} data-checklist-type={checklistType}>
      <h2 id={`${reasonId}-h`} ref={headingRef} tabIndex={-1} className={styles.heading}>
        {conflicts.length > 0
          ? `Conflictos de sincronización (${conflicts.length})`
          : 'Sincronización'}
      </h2>
      {conflicts.length > 0 && (
        <p className={styles.intro}>
          El servidor no pudo combinar tus cambios con los de otra persona. Elige qué versión se conserva; nada se resuelve solo y la
          decisión queda registrada.
        </p>
      )}
      <div aria-live="polite">{notice && <p className={styles.notice}>{notice}</p>}</div>
      {error && !activeChoice && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {conflicts.map((conflict) => {
        const titleId = `conflict-${conflict.id}-title`;
        const mergeHintId = `conflict-${conflict.id}-merge`;
        const roleHintId = `conflict-${conflict.id}-role`;
        const disabled = !canResolve;
        return (
          <article key={conflict.id} className={styles.card} tabIndex={0} aria-labelledby={titleId} data-testid="sync-conflict-card">
            <div>
              <h3 id={titleId} className={styles.cardTitle}>
                {conflictTitle(conflict)}: {conflictSubject(conflict)}
              </h3>
              <p className={styles.cardRef}>Referencia {conflict.auditRef}</p>
            </div>
            <div className={styles.columns}>
              <VersionColumn title="Tu versión (este dispositivo)" version={conflict.localVersion} conflict={conflict} />
              <VersionColumn title="Versión del servidor" version={conflict.serverVersion} conflict={conflict} />
            </div>
            <div role="group" aria-label="Elige qué versión conservar" className={styles.actions}>
              <button type="button" className={styles.button} disabled={disabled} aria-describedby={disabled ? roleHintId : undefined} onClick={() => openChoice(conflict, 'KEEP_LOCAL')}>
                Conservar la mía
              </button>
              <button type="button" className={styles.button} disabled={disabled} aria-describedby={disabled ? roleHintId : undefined} onClick={() => openChoice(conflict, 'KEEP_SERVER')}>
                Conservar del servidor
              </button>
              <button
                type="button"
                className={styles.button}
                disabled={disabled || !conflict.canMerge}
                aria-describedby={!conflict.canMerge ? mergeHintId : disabled ? roleHintId : undefined}
                onClick={() => openChoice(conflict, 'MERGE')}
              >
                Combinar
              </button>
            </div>
            {!conflict.canMerge && (
              <p id={mergeHintId} className={styles.hint}>
                «Combinar» no está disponible: los datos chocan entre sí.
              </p>
            )}
            {disabled && (
              <p id={roleHintId} className={styles.hint}>
                Solo un supervisor puede resolver este conflicto. Avísale para que lo revise.
              </p>
            )}
          </article>
        );
      })}

      <Dialog.Root open={activeChoice !== null} onOpenChange={(open) => { if (!open && !submitting) setChoice(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={styles.dialog} aria-describedby={hintId}>
            {activeChoice && (
              <>
                <Dialog.Title className={styles.dialogTitle}>{RESOLUTION_COPY[activeChoice.resolution].button}</Dialog.Title>
                <Dialog.Description id={hintId} className={styles.dialogText}>
                  Vas a conservar {RESOLUTION_COPY[activeChoice.resolution].keeps} para «{conflictSubject(activeChoice.conflict)}». Esta decisión queda
                  registrada con tu nombre y el motivo.
                </Dialog.Description>
                <div className={styles.field}>
                  <label htmlFor={reasonId}>Motivo de la decisión</label>
                  <textarea
                    id={reasonId}
                    className={styles.textarea}
                    value={reason}
                    maxLength={REASON_MAX}
                    aria-invalid={reason.length > 0 && !reasonValid}
                    aria-describedby={`${reasonId}-c`}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <span id={`${reasonId}-c`} className={styles.counter}>
                    {trimmed.length} / {REASON_MAX} caracteres (mínimo {REASON_MIN})
                  </span>
                </div>
                <label className={styles.checkRow}>
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                  <span>Confirmo que quiero conservar {RESOLUTION_COPY[activeChoice.resolution].keeps}.</span>
                </label>
                {error && (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                )}
                <div className={styles.dialogActions}>
                  <button type="button" className={styles.button} disabled={submitting} onClick={() => setChoice(null)}>
                    Cancelar
                  </button>
                  <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!reasonValid || !confirmed || submitting} onClick={() => void submit()}>
                    {submitting ? 'Guardando…' : 'Confirmar y resolver'}
                  </button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
