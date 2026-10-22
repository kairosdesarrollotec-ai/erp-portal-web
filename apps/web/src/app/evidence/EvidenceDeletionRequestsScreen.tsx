import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { getFirebaseAuth } from '../providers/firebase';
import { formatLimaDateTime } from '../shared/lima-time';
import { EvidenceDialog } from './EvidenceDialog';
import dialogStyles from './EvidenceDialog.module.css';
import {
  approveEvidenceDeletion,
  rejectEvidenceDeletion,
  type EvidenceDeletionRequest,
} from './evidence-client';
import {
  MAX_REASON_LENGTH,
  MIN_REASON_LENGTH,
  STATUS_LABELS,
  TARGET_LABELS,
  describeEvidenceError,
  isStaleEvidenceError,
  targetHref,
} from './evidence-domain';
import { useEvidenceDeletionRequests, type RequestsTab } from './useEvidenceDeletionRequests';
import styles from './EvidenceDeletionRequestsScreen.module.css';

/**
 * Bandeja de solicitudes de eliminación de evidencia (DEC-EVID-DELETE-002, doble aprobación; Respuestas #35).
 * Pestañas: pendientes de mi decisión, mis solicitudes y todas. Aprobar/rechazar piden confirmación reforzada; la
 * autoridad (solicitante ≠ 1.er aprobador ≠ 2.º aprobador) es del back, la UI solo refleja `viewer`.
 * Estados: LOADING / EMPTY / ERROR / FORBIDDEN / READY.
 */

const TAB_LABELS: Record<RequestsTab, string> = {
  PENDING_MINE: 'Pendientes de mi decisión',
  MINE: 'Mis solicitudes',
  ALL: 'Todas',
};

const SHORT_ID = 8;

function statusClass(status: EvidenceDeletionRequest['status']): string {
  if (status === 'EXECUTED') return styles.statusExecuted;
  if (status === 'REJECTED' || status === 'EXPIRED') return styles.statusClosed;
  return styles.statusOpen;
}

function approvalProgress(request: EvidenceDeletionRequest): string {
  if (request.status === 'PENDING') return '0 de 2 aprobaciones';
  if (request.status === 'APPROVED_1') return '1 de 2 aprobaciones';
  if (request.status === 'EXECUTED') return '2 de 2 aprobaciones';
  return request.firstApprovedBy ? '1 de 2 aprobaciones' : '0 de 2 aprobaciones';
}

type Pending = { kind: 'approve' | 'reject'; request: EvidenceDeletionRequest } | null;

export function EvidenceDeletionRequestsScreen() {
  const [tab, setTab] = useState<RequestsTab>('PENDING_MINE');
  const { state, context, requests, myUid, reload } = useEvidenceDeletionRequests(tab);
  const [pending, setPending] = useState<Pending>(null);
  const [text, setText] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function openDialog(kind: 'approve' | 'reject', request: EvidenceDeletionRequest) {
    setPending({ kind, request });
    setText('');
    setUnderstood(false);
    setError(null);
  }

  function closeDialog() {
    if (busy) return;
    setPending(null);
    setError(null);
  }

  const trimmed = text.trim();
  const isSecondApproval = pending?.kind === 'approve' && pending.request.status === 'APPROVED_1';
  const canSubmit =
    !busy &&
    pending !== null &&
    (pending.kind === 'approve'
      ? understood
      : trimmed.length >= MIN_REASON_LENGTH && trimmed.length <= MAX_REASON_LENGTH);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!pending || !context || !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const scope = { companyId: context.companyId, branchId: context.branchId };
      if (pending.kind === 'approve') {
        const result = await approveEvidenceDeletion(idToken, pending.request.id, {
          ...scope,
          ...(trimmed ? { note: trimmed } : {}),
        });
        setNotice(
          result.status === 'EXECUTED'
            ? 'Segunda aprobación registrada: la evidencia fue eliminada.'
            : 'Primera aprobación registrada. Falta la aprobación de una segunda persona distinta.',
        );
      } else {
        await rejectEvidenceDeletion(idToken, pending.request.id, { ...scope, reason: trimmed });
        setNotice('Solicitud rechazada: la evidencia se conserva.');
      }
      setPending(null);
      reload();
    } catch (err) {
      setError(describeEvidenceError(err, 'No pudimos completar la operación. Intenta de nuevo.'));
      if (isStaleEvidenceError(err)) reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Solicitudes de eliminación de evidencia" />

      <div className={styles.content}>
        <p className={styles.statusText}>
          Eliminar una foto o video del checklist necesita la aprobación de dos personas distintas, ninguna de ellas quien
          lo solicitó. Mientras tanto, la evidencia se conserva.
        </p>

        <div className={styles.tabs} role="tablist" aria-label="Filtro de solicitudes">
          {(Object.keys(TAB_LABELS) as RequestsTab[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={`${styles.tab} ${tab === value ? styles.tabActive : ''}`}
              onClick={() => setTab(value)}
            >
              {TAB_LABELS[value]}
            </button>
          ))}
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {state === 'LOADING' && <p className={styles.statusText} role="status">Cargando solicitudes…</p>}

        {state === 'FORBIDDEN' && (
          <p className={styles.statusText} role="alert">
            No tienes permiso para ver las solicitudes de eliminación de evidencia. Pide a Administración que revise tu
            acceso.
          </p>
        )}

        {state === 'NO_CONTEXT' && (
          <p className={styles.statusText} role="alert">
            Elige una empresa y sede de trabajo para ver las solicitudes.
          </p>
        )}

        {state === 'RECOVERABLE_ERROR' && (
          <div role="alert">
            <p className={styles.errorText}>No pudimos cargar las solicitudes.</p>
            <button type="button" className={styles.primaryButton} onClick={reload}>
              Reintentar
            </button>
          </div>
        )}

        {state === 'EMPTY' && (
          <p className={styles.statusText} role="status">
            {tab === 'PENDING_MINE'
              ? 'Estás al día: no hay solicitudes esperando tu decisión.'
              : tab === 'MINE'
                ? 'Todavía no has solicitado eliminar ninguna evidencia.'
                : 'No hay solicitudes de eliminación de evidencia.'}
          </p>
        )}

        {state === 'READY' && (
          <div className={styles.tableWrapper}>
            <table className={styles.table} aria-label="Solicitudes de eliminación de evidencia">
              <thead>
                <tr>
                  <th scope="col">Evidencia</th>
                  <th scope="col">Expediente</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Solicitada</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className={styles.row} data-testid="evidence-request-row">
                    <td>
                      {request.evidence.type === 'PHOTO' ? 'Foto' : 'Video'} · {request.evidence.zone}
                      <span className={styles.subtle}>Subida {formatLimaDateTime(request.evidence.uploadedAt)}</span>
                    </td>
                    <td>
                      {TARGET_LABELS[request.targetKind]}
                      <span className={styles.subtle}>N.º {request.targetId.slice(0, SHORT_ID)}</span>
                      <Link className={styles.openLink} to={targetHref(request)} state={context ?? undefined}>
                        Abrir expediente
                      </Link>
                    </td>
                    <td className={styles.reasonCell}>
                      {request.reason}
                      {request.status === 'REJECTED' && request.rejectionReason && (
                        <span className={styles.subtle}>Rechazo: {request.rejectionReason}</span>
                      )}
                    </td>
                    <td>
                      {formatLimaDateTime(request.requestedAt)}
                      <span className={styles.subtle}>
                        {myUid !== null && request.requestedBy === myUid ? 'Por ti' : `Por ${request.requestedBy.slice(0, SHORT_ID)}`}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusClass(request.status)}`}>
                        {STATUS_LABELS[request.status]}
                      </span>
                      <span className={styles.subtle}>{approvalProgress(request)}</span>
                      {(request.status === 'PENDING' || request.status === 'APPROVED_1') && (
                        <span className={styles.subtle}>Vence {formatLimaDateTime(request.expiresAt)}</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {request.viewer.canApprove && (
                          <button
                            type="button"
                            className={styles.primaryButton}
                            aria-label={`Aprobar eliminación de ${request.evidence.zone}`}
                            onClick={() => openDialog('approve', request)}
                          >
                            Aprobar
                          </button>
                        )}
                        {request.viewer.canReject && (
                          <button
                            type="button"
                            className={styles.dangerButton}
                            aria-label={`Rechazar eliminación de ${request.evidence.zone}`}
                            onClick={() => openDialog('reject', request)}
                          >
                            Rechazar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pending && (
        <EvidenceDialog
          titleId="evidence-decision"
          title={pending.kind === 'approve' ? (isSecondApproval ? 'Segunda aprobación: eliminar evidencia' : 'Primera aprobación') : 'Rechazar solicitud'}
          onClose={closeDialog}
        >
          <form onSubmit={(e) => void submit(e)} noValidate>
            <p className={dialogStyles.warning}>
              {pending.request.evidence.type === 'PHOTO' ? 'Foto' : 'Video'} · {pending.request.evidence.zone}. Motivo del
              solicitante: «{pending.request.reason}»
            </p>
            {pending.kind === 'approve' ? (
              <>
                <p className={dialogStyles.warning}>
                  {isSecondApproval
                    ? 'Esta es la SEGUNDA aprobación: al confirmar, la evidencia se elimina de forma definitiva y no se puede recuperar.'
                    : 'Esta es la PRIMERA aprobación. La evidencia solo se elimina cuando una persona distinta a ti y al solicitante dé la segunda.'}
                </p>
                <div className={dialogStyles.field}>
                  <label htmlFor="evidence-decision-note">
                    Nota <span className={dialogStyles.hint}>(opcional)</span>
                  </label>
                  <textarea
                    id="evidence-decision-note"
                    className={dialogStyles.input}
                    value={text}
                    maxLength={MAX_REASON_LENGTH}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
                <label>
                  <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} /> Entiendo
                  que estoy autorizando la eliminación de esta evidencia
                </label>
              </>
            ) : (
              <div className={dialogStyles.field}>
                <label htmlFor="evidence-decision-reason">
                  Motivo del rechazo <span className={dialogStyles.hint}>(obligatorio)</span>
                </label>
                <textarea
                  id="evidence-decision-reason"
                  className={dialogStyles.input}
                  value={text}
                  maxLength={MAX_REASON_LENGTH}
                  aria-required="true"
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            )}
            {error && (
              <p className={dialogStyles.error} role="alert">
                {error}
              </p>
            )}
            <div className={dialogStyles.actions}>
              <button type="button" className={dialogStyles.secondaryButton} onClick={closeDialog} disabled={busy}>
                Cancelar
              </button>
              <button type="submit" className={dialogStyles.primaryButton} disabled={!canSubmit}>
                {busy ? 'Guardando…' : pending.kind === 'approve' ? (isSecondApproval ? 'Aprobar y eliminar' : 'Aprobar') : 'Rechazar solicitud'}
              </button>
            </div>
          </form>
        </EvidenceDialog>
      )}
    </main>
  );
}
