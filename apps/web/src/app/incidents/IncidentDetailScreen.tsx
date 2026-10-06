import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AppHeader } from '../shared/AppHeader';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useIncidentDetail } from './useIncidentDetail';
import { useIncidentPermissions } from './incident-permissions';
import {
  INCIDENT_ACTION_LABELS,
  INCIDENT_TYPE_LABELS,
  MAX_TEXT_LENGTH,
  rentalLabel,
  shortUserId,
} from './incident-domain';
import { IncidentStatusBadge, SeverityBadge } from './IncidentBadges';
import { ReasonDialog } from './ReasonDialog';
import styles from './IncidentDetailScreen.module.css';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-PE');
}

/**
 * INC-02 - Detalle de Incidencia / RIO. Fuente: PANTALLAS-V2-B-SOPORTE.md.
 * Historial append-only: ninguna entrada tiene boton de editar ni eliminar,
 * solo "Agregar". Foco inicial en "Agregar nueva acción". "Cerrar incidencia"
 * queda deshabilitado hasta tener resumen de resolucion. Estados READY / SAVING.
 * Timeline colapsable en movil.
 */
export function IncidentDetailScreen() {
  const { state, incident, context, error, notice, addAction, close, referLegal } = useIncidentDetail();
  const navigate = useNavigate();
  const { can } = useIncidentPermissions();
  const isMobile = useMediaQuery('(max-width: 640px)');

  const [actionText, setActionText] = useState('');
  const [summary, setSummary] = useState('');
  const [legalOpen, setLegalOpen] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState<boolean | null>(null);
  const actionRef = useRef<HTMLTextAreaElement>(null);
  const focusedFor = useRef<string | null>(null);

  const saving = state === 'SAVING';
  const isOpen = incident?.status === 'ABIERTA';
  const timelineOpen = timelineExpanded ?? !isMobile;

  // Foco inicial en "Agregar nueva acción" (una vez por incidencia cargada).
  useEffect(() => {
    if (incident && isOpen && focusedFor.current !== incident.id) {
      focusedFor.current = incident.id;
      actionRef.current?.focus();
    }
  }, [incident, isOpen, state]);

  function backToList() {
    navigate('/incidencias', { state: context ?? undefined });
  }

  async function submitAction(event: FormEvent) {
    event.preventDefault();
    const text = actionText.trim();
    if (!text || saving) return;
    if (await addAction(text)) {
      setActionText('');
      actionRef.current?.focus();
    }
  }

  async function submitClose() {
    const text = summary.trim();
    if (!text || saving) return;
    if (await close(text)) setSummary('');
  }

  async function confirmLegal(reason: string) {
    if (await referLegal(reason)) setLegalOpen(false);
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Incidencia" />

      <div className={styles.content} aria-busy={saving}>
        <button type="button" className={styles.backLink} onClick={backToList}>
          ← Volver a la bandeja
        </button>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando incidencia…</p>}
        {state === 'NOT_FOUND' && (
          <p className={styles.statusText} role="alert">
            No encontramos esta incidencia en tu empresa y sede.
          </p>
        )}
        {state === 'RECOVERABLE_ERROR' && !incident && (
          <p className={styles.statusText} role="alert">
            No pudimos cargar la incidencia. Intenta de nuevo en unos segundos.
          </p>
        )}

        {incident && (
          <>
            <h1 className={styles.title}>
              Incidencia — {INCIDENT_TYPE_LABELS[incident.type]}
              <span className={styles.titleSub}> · {rentalLabel(incident)}</span>
            </h1>

            <div aria-live="polite">
              {notice && (
                <p className={styles.notice} role="status">
                  {notice}
                </p>
              )}
            </div>
            {error && (
              <p className={styles.errorBanner} role="alert">
                {error}
              </p>
            )}

            <section aria-labelledby="inc-data-title" className={styles.card}>
              <h2 id="inc-data-title" className={styles.sectionTitle}>
                Datos de la incidencia
              </h2>
              <dl className={styles.dataGrid}>
                <div>
                  <dt>Severidad</dt>
                  <dd>
                    <SeverityBadge severity={incident.severity} />
                  </dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <IncidentStatusBadge status={incident.status} />
                  </dd>
                </div>
                <div>
                  <dt>Expediente relacionado</dt>
                  <dd>{rentalLabel(incident)}</dd>
                </div>
                <div>
                  <dt>Responsable</dt>
                  <dd>{shortUserId(incident.responsibleUserId)}</dd>
                </div>
                <div>
                  <dt>Fecha de reporte</dt>
                  <dd>{formatDateTime(incident.reportedAt)}</dd>
                </div>
                <div className={styles.wide}>
                  <dt>Descripción de la observación</dt>
                  <dd>{incident.description}</dd>
                </div>
                {incident.suggestion && (
                  <div className={styles.wide}>
                    <dt>Sugerencia</dt>
                    <dd>{incident.suggestion}</dd>
                  </div>
                )}
                {incident.resolutionSummary && (
                  <div className={styles.wide}>
                    <dt>Resolución{incident.resolvedAt ? ` (${formatDateTime(incident.resolvedAt)})` : ''}</dt>
                    <dd>{incident.resolutionSummary}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section aria-labelledby="inc-timeline-title" className={styles.card}>
              <div className={styles.timelineHeader}>
                <h2 id="inc-timeline-title" className={styles.sectionTitle}>
                  Acciones tomadas
                </h2>
                {isMobile && (
                  <button
                    type="button"
                    className={styles.toggleButton}
                    aria-expanded={timelineOpen}
                    aria-controls="inc-timeline"
                    onClick={() => setTimelineExpanded(!timelineOpen)}
                  >
                    {timelineOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                    {timelineOpen ? 'Ocultar historial' : `Ver historial (${incident.actions.length})`}
                  </button>
                )}
              </div>
              <ol id="inc-timeline" className={styles.timeline} hidden={!timelineOpen} aria-label="Historial de acciones">
                {incident.actions.map((entry) => (
                  <li key={entry.id} className={styles.entry}>
                    <p className={styles.entryMeta}>
                      <strong>{INCIDENT_ACTION_LABELS[entry.kind]}</strong>
                      {' · '}
                      <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
                      {' · '}
                      <span>{shortUserId(entry.authorUserId)}</span>
                    </p>
                    <p className={styles.entryText}>{entry.description}</p>
                  </li>
                ))}
              </ol>

              {isOpen && can('ADD_ACTION') && (
                <form onSubmit={submitAction} className={styles.addForm} noValidate>
                  <label className={styles.fieldLabel} htmlFor="inc-new-action">
                    Agregar nueva acción
                  </label>
                  <textarea
                    id="inc-new-action"
                    ref={actionRef}
                    className={styles.input}
                    value={actionText}
                    maxLength={MAX_TEXT_LENGTH}
                    onChange={(e) => setActionText(e.target.value)}
                    disabled={saving}
                  />
                  <div className={styles.rowActions}>
                    <button type="submit" className={styles.secondaryButton} disabled={!actionText.trim() || saving}>
                      {saving ? 'Guardando…' : 'Agregar'}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {isOpen && (can('CLOSE') || can('REFER_LEGAL')) && (
              <section aria-labelledby="inc-close-title" className={styles.card}>
                <h2 id="inc-close-title" className={styles.sectionTitle}>
                  Resolución final
                </h2>
                {can('CLOSE') && (
                  <>
                    <label className={styles.fieldLabel} htmlFor="inc-summary">
                      Resumen de resolución
                    </label>
                    <textarea
                      id="inc-summary"
                      className={styles.input}
                      value={summary}
                      maxLength={MAX_TEXT_LENGTH}
                      onChange={(e) => setSummary(e.target.value)}
                      disabled={saving}
                    />
                  </>
                )}
                <div className={styles.rowActions}>
                  {can('REFER_LEGAL') && (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={saving}
                      onClick={() => setLegalOpen(true)}
                    >
                      Derivar a vía legal
                    </button>
                  )}
                  {can('CLOSE') && (
                    <button
                      type="button"
                      className={styles.closeButton}
                      disabled={!summary.trim() || saving}
                      onClick={() => void submitClose()}
                    >
                      Cerrar incidencia
                    </button>
                  )}
                </div>
                {can('CLOSE') && !summary.trim() && (
                  <p className={styles.hint}>Escribe el resumen de resolución para habilitar el cierre.</p>
                )}
              </section>
            )}

            {!isOpen && (
              <p className={styles.statusText}>
                Esta incidencia está {incident.status === 'CERRADA' ? 'cerrada' : 'derivada a vía legal'}: el historial es
                de solo lectura.
              </p>
            )}
          </>
        )}
      </div>

      {legalOpen && isOpen && (
        <ReasonDialog
          titleId="refer-legal-title"
          title="Derivar a vía legal"
          fieldLabel="Motivo de la derivación"
          confirmLabel="Confirmar derivación"
          busy={saving}
          error={error}
          onConfirm={(reason) => void confirmLegal(reason)}
          onCancel={() => setLegalOpen(false)}
        />
      )}
    </main>
  );
}
