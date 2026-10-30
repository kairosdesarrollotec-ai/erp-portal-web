import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
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
  PROCESS_STATE_LABEL,
  INTERVIEW_RESULT_LABEL,
  NEGOTIATION_OUTCOME_LABEL,
  validateCvFile,
} from './recruitment-domain';
import {
  changeCandidateStage,
  decideCandidate,
  getCandidateCv,
  recordNegotiation,
  uploadCandidateCv,
  type NegotiationResponse,
  type RecordNegotiationInput,
} from './recruitment-client';
import { NegotiationDialog } from './NegotiationDialog';
import { describeRecruitmentError, isStaleRecruitmentError } from './recruitment-errors';
import { DiscardCandidateDialog } from './DiscardCandidateDialog';
import { ProcessStateTracker } from './ProcessStateTracker';
import styles from './CandidateFileScreen.module.css';
import { formatLimaDate, formatLimaDateTime } from '../shared/lima-time';

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
 * Historial de negociacion (condiciones ofrecidas / pedidas / acordadas) y CV con carga y visor.
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
  const [notice, setNotice] = useState<string | null>(null);
  const [cvBusy, setCvBusy] = useState(false);
  const [negotiating, setNegotiating] = useState(false);
  const [negotiationError, setNegotiationError] = useState<string | null>(null);

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
  // Respuesta 29-oct #8 (R-10): descartar es irreversible; un descartado no avanza ni agenda.
  const discarded = c.processState === 'DESCARTADO';
  // R-2: «Acordar y continuar» exige una negociación ACORDADA registrada.
  const hasAgreedNegotiation = (c.negotiations ?? []).some((n: NegotiationResponse) => n.outcome === 'ACORDADA');
  const canRegister = can('REGISTER_CANDIDATE');
  const canDiscard = can('DECIDE_CANDIDATE') && !decided && !discarded;
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

  async function onCvSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !scope) return;
    setProblem(null);
    setNotice(null);
    const invalid = validateCvFile(file);
    if (invalid) {
      setProblem(invalid);
      return;
    }
    setCvBusy(true);
    try {
      const idToken = await getToken();
      const updated = await uploadCandidateCv(idToken, c.id, c.version, scope, file);
      replace(updated);
      setNotice('El CV se subió correctamente.');
    } catch (err) {
      setProblem(describeRecruitmentError(err, 'No pudimos subir el CV. Intenta de nuevo.'));
      if (isStaleRecruitmentError(err)) void reload();
    } finally {
      setCvBusy(false);
    }
  }

  async function viewCv() {
    if (!scope) return;
    setProblem(null);
    setCvBusy(true);
    try {
      const idToken = await getToken();
      const view = await getCandidateCv(idToken, c.id, scope);
      // URL firmada de corta vigencia: se abre y no se guarda.
      window.open(view.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setProblem(describeRecruitmentError(err, 'No pudimos abrir el CV. Intenta de nuevo.'));
    } finally {
      setCvBusy(false);
    }
  }

  async function saveNegotiation(input: RecordNegotiationInput) {
    if (!scope) return;
    setBusy(true);
    setNegotiationError(null);
    try {
      const idToken = await getToken();
      const updated = await recordNegotiation(idToken, c.id, c.version, scope, input);
      replace(updated);
      setNegotiating(false);
      // R-2: el aviso solo afirma el cambio de etapa cuando el servidor realmente la cambio
      // (si el candidato ya estaba en Entrevista o Decision, el acuerdo no la modifica).
      setNotice(
        input.outcome === 'ACORDADA' && updated.stage !== c.stage
          ? `Negociación registrada. El candidato pasó a la etapa ${CANDIDATE_STAGE_LABEL[updated.stage]}.`
          : 'Negociación registrada en el historial.',
      );
    } catch (err) {
      setNegotiationError(describeRecruitmentError(err, 'No pudimos registrar la negociación. Intenta de nuevo.'));
      if (isStaleRecruitmentError(err)) {
        setNegotiating(false);
        setProblem(describeRecruitmentError(err, 'El registro cambió. Revisa y vuelve a intentar.'));
        void reload();
      }
    } finally {
      setBusy(false);
    }
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
        <div aria-live="polite">{notice && <p className={styles.notice} role="status">{notice}</p>}</div>

        <section className={styles.section} aria-labelledby="sec-general">
          <h2 id="sec-general" className={styles.sectionTitle}>Datos generales</h2>
          <ProcessStateTracker
            state={c.processState}
            hadInterview={(c.interviews ?? []).some((i) => i.result !== 'PENDIENTE')}
          />
          <dl className={styles.fields}>
            {c.documentNumber && <Field label="Documento">{c.documentType} {c.documentNumber}</Field>}
            <Field label="Estado del proceso">{PROCESS_STATE_LABEL[c.processState]}</Field>
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
              {sensitiveHidden ? <Restricted /> : c.cv ? (
                <span className={styles.cvRow}>
                  <span>
                    {c.cv.fileName}
                    <span className={styles.cvMeta}>
                      {' '}· {(c.cv.sizeBytes / 1024 / 1024).toFixed(2)} MB · subido{' '}
                      {formatLimaDate(c.cv.uploadedAt)}
                    </span>
                  </span>
                  <button type="button" className={styles.linkButton} disabled={cvBusy} onClick={() => void viewCv()}>
                    Ver CV
                  </button>
                </span>
              ) : c.cvDocumentId ? (
                <span>CV adjunto (referencia anterior) · código {c.cvDocumentId.slice(0, 8)}</span>
              ) : 'Sin CV'}
            </Field>
          </dl>
          {!sensitiveHidden && canRegister && !decided && !discarded && (
            <div className={styles.cvRow}>
              <input id="cv-file" type="file" className={styles.fileInput} disabled={cvBusy}
                accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                onChange={(e) => void onCvSelected(e)} />
              <label htmlFor="cv-file" className={`${styles.secondaryButton} ${styles.fileLabel}`}>
                {cvBusy ? 'Procesando CV…' : c.cv ? 'Reemplazar CV' : 'Subir CV'}
              </label>
              <span className={styles.cvMeta}>PDF, Word (docx), JPG o PNG de hasta 10 MB.</span>
            </div>
          )}
        </section>

        <section className={styles.section} aria-labelledby="sec-nego">
          <h2 id="sec-nego" className={styles.sectionTitle}>Negociación</h2>
          <dl className={styles.fields}>
            <Field label="Pretensión salarial del candidato">
              {sensitiveHidden ? <Restricted /> : c.salaryExpectation != null ? money(c.salaryExpectation) : 'No indicada'}
            </Field>
          </dl>
          {sensitiveHidden ? null : (c.negotiations ?? []).length === 0 ? (
            <p className={styles.guide}>Todavía no hay negociaciones registradas para este candidato.</p>
          ) : (
            <ol className={styles.history} aria-label="Historial de negociación">
              {(c.negotiations ?? []).map((n: NegotiationResponse) => (
                <li key={n.id} className={styles.historyItem}>
                  <div className={styles.historyHead}>
                    <span>{NEGOTIATION_OUTCOME_LABEL[n.outcome]}</span>
                    <span className={styles.historyMeta}>
                      {formatLimaDateTime(n.createdAt)}
                    </span>
                  </div>
                  <p className={styles.historyLine}>
                    Ofrecido: {money(n.offeredSalary)}
                    {n.offeredSchedule ? ` · ${n.offeredSchedule}` : ''}
                    {n.offeredOtherConditions ? ` · ${n.offeredOtherConditions}` : ''}
                  </p>
                  {(n.candidateSalary != null || n.candidateSchedule || n.candidateOtherConditions || n.candidateStartDate) && (
                    <p className={styles.historyLine}>
                      Candidato pide:{n.candidateSalary != null ? ` ${money(n.candidateSalary)}` : ''}
                      {n.candidateSchedule ? ` · ${n.candidateSchedule}` : ''}
                      {n.candidateOtherConditions ? ` · ${n.candidateOtherConditions}` : ''}
                      {n.candidateStartDate ? ` · ingreso ${n.candidateStartDate}` : ''}
                    </p>
                  )}
                  {n.agreedSalary != null && (
                    <p className={styles.historyLine}>
                      Acordado: {money(n.agreedSalary)}{n.agreedConditions ? ` · ${n.agreedConditions}` : ''}
                    </p>
                  )}
                  {n.reason && <p className={styles.historyLine}>Motivo: {n.reason}</p>}
                </li>
              ))}
            </ol>
          )}
          {!sensitiveHidden && canRegister && !decided && !discarded && (
            <p className={styles.guide}>
              <button type="button" className={styles.secondaryButton} onClick={() => { setNegotiationError(null); setNegotiating(true); }}>
                Registrar negociación
              </button>
            </p>
          )}
        </section>

        {interviews.length > 0 && (
          <section className={styles.section} aria-labelledby="sec-int">
            <h2 id="sec-int" className={styles.sectionTitle}>Entrevistas</h2>
            <ul className={styles.list}>
              {interviews.map((i) => (
                <li key={i.id}>
                  {formatLimaDateTime(i.scheduledAt)}
                  {' · '}{i.isVirtual ? 'Virtual' : 'Presencial'}{' · '}{INTERVIEW_RESULT_LABEL[i.result]}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className={styles.actions}>
          {canRegister && !discarded && (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy || !scope || (!sensitiveHidden && !hasAgreedNegotiation)}
              onClick={() => void agreeAndContinue()}
            >
              {busy ? 'Guardando…' : 'Acordar y continuar'}
            </button>
          )}
          {canRegister && !discarded && !sensitiveHidden && !hasAgreedNegotiation && (
            <p className={styles.guide} data-testid="agree-required">
              Registra una negociación con resultado «Acordada» para poder continuar a la entrevista.
            </p>
          )}
          {discarded && (
            <p className={styles.guide} role="status" data-testid="candidate-discarded">
              Candidato descartado: la decisión es irreversible; no se puede avanzar ni agendar entrevistas.
            </p>
          )}
          {canDiscard && (
            <button type="button" className={styles.discardLink} onClick={() => { setDiscardError(null); setDiscarding(true); }}>
              Descartar
            </button>
          )}
        </div>
      </div>

      {negotiating && (
        <NegotiationDialog candidateName={c.fullName} salaryExpectation={c.salaryExpectation} busy={busy}
          error={negotiationError} onSubmit={(i) => void saveNegotiation(i)} onCancel={() => setNegotiating(false)} />
      )}

      {discarding && (
        <DiscardCandidateDialog candidateName={c.fullName} busy={busy} error={discardError}
          onConfirm={(r) => void discard(r)} onCancel={() => setDiscarding(false)} />
      )}
    </main>
  );
}
