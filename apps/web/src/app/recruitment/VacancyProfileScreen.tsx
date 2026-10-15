import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { getFirebaseAuth } from '../providers/firebase';
import { useRecruitmentPermissions } from './recruitment-permissions';
import { publishVacancy, type VacancyDetail } from './recruitment-client';
import { describeRecruitmentError, isStaleRecruitmentError } from './recruitment-errors';
import {
  PUBLICATION_CHANNELS,
  TECHNICAL_CHANNEL,
  VACANCY_SOURCE_LABEL,
  VACANCY_STATUS_LABEL,
} from './recruitment-domain';
import { PauseVacancyControl } from './PauseVacancyControl';
import { useVacancyDetail } from './useVacancyDetail';
import type { RecruitmentWorkContext } from './useWorkContextForRecruitment';
import styles from './VacancyProfileScreen.module.css';

interface FormProps {
  vacancy: VacancyDetail;
  context: RecruitmentWorkContext;
  onPublished: (detail: VacancyDetail) => void;
  onStale: () => Promise<void>;
}

function ProfileForm({ vacancy, context, onPublished, onStale }: FormProps) {
  const { can } = useRecruitmentPermissions();
  const readOnly = vacancy.status !== 'NECESIDAD_REGISTRADA' || !can('PUBLISH_VACANCY');
  const [functions, setFunctions] = useState(vacancy.profileDescription ?? '');
  const [salary, setSalary] = useState(vacancy.baseSalary != null ? String(vacancy.baseSalary) : '');
  const [schedule, setSchedule] = useState(vacancy.scheduleDetails ?? '');
  const [channels, setChannels] = useState<string[]>(vacancy.publishedChannels ?? []);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleChannels = PUBLICATION_CHANNELS.filter((c) => c !== TECHNICAL_CHANNEL || vacancy.isMechanic);
  const salaryNumber = Number(salary);
  const salaryValid = salary.trim() !== '' && Number.isFinite(salaryNumber) && salaryNumber > 0;
  const missingTechnical = vacancy.isMechanic && !channels.includes(TECHNICAL_CHANNEL);
  const problems = {
    functions: !functions.trim(),
    salary: !salaryValid,
    schedule: !schedule.trim(),
    channels: channels.length === 0 || missingTechnical,
  };

  function toggle(channel: string) {
    setChannels((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    if (problems.functions || problems.salary || problems.schedule || problems.channels) return;
    setSaving(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const updated = await publishVacancy(
        idToken,
        vacancy.id,
        vacancy.version,
        { companyId: context.companyId, branchId: context.branchId },
        {
          profileDescription: functions.trim(),
          baseSalary: salaryNumber,
          scheduleDetails: schedule.trim(),
          channels,
        },
      );
      onPublished(updated);
    } catch (err) {
      setError(describeRecruitmentError(err, 'No pudimos publicar la vacante. Intenta de nuevo.'));
      if (isStaleRecruitmentError(err)) await onStale();
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    functions !== (vacancy.profileDescription ?? '') ||
    salary !== (vacancy.baseSalary != null ? String(vacancy.baseSalary) : '') ||
    schedule !== (vacancy.scheduleDetails ?? '') ||
    channels.join('|') !== (vacancy.publishedChannels ?? []).join('|');

  if (readOnly) {
    return (
      <section aria-label="Perfil de la vacante">
        <h2 className={styles.sectionTitle}>Funciones principales</h2>
        <p className={styles.readonly}>{vacancy.profileDescription || 'Sin descripción.'}</p>
        <h2 className={styles.sectionTitle}>Condiciones</h2>
        <p className={styles.readonly}>
          Sueldo base: {vacancy.baseSalary != null ? `S/ ${vacancy.baseSalary}` : 'No indicado'}
          {'\n'}Horario: {vacancy.scheduleDetails || 'No indicado'}
        </p>
        <h2 className={styles.sectionTitle}>Canales de publicación</h2>
        <p className={styles.readonly}>
          {vacancy.publishedChannels && vacancy.publishedChannels.length > 0
            ? vacancy.publishedChannels.join(', ')
            : 'Sin canales.'}
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate aria-label="Perfil y publicación">
      <label className={styles.field}>
        Funciones principales
        <textarea
          className={`${styles.input}`}
          value={functions}
          onChange={(e) => setFunctions(e.target.value)}
          aria-invalid={submitted && problems.functions}
          required
        />
        {submitted && problems.functions && <span className={styles.error} role="alert">Describe las funciones del puesto.</span>}
      </label>
      <label className={styles.field}>
        Sueldo base (S/)
        <input
          className={styles.input}
          type="number"
          min="0"
          step="any"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          aria-invalid={submitted && problems.salary}
          required
        />
        {submitted && problems.salary && <span className={styles.error} role="alert">Indica un sueldo base mayor que cero.</span>}
      </label>
      <label className={styles.field}>
        Horario
        <input
          className={styles.input}
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          aria-invalid={submitted && problems.schedule}
          required
        />
        {submitted && problems.schedule && <span className={styles.error} role="alert">Indica el horario.</span>}
      </label>
      <fieldset className={styles.field}>
        <legend>Canales de publicación</legend>
        {visibleChannels.map((channel) => (
          <label key={channel} className={`${styles.check}`}>
            <input type="checkbox" checked={channels.includes(channel)} onChange={() => toggle(channel)} />
            {channel}
            {channel === TECHNICAL_CHANNEL && <span className={styles.hint}> (obligatorio para mecánicos)</span>}
          </label>
        ))}
        {submitted && problems.channels && (
          <span className={styles.error} role="alert">
            {missingTechnical
              ? 'Una vacante de mecánico debe publicarse también en institutos técnicos.'
              : 'Elige al menos un canal.'}
          </span>
        )}
      </fieldset>
      <div aria-live="polite">
        {error && <p className={styles.error} role="alert">{error}</p>}
        {dirty && !saving && <p className={styles.hint}>Tienes cambios sin publicar.</p>}
      </div>
      <div className={styles.actions}>
        <button type="submit" className={styles.primaryButton} disabled={saving}>
          {saving ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
    </form>
  );
}

/** REC-02 - Perfil y publicacion de la vacante; Pausar / Reanudar con confirmacion. */
function VacancyProfile() {
  const { id, state, vacancy, setVacancy, context, reload } = useVacancyDetail();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Reclutamiento" />
      <div className={styles.content}>
        <button type="button" className={styles.secondaryButton} onClick={() => navigate('/reclutamiento', { state: context ?? undefined })}>
          Volver a necesidades
        </button>
        <h1 className={styles.pageTitle}>Perfil y publicación</h1>

        {state === 'LOADING' && <p className={styles.statusText} aria-live="polite">Cargando vacante…</p>}
        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText} role="alert">
            No pudimos cargar la vacante. Intenta de nuevo en unos segundos.{' '}
            <button type="button" className={styles.secondaryButton} onClick={() => void reload()}>Reintentar</button>
          </p>
        )}

        {state === 'READY' && vacancy && context && (
          <>
            <dl className={styles.summary}>
              <div><dt>Código</dt><dd>{vacancy.code}</dd></div>
              <div><dt>Puesto</dt><dd>{vacancy.title}</dd></div>
              <div><dt>Área</dt><dd>{vacancy.department}</dd></div>
              <div><dt>Fuente</dt><dd>{VACANCY_SOURCE_LABEL[vacancy.source]}</dd></div>
              <div><dt>Estado</dt><dd>{VACANCY_STATUS_LABEL[vacancy.status]}</dd></div>
            </dl>

            <div aria-live="polite">
              {notice && <p className={styles.notice} role="status">{notice}</p>}
            </div>

            {vacancy.status !== 'NECESIDAD_REGISTRADA' && (
              <div className={styles.notice} role="status">
                <strong>{vacancy.status === 'PUBLICADA' ? 'Vacante publicada' : `Vacante ${VACANCY_STATUS_LABEL[vacancy.status].toLowerCase()}`}</strong>
                <PauseVacancyControl
                  vacancy={vacancy}
                  context={context}
                  buttonClassName={styles.secondaryButton}
                  onChanged={(detail, message) => {
                    setVacancy(detail);
                    setNotice(message);
                  }}
                  onStale={reload}
                />
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => navigate(`/reclutamiento/vacantes/${id}/candidatos`, { state: context })}
                >
                  Ver candidatos
                </button>
              </div>
            )}

            <ProfileForm
              key={`${vacancy.id}-${vacancy.version}`}
              vacancy={vacancy}
              context={context}
              onPublished={(detail) => {
                setVacancy(detail);
                setNotice('La vacante se publicó correctamente.');
              }}
              onStale={reload}
            />
          </>
        )}
      </div>
    </main>
  );
}

export function VacancyProfileScreen() {
  const { can } = useRecruitmentPermissions();
  if (!can('VIEW_VACANCY')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Reclutamiento" />
        <div className={styles.content}>
          <p className={styles.statusText} role="alert">No tienes acceso a esta vacante.</p>
        </div>
      </main>
    );
  }
  return <VacancyProfile />;
}
