import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CandidateSummary } from './CandidateSummary';
import { FlowFrame } from './FlowFrame';
import { formatDate, formatDateTime } from './flow-format';
import { completeOnboarding } from './recruitment-client';
import { defaultStartDate } from './recruitment-domain';
import { useRecruitmentPermissions } from './recruitment-permissions';
import { useHrPermissions } from '../hr-administration/hr-permissions';
import { useRecruitmentCommand, useUnsavedWarning } from './useRecruitmentCommand';
import { useCandidateDetail } from './useCandidateDetail';
import styles from './RecruitmentFlow.module.css';

/**
 * REC-07 - Incorporación. Solo con decisión CONTRATADO. Ingreso propuesto: mañana.
 * Checklist obligatorio (inducción, dispositivos, responsabilidad). El contrato notariado
 * aparece solo si la vacante es de mecánico (se consulta la vacante porque la ficha del

 */
export function OnboardingScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useCandidateDetail(id);
  const { state, candidate, context } = detail;
  const { run, saving, error, notice, setNotice } = useRecruitmentCommand(detail);
  const { can } = useRecruitmentPermissions();
  const { can: canHr } = useHrPermissions();

  const [startDate, setStartDate] = useState(() => defaultStartDate());
  const [induction, setInduction] = useState(false);
  const [equipment, setEquipment] = useState(false);
  const [responsibility, setResponsibility] = useState(false);
  const [notarized, setNotarized] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);

  const hired = candidate?.decision === 'CONTRATADO';
  const completed = candidate?.onboarding?.isCompleted === true;
  const formVisible = !!candidate && hired && !completed && can('MANAGE_ONBOARDING');
  const isMechanic = candidate?.isMechanic === true;

  useUnsavedWarning(formVisible && (induction || equipment || responsibility || notarized));

  useEffect(() => {
    if (formVisible) dateRef.current?.focus();
  }, [formVisible]);

  const checklistOk = induction && equipment && responsibility && (!isMechanic || notarized);
  const valid = startDate !== '' && checklistOk;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!id || !valid || saving) return;
    const res = await run(
      (token, scope) =>
        completeOnboarding(token, id, scope, {
          startDate,
          inductionScheduled: induction,
          equipmentAssigned: equipment,
          responsibilityCardSigned: responsibility,
          notarizedContractSigned: isMechanic ? notarized : false,
        }),
      'No pudimos confirmar el ingreso. Intenta de nuevo.',
    );
    if (res.ok) {
      setNotice('Ingreso confirmado.');
      await detail.reload();
    }
  }

  const onboarding = candidate?.onboarding;
  const yesNo = (value: boolean) => (value ? 'Sí' : 'No');

  return (
    <FlowFrame pageTitle="Incorporación" candidateId={id} state={state} hasCandidate={!!candidate} context={context} busy={saving}>
      {candidate && (
        <>
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

          <CandidateSummary candidate={candidate} />

          {!hired && (
            <section className={styles.card} aria-labelledby="onb-blocked-title">
              <h2 id="onb-blocked-title" className={styles.sectionTitle}>
                Incorporación no disponible
              </h2>
              <p className={styles.statusText}>
                Solo se puede incorporar a quien ya fue contratado. Primero hay que tomar la decisión de contratación.
              </p>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => navigate(`/reclutamiento/candidatos/${id}/decision`, { state: context ?? undefined })}
                >
                  Ir a la decisión
                </button>
              </div>
            </section>
          )}

          {hired && completed && onboarding && (
            <section className={styles.card} aria-labelledby="onb-done-title">
              <h2 id="onb-done-title" className={styles.sectionTitle}>
                Ingreso confirmado
              </h2>
              <dl className={styles.dataGrid}>
                <div>
                  <dt>Fecha de ingreso</dt>
                  <dd>{formatDate(onboarding.startDate)}</dd>
                </div>
                {onboarding.completedAt && (
                  <div>
                    <dt>Confirmado el</dt>
                    <dd>{formatDateTime(onboarding.completedAt)}</dd>
                  </div>
                )}
                <div>
                  <dt>Inducción agendada</dt>
                  <dd>{yesNo(onboarding.inductionScheduled)}</dd>
                </div>
                <div>
                  <dt>Dispositivos asignados</dt>
                  <dd>{yesNo(onboarding.equipmentAssigned)}</dd>
                </div>
                <div>
                  <dt>Responsabilidad firmada</dt>
                  <dd>{yesNo(onboarding.responsibilityCardSigned)}</dd>
                </div>
                <div>
                  <dt>Contrato notariado</dt>
                  <dd>{yesNo(onboarding.notarizedContractSigned)}</dd>
                </div>
              </dl>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => navigate(`/reclutamiento/candidatos/${id}/periodo-de-prueba`, { state: context ?? undefined })}
                >
                  Ir al periodo de prueba
                </button>
              </div>
            </section>
          )}

          {hired && canHr('MANAGE_EMPLOYEES') && (
            <section className={styles.card} aria-labelledby="onb-person-title">
              <h2 id="onb-person-title" className={styles.sectionTitle}>
                Alta en Personal
              </h2>
              <p className={styles.statusText}>Registra a la persona contratada en Personal con sus datos del candidato.</p>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => { if (context) navigate(`/personal/nuevo?candidateId=${id}`, { state: context }); }}
                >
                  Registrar como persona
                </button>
              </div>
            </section>
          )}

          {hired && !completed && !can('MANAGE_ONBOARDING') && (
            <p className={styles.warning}>Solo el personal autorizado puede confirmar el ingreso.</p>
          )}

          {formVisible && (
            <section className={styles.card} aria-labelledby="onb-form-title">
              <h2 id="onb-form-title" className={styles.sectionTitle}>
                Checklist de ingreso
              </h2>
              <form onSubmit={submit} className={styles.form} noValidate>
                <label className={styles.fieldLabel} htmlFor="onb-start">
                  Fecha de ingreso
                </label>
                <input
                  id="onb-start"
                  ref={dateRef}
                  type="date"
                  className={styles.input}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={saving}
                  aria-required="true"
                />
                <p className={styles.hint}>Se propone el día siguiente a la decisión; puedes cambiarla.</p>
                <fieldset className={styles.fieldset}>
                  <legend>Antes de ingresar (todo es obligatorio)</legend>
                  <label className={styles.checkRow}>
                    <input type="checkbox" checked={induction} onChange={(e) => setInduction(e.target.checked)} disabled={saving} />
                    Inducción agendada
                  </label>
                  <label className={styles.checkRow}>
                    <input type="checkbox" checked={equipment} onChange={(e) => setEquipment(e.target.checked)} disabled={saving} />
                    Dispositivos asignados
                  </label>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={responsibility}
                      onChange={(e) => setResponsibility(e.target.checked)}
                      disabled={saving}
                    />
                    Responsabilidad firmada
                  </label>
                  {isMechanic && (
                    <>
                      <label className={styles.checkRow}>
                        <input type="checkbox" checked={notarized} onChange={(e) => setNotarized(e.target.checked)} disabled={saving} />
                        Contrato notariado
                      </label>
                      <p className={styles.hint}>Este puesto siempre requiere notaría</p>
                    </>
                  )}
                </fieldset>
                <div className={styles.rowActions}>
                  <button type="submit" className={styles.primaryButton} disabled={!valid || saving}>
                    {saving ? 'Guardando…' : 'Confirmar ingreso'}
                  </button>
                </div>
                {!valid && <p className={styles.hint}>Marca todo el checklist y elige la fecha para confirmar el ingreso.</p>}
              </form>
            </section>
          )}
        </>
      )}
    </FlowFrame>
  );
}
