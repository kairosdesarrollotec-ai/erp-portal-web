import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { getFirebaseAuth } from '../providers/firebase';
import { useIncidentsList } from './useIncidentsList';
import { useIncidentPermissions } from './incident-permissions';
import {
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUSES,
  INCIDENT_STATUS_LABELS,
  INCIDENT_TYPES,
  INCIDENT_TYPE_LABELS,
  canResolveDirect,
  rentalLabel,
  shortUserId,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentType,
} from './incident-domain';
import { resolveIncident, type IncidentResponse } from './incidents-client';
import { describeIncidentError, isStaleIncidentError } from './incident-errors';
import { IncidentStatusBadge, SeverityBadge } from './IncidentBadges';
import { ReasonDialog } from './ReasonDialog';
import { RegisterIncidentDialog } from './RegisterIncidentDialog';
import styles from './IncidentsListScreen.module.css';

/**
 * INC-01 - Bandeja de Incidencias. Fuente: PANTALLAS-V2-B-SOPORTE.md.
 * Tabla (desktop) / tarjetas (movil, via CSS) con Tipo, Severidad (badge),
 * Expediente, Estado y Responsable; filtros por tipo, severidad y estado.
 * Accion primaria "Registrar incidencia"; por fila "Abrir" y, SOLO en
 * severidad LEVE + estado ABIERTA, "Resolver" directo (pide resumen y llama a
 * resolve con If-Match). Estados READY / LOADING / EMPTY.
 */
export function IncidentsListScreen() {
  const {
    state,
    incidents,
    context,
    reload,
    filters,
    setFilter,
    rentalId,
    returnId,
    clearScope,
    hasMore,
    loadingMore,
    loadMore,
    replaceIncident,
  } = useIncidentsList();
  const navigate = useNavigate();
  const { can } = useIncidentPermissions();

  const [searchParams] = useSearchParams();
  // `?registrar=1` (desde Devolucion) abre el formulario ya preseleccionado.
  const [registering, setRegistering] = useState(() => searchParams.get('registrar') === '1');
  const [resolving, setResolving] = useState<IncidentResponse | null>(null);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hasFilters = Boolean(filters.type || filters.severity || filters.status || rentalId || returnId);

  function openIncident(item: IncidentResponse) {
    navigate(`/incidencias/${item.id}`, { state: context ?? undefined });
  }

  function closeResolveDialog() {
    setResolving(null);
    setResolveError(null);
  }

  async function confirmResolve(summary: string) {
    if (!resolving || !context) return;
    setResolveBusy(true);
    setResolveError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const updated = await resolveIncident(
        idToken,
        resolving.id,
        resolving.version,
        context.companyId,
        context.branchId,
        summary,
      );
      replaceIncident(updated);
      setNotice(`Incidencia de ${rentalLabel(updated)} resuelta.`);
      setResolving(null);
    } catch (err) {
      setResolveError(describeIncidentError(err, 'No pudimos resolver la incidencia. Intenta de nuevo.'));
      // 409/428: version desactualizada o ya no abierta -> recarga la bandeja.
      if (isStaleIncidentError(err)) void reload();
    } finally {
      setResolveBusy(false);
    }
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Incidencias" />

      <div className={styles.content}>
        <div className={styles.toolbar}>
          <div className={styles.filters} role="group" aria-label="Filtros de incidencias">
            <label className={styles.filter}>
              Tipo
              <select
                className={styles.select}
                value={filters.type}
                onChange={(e) => setFilter('type', e.target.value as IncidentType | '')}
              >
                <option value="">Todos los tipos</option>
                {INCIDENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {INCIDENT_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filter}>
              Severidad
              <select
                className={styles.select}
                value={filters.severity}
                onChange={(e) => setFilter('severity', e.target.value as IncidentSeverity | '')}
              >
                <option value="">Todas las severidades</option>
                {INCIDENT_SEVERITIES.map((value) => (
                  <option key={value} value={value}>
                    {INCIDENT_SEVERITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filter}>
              Estado
              <select
                className={styles.select}
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value as IncidentStatus | '')}
              >
                <option value="">Todos los estados</option>
                {INCIDENT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {INCIDENT_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {can('CREATE') && (
            <button type="button" className={styles.primaryButton} onClick={() => setRegistering(true)}>
              Registrar incidencia
            </button>
          )}
        </div>

        {(rentalId || returnId) && (
          <p className={styles.scopeBanner}>
            {returnId ? 'Mostrando las incidencias de una devolución.' : 'Mostrando las incidencias de un alquiler.'}{' '}
            <button type="button" className={styles.textLink} onClick={clearScope}>
              Ver todas
            </button>
          </p>
        )}

        <div aria-live="polite">
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}
        </div>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando incidencias…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText} role="alert">
            No pudimos cargar la bandeja de incidencias. Intenta de nuevo en unos segundos.
          </p>
        )}

        {state === 'EMPTY' && (
          <p className={styles.statusText}>
            {hasFilters ? 'Ninguna incidencia coincide con los filtros.' : 'Todavía no hay incidencias registradas.'}
          </p>
        )}

        {state === 'READY' && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Tipo</th>
                    <th scope="col">Severidad</th>
                    <th scope="col">Expediente relacionado</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Responsable</th>
                    <th scope="col">
                      <span className={styles.srOnly}>Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((item) => {
                    const label = rentalLabel(item);
                    return (
                      <tr
                        key={item.id}
                        className={`${styles.row} ${item.status === 'ABIERTA' ? styles.rowOpen : styles.rowMuted}`}
                        onClick={() => openIncident(item)}
                      >
                        <td data-label="Tipo">{INCIDENT_TYPE_LABELS[item.type]}</td>
                        <td data-label="Severidad">
                          <SeverityBadge severity={item.severity} />
                        </td>
                        <td data-label="Expediente relacionado">{label}</td>
                        <td data-label="Estado">
                          <IncidentStatusBadge status={item.status} />
                        </td>
                        <td data-label="Responsable">{shortUserId(item.responsibleUserId)}</td>
                        <td className={styles.actions}>
                          <button
                            type="button"
                            className={styles.openButton}
                            aria-label={`Abrir incidencia de ${label}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openIncident(item);
                            }}
                          >
                            Abrir
                          </button>
                          {canResolveDirect(item) && can('RESOLVE') && (
                            <button
                              type="button"
                              className={styles.resolveButton}
                              aria-label={`Resolver incidencia de ${label}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setNotice(null);
                                setResolving(item);
                              }}
                            >
                              Resolver
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <button type="button" className={styles.loadMore} onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? 'Cargando…' : 'Cargar más'}
              </button>
            )}
          </>
        )}
      </div>

      {registering && context && (
        <RegisterIncidentDialog
          context={context}
          initialRentalId={rentalId}
          initialReturnId={returnId}
          onCancel={() => setRegistering(false)}
          onCreated={(created) => {
            setRegistering(false);
            setNotice(`Incidencia registrada para ${rentalLabel(created)}.`);
            void reload();
          }}
        />
      )}

      {resolving && (
        <ReasonDialog
          titleId="resolve-incident-title"
          title={`Resolver incidencia — ${rentalLabel(resolving)}`}
          fieldLabel="Resumen de la resolución"
          confirmLabel="Confirmar resolución"
          busy={resolveBusy}
          error={resolveError}
          onConfirm={(summary) => void confirmResolve(summary)}
          onCancel={closeResolveDialog}
        />
      )}
    </main>
  );
}
