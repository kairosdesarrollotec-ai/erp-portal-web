import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { HrFrame } from './HrFrame';
import { listEmployees, listTrainings, registerTraining, type EmployeeResponse, type Training } from './hr-client';
import { limaToday } from './hr-domain';
import { formatDate } from './hr-format';
import { useHrPermissions } from './hr-permissions';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';

interface TrainingData {
  employees: EmployeeResponse[];
  trainings: Training[];
}

const REFERENCE_DURATION_TEXT = 'Duración de referencia: ~1 hora (no bloquea el registro).';

/**
 * ADP-10 - Capacitacion interna (BR-ADP-008). Registro de un taller informal de ~1 hora: tema, fecha, asistentes y
 * una nota cualitativa de comprension. NO es una evaluacion formal de desempeno (BR-ADP-007): no hay puntajes ni
 * criterios. Cada asistente conserva el taller en su historial de capacitacion.
 */
function Training() {
  const { state, data, context, reload, setData } = useHrResource<TrainingData>(async (token, scope) => {
    const [employees, trainings] = await Promise.all([listEmployees(token, scope, { limit: 100 }), listTrainings(token, scope, 20)]);
    return { employees: employees.items.filter((e) => e.status !== 'TERMINADO'), trainings };
  }, 'capacitacion');
  const command = useHrCommand({ context, reload });
  const topicRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState('');
  const [heldOn, setHeldOn] = useState(limaToday());
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const ready = state === 'READY' && !!data;
  useEffect(() => {
    if (ready) topicRef.current?.focus();
  }, [ready]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.employees ?? []).filter((e) => !term || e.fullName.toLowerCase().includes(term));
  }, [data, search]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!topic.trim() || !heldOn || selected.size === 0) return;
    const res = await command.run(
      (token, scope) =>
        registerTraining(token, scope, {
          topic: topic.trim(),
          heldOn,
          attendeeIds: [...selected],
          comprehensionNotes: notes.trim() || undefined,
        }),
      'No pudimos registrar el taller. Intenta de nuevo.',
    );
    if (res.ok) {
      setData((current) => (current ? { ...current, trainings: [res.value, ...current.trainings] } : current));
      setTopic('');
      setNotes('');
      setSelected(new Set());
      setSubmitted(false);
      command.setNotice('Taller registrado. Quedó en el historial de capacitación de cada asistente.');
      topicRef.current?.focus();
    }
  }

  return (
    <HrFrame
      pageTitle="Registrar capacitación"
      back={{ label: 'Volver a Personal', to: '/personal' }}
      context={context}
      state={state}
      hasData={!!data}
      subject="las capacitaciones"
      busy={command.saving}
    >
      {data && (
        <>
          <div aria-live="polite">
            {command.notice && (
              <p className={styles.notice} role="status">
                {command.notice}
              </p>
            )}
          </div>
          {command.error && (
            <p className={styles.errorBanner} role="alert">
              {command.error}
            </p>
          )}

          <form onSubmit={(e) => void submit(e)} noValidate className={styles.form} aria-label="Registro de taller">
            <label className={styles.fieldLabel} htmlFor="cap-tema">
              Tema
            </label>
            <input id="cap-tema" ref={topicRef} className={styles.input} value={topic} maxLength={200} onChange={(e) => setTopic(e.target.value)} aria-invalid={submitted && !topic.trim()} required />
            {submitted && !topic.trim() && (
              <p className={styles.fieldError} role="alert">
                Indica el tema del taller.
              </p>
            )}

            <label className={styles.fieldLabel} htmlFor="cap-fecha">
              Fecha
            </label>
            <input id="cap-fecha" type="date" className={styles.input} value={heldOn} max={limaToday()} onChange={(e) => setHeldOn(e.target.value)} aria-invalid={submitted && !heldOn} required />
            <p className={styles.hint}>{REFERENCE_DURATION_TEXT}</p>

            <fieldset className={styles.fieldset}>
              <legend className={styles.fieldLabel}>Asistentes ({selected.size} seleccionados)</legend>
              <label className={styles.fieldLabel} htmlFor="cap-buscar">
                Buscar en el personal
              </label>
              <input id="cap-buscar" type="search" className={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} />
              <ul className={styles.plainList}>
                {visible.map((employee) => (
                  <li key={employee.id}>
                    <label className={styles.checkRow}>
                      <input type="checkbox" checked={selected.has(employee.id)} onChange={() => toggle(employee.id)} />
                      {employee.fullName} · {employee.areaName}
                    </label>
                  </li>
                ))}
              </ul>
              {visible.length === 0 && <p className={styles.statusText}>Ninguna persona coincide con la búsqueda.</p>}
              {submitted && selected.size === 0 && (
                <p className={styles.fieldError} role="alert">
                  Selecciona al menos un asistente.
                </p>
              )}
            </fieldset>

            <label className={styles.fieldLabel} htmlFor="cap-notas">
              Notas sobre comprensión general
            </label>
            <textarea id="cap-notas" className={styles.input} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
            <p className={styles.hint}>Es una nota cualitativa simple, no una evaluación formal de desempeño.</p>

            <div className={styles.stickyActions}>
              <button type="submit" className={styles.primaryButton} disabled={command.saving}>
                {command.saving ? 'Guardando…' : 'Registrar taller'}
              </button>
            </div>
          </form>

          <section className={styles.card} aria-labelledby="cap-historial">
            <h2 id="cap-historial" className={styles.sectionTitle}>
              Talleres registrados
            </h2>
            {data.trainings.length === 0 ? (
              <p className={styles.statusText}>Todavía no hay talleres registrados.</p>
            ) : (
              <ul className={styles.plainList}>
                {data.trainings.map((training) => (
                  <li key={training.id} className={styles.listItem}>
                    <strong>{training.topic}</strong>
                    <span className={styles.entryMeta}>
                      {formatDate(training.heldOn)} · {training.attendees.length} {training.attendees.length === 1 ? 'asistente' : 'asistentes'}
                    </span>
                    {training.comprehensionNotes && <span className={styles.entryText}>{training.comprehensionNotes}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </HrFrame>
  );
}

export function TrainingScreen() {
  const { can } = useHrPermissions();
  if (!can('REGISTER_TRAINING')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Personal" />
        <div className={styles.content}>
          <Link className={styles.backLink} to="/personal">
            ← Volver a Personal
          </Link>
          <h1 className={styles.title}>Capacitación interna</h1>
          <p className={styles.statusText} role="alert">
            No tienes permiso para registrar capacitaciones.
          </p>
        </div>
      </main>
    );
  }
  return <Training />;
}
