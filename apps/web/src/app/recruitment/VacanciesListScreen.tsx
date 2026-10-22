import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { useRecruitmentPermissions } from './recruitment-permissions';
import { useVacanciesList } from './useVacanciesList';
import { PauseVacancyControl } from './PauseVacancyControl';
import { CancelVacancyControl } from './CancelVacancyControl';
import { NewVacancyDialog } from './NewVacancyDialog';
import {
  VACANCY_SOURCE_LABEL,
  VACANCY_STATUS_LABEL,
  type VacancySource,
  type VacancyStatus,
} from './recruitment-domain';
import type { VacancyResponse } from './recruitment-client';
import styles from './VacanciesListScreen.module.css';

const STATUSES = Object.keys(VACANCY_STATUS_LABEL) as VacancyStatus[];
const SOURCE_CLASS: Record<VacancySource, string> = {
  RENUNCIA: styles.renuncia,
  CRECIMIENTO: styles.crecimiento,
  NUEVA_AREA: styles.nuevaArea,
};

/** La fuente se comunica con texto ademas del color. */
function SourceBadge({ source }: { source: VacancySource }) {
  return <span className={`${styles.badge} ${SOURCE_CLASS[source]}`}>{VACANCY_SOURCE_LABEL[source]}</span>;
}

/**
 * REC-01 - Vacantes / Necesidades de personal. Tabla (desktop) / tarjetas (movil, via CSS)
 * con Puesto, Area, Fuente (badge con texto) y Estado; filtro por estado; "Crear necesidad"
 * solo con CREATE_VACANCY; por fila "Abrir" al perfil.
 */
function VacanciesList() {
  const { state, vacancies, replaceVacancy, context, reload, status, setStatus, hasMore, loadingMore, loadMore } = useVacanciesList();
  const { can } = useRecruitmentPermissions();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  function open(id: string) {
    navigate(`/reclutamiento/vacantes/${id}`, { state: context ?? undefined });
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Reclutamiento" />
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <label className={styles.filter}>
            Estado
            <select
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as VacancyStatus | '')}
            >
              <option value="">Todos los estados</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {VACANCY_STATUS_LABEL[value]}
                </option>
              ))}
            </select>
          </label>
          {can('CREATE_VACANCY') && (
            <button type="button" className={styles.primaryButton} onClick={() => setCreating(true)}>
              Crear necesidad
            </button>
          )}
        </div>

        <div aria-live="polite">
          {state === 'LOADING' && <p className={styles.statusText}>Cargando necesidades de personal…</p>}
        </div>

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText} role="alert">
            No pudimos cargar las necesidades de personal. Intenta de nuevo en unos segundos.{' '}
            <button type="button" className={styles.openButton} onClick={() => void reload()}>
              Reintentar
            </button>
          </p>
        )}

        {state === 'EMPTY' && (
          <p className={styles.statusText}>
            {status ? 'Ninguna necesidad coincide con el filtro.' : 'Todavía no hay necesidades de personal registradas.'}
          </p>
        )}

        {state === 'READY' && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table} aria-label="Necesidades de personal">
                <thead>
                  <tr>
                    <th scope="col">Puesto</th>
                    <th scope="col">Área</th>
                    <th scope="col">Fuente</th>
                    <th scope="col">Estado</th>
                    <th scope="col">
                      <span className={styles.srOnly}>Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vacancies.map((item: VacancyResponse) => (
                    <tr key={item.id} className={styles.row}>
                      <td data-label="Puesto">{item.title}</td>
                      <td data-label="Área">{item.department}</td>
                      <td data-label="Fuente">
                        <SourceBadge source={item.source} />
                      </td>
                      <td data-label="Estado">{VACANCY_STATUS_LABEL[item.status]}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.openButton}
                          aria-label={`Abrir ${item.title}`}
                          onClick={() => open(item.id)}
                        >
                          Abrir
                        </button>
                        {context && (
                          <PauseVacancyControl
                            vacancy={item}
                            context={context}
                            buttonClassName={styles.openButton}
                            onChanged={(detail) => replaceVacancy(detail)}
                            onStale={reload}
                          />
                        )}
                        {context && (
                          <CancelVacancyControl
                            vacancy={item}
                            context={context}
                            buttonClassName={styles.openButton}
                            onChanged={(detail) => replaceVacancy(detail)}
                            onStale={reload}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
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

      {creating && context && (
        <NewVacancyDialog
          context={context}
          onCancel={() => setCreating(false)}
          onCreated={(created) => {
            setCreating(false);
            navigate(`/reclutamiento/vacantes/${created.id}`, { state: context });
          }}
        />
      )}
    </main>
  );
}

export function VacanciesListScreen() {
  const { can } = useRecruitmentPermissions();
  if (!can('VIEW_VACANCY')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Reclutamiento" />
        <div className={styles.content}>
          <p className={styles.statusText} role="alert">
            No tienes acceso a las necesidades de personal.
          </p>
        </div>
      </main>
    );
  }
  return <VacanciesList />;
}
