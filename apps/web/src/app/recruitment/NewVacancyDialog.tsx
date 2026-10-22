import { useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { getFirebaseAuth } from '../providers/firebase';
import { useHrAreaCatalog } from '../hr-administration/useHrAreaCatalog';
import { registerVacancy, type VacancyResponse } from './recruitment-client';
import { describeRecruitmentError } from './recruitment-errors';
import { VACANCY_SOURCE_LABEL, type VacancySource } from './recruitment-domain';
import type { RecruitmentWorkContext } from './useWorkContextForRecruitment';
import styles from './NewVacancyDialog.module.css';

const SOURCES: readonly VacancySource[] = ['RENUNCIA', 'CRECIMIENTO', 'NUEVA_AREA'];

interface Props {
  context: RecruitmentWorkContext;
  onCreated: (vacancy: VacancyResponse) => void;
  onCancel: () => void;
}

/** REC-01 - "Nueva necesidad de personal": la fuente es estructurada (chips), no texto libre. */
export function NewVacancyDialog({ context, onCreated, onCancel }: Props) {
  const [source, setSource] = useState<VacancySource | ''>('');
  const [department, setDepartment] = useState('');
  const [title, setTitle] = useState('');
  const [isMechanic, setIsMechanic] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // El área sale del catálogo `hr_areas` (GET /hr-areas): select, nunca texto libre (recruitment.yaml 0.6.0).
  const catalog = useHrAreaCatalog(context.companyId, context.branchId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!source || !department.trim() || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const created = await registerVacancy(
        idToken,
        { companyId: context.companyId, branchId: context.branchId },
        { title: title.trim(), department: department.trim(), source, isMechanic },
      );
      onCreated(created);
    } catch (err) {
      setError(describeRecruitmentError(err, 'No pudimos registrar la necesidad. Intenta de nuevo.'));
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.card} aria-labelledby="new-vacancy-title" aria-describedby={undefined}>
          <Dialog.Title id="new-vacancy-title" className={styles.title}>
            Nueva necesidad de personal
          </Dialog.Title>
          <form onSubmit={(e) => void submit(e)} noValidate>
            <fieldset className={styles.field}>
              <legend>¿Por qué se necesita? (obligatorio)</legend>
              <div className={styles.chips}>
                {SOURCES.map((value) => (
                  <label key={value} className={styles.chip}>
                    <input
                      type="radio"
                      name="vacancy-source"
                      value={value}
                      checked={source === value}
                      onChange={() => setSource(value)}
                    />
                    <span>{VACANCY_SOURCE_LABEL[value]}</span>
                  </label>
                ))}
              </div>
              {submitted && !source && (
                <span className={styles.error} role="alert">Elige el motivo de la necesidad.</span>
              )}
            </fieldset>
            <label className={styles.field}>
              Área
              <select
                className={styles.input}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                aria-invalid={submitted && !department.trim()}
                disabled={catalog.state !== 'READY' || catalog.areas.length === 0}
                required
              >
                <option value="">
                  {catalog.state === 'LOADING' ? 'Cargando áreas…' : 'Elige un área'}
                </option>
                {catalog.areas.map((area) => (
                  <option key={area.code} value={area.name}>
                    {area.name}
                  </option>
                ))}
              </select>
              {catalog.state === 'ERROR' && (
                <span className={styles.error} role="alert">No pudimos cargar el catálogo de áreas. Cierra y vuelve a abrir esta ventana.</span>
              )}
              {catalog.state === 'READY' && catalog.areas.length === 0 && (
                <span className={styles.error} role="alert">La empresa aún no tiene áreas configuradas. Pide a Gerencia que las registre en Personal.</span>
              )}
              {submitted && !department.trim() && catalog.areas.length > 0 && (
                <span className={styles.error} role="alert">Elige el área.</span>
              )}
            </label>
            <label className={styles.field}>
              Puesto
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={submitted && !title.trim()}
                required
              />
              {submitted && !title.trim() && (
                <span className={styles.error} role="alert">Indica el puesto.</span>
              )}
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={isMechanic} onChange={(e) => setIsMechanic(e.target.checked)} />
              Es puesto de mecánico
            </label>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>
                Cancelar
              </button>
              <button type="submit" className={styles.primaryButton} disabled={busy}>
                {busy ? 'Guardando…' : 'Continuar a perfil'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
