import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { formatLimaDateTime } from '../shared/lima-time';
import { conflictSubject } from './sync-labels';
import { useSyncCenter, type SyncCenterStatusFilter } from './useSyncCenter';
import type { SyncConflict } from './sync-client';
import styles from './SyncCenterScreen.module.css';

/**
 * TR-08 — Centro de sincronización (vista de supervisor: Administración y Gerencia).
 * Fuente: PANTALLAS-V2-B-TRANSVERSAL.md TR-08, SDD-TRANS 17; Respuestas de negocio 2026-10-20 #21-#29.
 * Lista los conflictos de sincronización (datos y evidencias) con etiquetas de negocio. Nunca resuelve nada aquí: la
 * resolución explícita (versión que se conserva + motivo) ocurre en el expediente (ENTREGA-04 / DEV-04), al que lleva
 * «Abrir expediente».
 */

const FILTER_LABELS: Record<SyncCenterStatusFilter, string> = {
  OPEN: 'Pendientes',
  RESOLVED: 'Resueltos',
  ALL: 'Todos',
};

const SHORT_ID_LENGTH = 8;

function checklistLabel(conflict: SyncConflict): string {
  return conflict.checklistType === 'ENTREGA' ? 'Entrega' : 'Recepción';
}

function conflictKindLabel(conflict: SyncConflict): string {
  return conflict.kind === 'EVIDENCE' ? 'Evidencia (foto o video)' : 'Dato del checklist';
}

function fileHref(conflict: SyncConflict): string {
  return conflict.checklistType === 'ENTREGA'
    ? `/alquileres/${conflict.rentalId}/entrega-04`
    : `/devoluciones/${conflict.sourceId}/checklist`;
}

export function SyncCenterScreen() {
  const [filter, setFilter] = useState<SyncCenterStatusFilter>('OPEN');
  const { state, context, conflicts, reload } = useSyncCenter(filter);

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Centro de sincronización" />

      <div className={styles.content}>
        <p className={styles.statusText}>
          Conflictos que aparecen cuando dos personas editan lo mismo sin conexión. Ábrelos para decidir qué versión se
          conserva; nada se resuelve solo.
        </p>

        <section className={styles.filters}>
          <label className={styles.field}>
            <span>Estado</span>
            <select
              className={styles.input}
              value={filter}
              onChange={(event) => setFilter(event.target.value as SyncCenterStatusFilter)}
            >
              {(Object.keys(FILTER_LABELS) as SyncCenterStatusFilter[]).map((value) => (
                <option key={value} value={value}>
                  {FILTER_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </section>

        {state === 'LOADING' && <p className={styles.statusText} role="status">Cargando conflictos de sincronización…</p>}

        {state === 'FORBIDDEN' && (
          <p className={styles.statusText} role="alert">
            Solo Administración y Gerencia pueden ver el centro de sincronización.
          </p>
        )}

        {state === 'NO_CONTEXT' && (
          <p className={styles.statusText} role="alert">
            Elige una empresa y sede de trabajo para ver los conflictos.
          </p>
        )}

        {state === 'RECOVERABLE_ERROR' && (
          <div role="alert">
            <p className={styles.errorText}>No pudimos cargar los conflictos de sincronización.</p>
            <button type="button" className={styles.primaryButton} onClick={reload}>
              Reintentar
            </button>
          </div>
        )}

        {state === 'EMPTY' && (
          <p className={styles.statusText} role="status">
            {filter === 'RESOLVED'
              ? 'Todavía no hay conflictos resueltos.'
              : filter === 'ALL'
                ? 'No hay conflictos de sincronización.'
                : 'Estás al día: no hay conflictos pendientes de sincronización.'}
          </p>
        )}

        {state === 'READY' && (
          <div className={styles.tableWrapper}>
            <table className={styles.table} aria-label="Conflictos de sincronización">
              <thead>
                <tr>
                  <th scope="col">Referencia</th>
                  <th scope="col">Tipo de conflicto</th>
                  <th scope="col">Dato</th>
                  <th scope="col">Expediente</th>
                  <th scope="col">Detectado por</th>
                  <th scope="col">Cuándo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((conflict) => (
                  <tr key={conflict.id} className={styles.row} data-testid="sync-center-row">
                    <td>{conflict.auditRef}</td>
                    <td>{conflictKindLabel(conflict)}</td>
                    <td>{conflictSubject(conflict)}</td>
                    <td>
                      {checklistLabel(conflict)}
                      <span className={styles.subtle}>N.º {conflict.sourceId.slice(0, SHORT_ID_LENGTH)}</span>
                    </td>
                    <td>{conflict.detectedBy}</td>
                    <td>{formatLimaDateTime(conflict.createdAt)}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${conflict.status === 'OPEN' ? styles.statusOpen : styles.statusResolved}`}
                      >
                        {conflict.status === 'OPEN' ? 'Pendiente' : 'Resuelto'}
                      </span>
                    </td>
                    <td>
                      <Link
                        className={styles.openLink}
                        to={fileHref(conflict)}
                        state={context ?? undefined}
                        aria-label={`Abrir expediente de ${checklistLabel(conflict)} ${conflict.auditRef}`}
                      >
                        Abrir expediente
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
