import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { getFirebaseAuth } from '../providers/firebase';
import { useCandidateDetail } from './useCandidateDetail';
import { useRecruitmentPermissions } from './recruitment-permissions';
import {
  CANDIDATE_DECISION_LABEL,
  CANDIDATE_STAGES,
  CANDIDATE_STAGE_LABEL,
  INTERVIEW_RESULT_LABEL,
} from './recruitment-domain';
import { changeCandidateStage, decideCandidate } from './recruitment-client';
import { describeRecruitmentError, isStaleRecruitmentError } from './recruitment-errors';
import { DiscardCandidateDialog } from './DiscardCandidateDialog';
import styles from './CandidateFileScreen.module.css';

const RESTRICTED_TEXT = 'Este dato requiere permiso adicional';

function Restricted() {
  return (
    <span className={styles.restricted}>
      <Lock size={14} aria-hidden="true" /> {RESTRICTED_TEXT}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const money = (value: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);

/**
 * REC-04 - Ficha y negociacion. Los datos sensibles se enmascaran con un candado
 * cuando la vista es restringida o falta el permiso; el resto de la ficha sigue visible.
 * El sistema no guarda condiciones ofrecidas: la negociacion es guia + pretension del candidato.
 */
export function CandidateFileScreen() {
  const { id } = useParams<{ id: string }>();
  const { state, candidate, context, reload, replace } = useCandidateDetail(id);
  const navigate = useNavigate();
  const { can } = useRecruitmentPermissions();
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);

  useEffect(() => {
    if (state === 'READY') titleRef.current?.focus();
  }, [state]);

  if (state === 'LOADING') {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Candidato" />
        <div className={styles.content}><p className={styles.statusText} role="status">Cargando la ficha…</p></div>
      </main>
    );
  }
  if (state === 'FORBIDDEN') {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Candidato" />
        <div className={styles.content} role="alert">
          <h1 className={styles.title}>No tienes acceso a esta sección</h1>
          <p className={styles.statusText}>Pide a tu administrador el permiso para ver candidatos.</p>
        </div>
      </main>
    );
  }
  if (state === 'NOT_FOUND' || !candidate) {
    const notFound = state === 'NOT_FOUND';
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Candidato" />
        <div className={styles.content} role="alert">
          <h1 className={styles.title}>{notFound ? 'No encontramos al candidato' : 'No pudimos cargar la ficha'}</h1>
          <p className={styles.statusText}>
            {notFound ? 'Puede que no exista o no pertenezca a tu empresa y sede.' : 'Intenta de nuevo en unos momentos.'}
          </p>
          {notFound ? (
            <button type="button" className={styles.linkButton} onClick={() => navigate('/reclutamiento', { state: context ?? undefined })}>
              Volver a reclutamiento
            </button>
          ) : (
            <button type="button" className={styles.secondaryButton} onClick={() => void reload()}>Reintentar</button>
          )}
        </div>
      </main>
    );
  }

  const c = candidate;
  const sensitiveHidden = c.isRestrictedView || !can('VIEW_CANDIDATE_SENSITIVE_DATA');
  const decided = Boolean(c.decision);
  const canRegister = can('REGISTER_CANDIDATE');
  const canDiscard = can('DECIDE_CANDIDATE') && !decided;
  const scope = context ? { companyId: context.companyId, branchId: context.branchId } : null;
  const interviewPath = `/reclutamiento/candidatos/${c.id}/entrevista`;

  async function getToken() {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('Sesión no disponible');
    return user.getIdToken();
  }

  async function agreeAndContinue() {
    if (!scope) return;
    setProblem(null);
    const before = CANDIDATE_STAGES.indexOf(c.stage) < CANDIDATE_STAGES.indexOf('ENTREVISTA');
    if (before) {
      setBusy(true);
      try {
        const idToken = await getToken();
        await changeCandidateStage(idToken, c.id, c.version, scope, 'ENTREVISTA');
      } catch (err) {
        setProblem(describeRecruitmentError(err, 'No pudimos avanzar al candidato. Intenta de nuevo.'));
        if (isStaleRecruitmentError(err)) void reload();
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    navigate(interviewPath, { state: context ?? undefined });
  }

  async function discard(reason: string) {
    if (!scope) return;
    setBusy(true);
    setDiscardError(null);
    try {
      const idToken = await getToken();
      const updated = await decideCandidate(idToken, c.id, c.version, scope, 'RECHAZADO', reason);
      replace(updated);
      setDiscarding(false);
    } catch (err) {
      setDiscardError(describeRecruitmentError(err, 'No pudimos descartar al candidato. Intenta de nuevo.'));
      if (isStaleRecruitmentError(err)) {
        setDiscarding(false);
        setProblem(describeRecruitmentError(err, 'El registro cambió. Revisa y vuelve a intentar.'));
        void reload();
      }
    } finally {
      setBusy(false);
    }
  }

  const interviews = c.interviews ?? [];

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Candidato" />
      <div className={styles.content}>
        <button type="button" className={styles.linkButton}
          onClick={() => navigate(`/reclutamiento/vacantes/${c.vacancyId}/candidatos`, { state: context ?? undefined })}>
          Volver a candidatos
        </button>
        <h1 ref={titleRef} tabIndex={-1} className={styles.title}>{c.fullName}</h1>
        {problem && <p className={styles.problem} role="alert">{problem}</p>}

        <section className={styles.section} aria-labelledby="sec-general">
          <h2 id="sec-general" className={styles.sectionTitle}>Datos generales</h2>
          <dl className={styles.fields}>
            <Field label="Documento">{c.documentType} {c.documentNumber}</Field>
            <Field label="Etapa">{CANDIDATE_STAGE_LABEL[c.stage]}</Field>
            {c.decision && <Field label="Decisión">{CANDIDATE_DECISION_LABEL[c.decision]}</Field>}
          </dl>
        </section>

        <section className={styles.section} aria-labelledby="sec-contact">
          <h2 id="sec-contact" className={styles.sectionTitle}>Contacto y CV</h2>
          <dl className={styles.fields}>
            <Field label="Correo">{sensitiveHidden ? <Restricted /> : (c.email || 'No registrado')}</Field>
            <Field label="Teléfono">{sensitiveHidden ? <Restricted /> : (c.phone || 'No registrado')}</Field>
            <Field label="CV adjunto">
              {sensitiveHidden ? <Restricted /> : c.cvDocumentId ? (
                <span>CV adjunto · código {c.cvDocumentId.slice(0, 8)}</span>
              ) : 'Sin CV'}
            </Field>
          </dl>
        </section>

        <section className={styles.section} aria-labelledby="sec-nego">
          <h2 id="sec-nego" className={styles.sectionTitle}>Negociación</h2>
          <dl className={styles.fields}>
            <Field label="Pretensión salarial del candidato">
              {sensitiveHidden ? <Restricted /> : c.salaryExpectation != null ? money(c.salaryExpectation) : 'No indicada'}
            </Field>
          </dl>
          <p className={styles.guide}>
            Conversa las condiciones con el candidato (sueldo, horario y fecha de ingreso). El sistema no guarda
            las condiciones acordadas: déjalas por escrito en tu acta o correo y continúa con la entrevista.
          </p>
        </section>

        {interviews.length > 0 && (
          <section className={styles.section} aria-labelledby="sec-int">
            <h2 id="sec-int" className={styles.sectionTitle}>Entrevistas</h2>
            <ul className={styles.list}>
              {interviews.map((i) => (
                <li key={i.id}>
                  {new Date(i.scheduledAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                  {' · '}{i.isVirtual ? 'Virtual' : 'Presencial'}{' · '}{INTERVIEW_RESULT_LABEL[i.result]}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className={styles.actions}>
          {canRegister && (
            <button type="button" className={styles.primaryButton} disabled={busy || !scope} onClick={() => void agreeAndContinue()}>
              {busy ? 'Guardando…' : 'Acordar y continuar'}
            </button>
          )}
          {canDiscard && (
            <button type="button" className={styles.discardLink} onClick={() => { setDiscardError(null); setDiscarding(true); }}>
              Descartar
            </button>
          )}
        </div>
      </div>

      {discarding && (
        <DiscardCandidateDialog candidateName={c.fullName} busy={busy} error={discardError}
          onConfirm={(r) => void discard(r)} onCancel={() => setDiscarding(false)} />
      )}
    </main>
  );
}
