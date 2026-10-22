import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { HrFrame } from './HrFrame';
import { createHrArea, deactivateHrArea, listHrAreas, reactivateHrArea, type HrArea } from './hr-client';
import { useHrPermissions } from './hr-permissions';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';

const NAME_MAX = 100;
const DESCRIPTION_MAX = 255;

/**
 * Gestión de áreas de RR.HH. (hr-administration 0.8.0, Respuestas de negocio 2026-10-20 #17). Solo Gerencia General
 * (HR_ADMINISTRATION.MANAGE_AREAS): lista el catálogo de la empresa con las áreas desactivadas (`includeInactive`), da de
 * alta áreas nuevas y activa / desactiva las existentes. Un área desactivada deja de ofrecerse en las fichas pero conserva
 * su histórico. NOTA: no existe prototipo aprobado de esta pantalla; reutiliza los componentes de Personal.
 */
function Areas() {
  const { state, data, context, reload, setData } = useHrResource<HrArea[]>(
    (token, scope) => listHrAreas(token, scope, undefined, { includeInactive: true }),
    'areas',
  );
  const command = useHrCommand({ context, reload });
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!name.trim()) return;
    const res = await command.run(
      (token, scope) => createHrArea(token, scope, { name: name.trim(), description: description.trim() || undefined }),
      'No pudimos crear el área. Intenta de nuevo.',
    );
    if (res.ok) {
      setData((current) => [...(current ?? []).filter((a) => a.code !== res.value.code), res.value]);
      setName('');
      setDescription('');
      setSubmitted(false);
      command.setNotice(`Área «${res.value.name}» creada. Ya se puede elegir en las fichas de personal.`);
      nameRef.current?.focus();
    }
  }

  async function toggle(area: HrArea) {
    setPendingCode(area.code);
    const res = await command.run(
      (token, scope) => (area.isActive ? deactivateHrArea(token, scope, area.code) : reactivateHrArea(token, scope, area.code)),
      area.isActive ? 'No pudimos desactivar el área. Intenta de nuevo.' : 'No pudimos activar el área. Intenta de nuevo.',
    );
    setPendingCode(null);
    if (res.ok) {
      setData((current) => (current ?? []).map((a) => (a.code === res.value.code ? res.value : a)));
      command.setNotice(
        res.value.isActive
          ? `Área «${res.value.name}» activada: vuelve a ofrecerse en las fichas.`
          : `Área «${res.value.name}» desactivada: ya no se ofrece en las fichas, pero conserva su historial.`,
      );
    }
  }

  const areas = data ?? [];

  return (
    <HrFrame
      pageTitle="Áreas de RR.HH."
      back={{ label: 'Volver a Personal', to: '/personal' }}
      context={context}
      state={state}
      hasData={!!data}
      subject="las áreas"
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

          <form onSubmit={(e) => void create(e)} noValidate className={styles.form} aria-label="Nueva área">
            <label className={styles.fieldLabel} htmlFor="area-nombre">
              Nombre del área nueva
            </label>
            <input id="area-nombre" ref={nameRef} className={styles.input} value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} aria-invalid={submitted && !name.trim()} required />
            {submitted && !name.trim() && (
              <p className={styles.fieldError} role="alert">
                Indica el nombre del área.
              </p>
            )}
            <label className={styles.fieldLabel} htmlFor="area-descripcion">
              Descripción (opcional)
            </label>
            <input id="area-descripcion" className={styles.input} value={description} maxLength={DESCRIPTION_MAX} onChange={(e) => setDescription(e.target.value)} />
            <p className={styles.hint}>El área queda al final de la lista. Si ya existe una con ese nombre (activa o desactivada), no se crea otra.</p>
            <div className={styles.stickyActions}>
              <button type="submit" className={styles.primaryButton} disabled={command.saving}>
                {command.saving && pendingCode === null ? 'Guardando…' : 'Crear área'}
              </button>
            </div>
          </form>

          <section className={styles.card} aria-labelledby="areas-lista">
            <h2 id="areas-lista" className={styles.sectionTitle}>
              Áreas de la empresa
            </h2>
            {areas.length === 0 ? (
              <p className={styles.statusText}>Todavía no hay áreas registradas en esta empresa.</p>
            ) : (
              <ul className={styles.plainList}>
                {areas.map((area) => (
                  <li key={area.code} className={styles.listItem}>
                    <strong>{area.name}</strong>
                    <span className={area.isActive ? styles.badgePositive : styles.badgeNeutral}>{area.isActive ? 'Activa' : 'Desactivada'}</span>
                    {area.description && <span className={styles.entryText}>{area.description}</span>}
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={area.isActive ? styles.dangerButton : styles.smallButton}
                        disabled={command.saving}
                        aria-label={`${area.isActive ? 'Desactivar' : 'Activar'} el área ${area.name}`}
                        onClick={() => void toggle(area)}
                      >
                        {pendingCode === area.code ? 'Guardando…' : area.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
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

export function AreasScreen() {
  const { can, ready } = useHrPermissions();
  if (!ready) return null;
  if (!can('MANAGE_AREAS')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Personal" />
        <div className={styles.content}>
          <Link className={styles.backLink} to="/personal">
            ← Volver a Personal
          </Link>
          <h1 className={styles.title}>Áreas de RR.HH.</h1>
          <p className={styles.statusText} role="alert">
            Solo Gerencia General puede gestionar las áreas.
          </p>
        </div>
      </main>
    );
  }
  return <Areas />;
}
