import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { CandidateSummary } from './CandidateSummary';
import { FlowFrame } from './FlowFrame';
import { InterviewerPicker } from './InterviewerPicker';
import { formatDateTime } from './flow-format';
import {
  recordInterviewResult,
  scheduleInterview,
  type InterviewResponse,
  type RecruitmentScope,
} from './recruitment-client';
import { INTERVIEW_RESULT_LABEL, type InterviewResult } from './recruitment-domain';
import { useRecruitmentPermissions } from './recruitment-permissions';
import { useRecruitmentCommand, useUnsavedWarning } from './useRecruitmentCommand';
import { useCandidateDetail } from './useCandidateDetail';
import styles from './RecruitmentFlow.module.css';
import { limaDateTimeToInstant } from '../shared/lima-time';

type Mode = 'VIRTUAL' | 'PRESENCIAL';

function currentUid(): string {
  try {
    return getFirebaseAuth().currentUser?.uid ?? '';
  } catch {
    return '';
  }
}

interface ResultFormProps {
  interview: InterviewResponse;
  focusOnMount: boolean;
  saving: boolean;
  onSubmit: (interviewId: string, result: Exclude<InterviewResult, 'PENDIENTE'>, notes: string) => Promise<boolean>;
}

/** Notas libres + Avanza / No avanza. Sin escala numérica de puntaje. */
function ResultForm({ interview, focusOnMount, saving, onSubmit }: ResultFormProps) {
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<'AVANZA' | 'NO_AVANZA' | ''>('');
  const notesRef = useRef<HTMLTextAreaElement>(null);
  useUnsavedWarning(notes.trim().length > 0);

  useEffect(() => {
    if (focusOnMount) notesRef.current?.focus();
  }, [focusOnMount]);

  const valid = notes.trim().length > 0 && result !== '';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving || !result) return;
    await onSubmit(interview.id, result, notes.trim());
  }

  const notesId = `notes-${interview.id}`;
  return (
    <form onSubmit={submit} className={styles.form} noValidate aria-label="Registrar resultado de la entrevista">
      <label className={styles.fieldLabel} htmlFor={notesId}>
        Notas de la entrevista
      </label>
      <textarea
        id={notesId}
        ref={notesRef}
        className={styles.input}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={saving}
        aria-required="true"
      />
      <fieldset className={styles.fieldset}>
        <legend>Resultado de la entrevista</legend>
        <label className={styles.radioRow}>
          <input
            type="radio"
            name={`result-${interview.id}`}
            checked={result === 'AVANZA'}
            onChange={() => setResult('AVANZA')}
            disabled={saving}
          />
          Avanza
        </label>
        <label className={styles.radioRow}>
          <input
            type="radio"
            name={`result-${interview.id}`}
            checked={result === 'NO_AVANZA'}
            onChange={() => setResult('NO_AVANZA')}
            disabled={saving}
          />
          No avanza
        </label>
      </fieldset>
      <div className={styles.rowActions}>
        <button type="submit" className={styles.primaryButton} disabled={!valid || saving}>
          {saving ? 'Guardando…' : 'Registrar resultado'}
        </button>
      </div>
      {!valid && <p className={styles.hint}>Escribe las notas y elige si avanza o no para registrar el resultado.</p>}
    </form>
  );
}

/**
 * REC-05 - Entrevista. Agenda (más reciente primero), agendado (MANAGE_INTERVIEW) y
 * registro de resultado con notas libres + Avanza / No avanza (sin puntaje numérico).
 * El entrevistador se elige con un buscador (GET /interviewers); se preselecciona al usuario
 * actual si aparece en la lista y se envía el `id` elegido como `interviewerId`.
 * La duración "~15 min" es solo referencial: no hay contador obligatorio.
 */
export function InterviewScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useCandidateDetail(id);
  const { state, candidate, context } = detail;
  const { run, saving, error, notice, setNotice } = useRecruitmentCommand(detail);
  const { can } = useRecruitmentPermissions();

  const [when, setWhen] = useState('');
  const [mode, setMode] = useState<Mode>('VIRTUAL');
  const [meetUrl, setMeetUrl] = useState('');
  const [location, setLocation] = useState('');
  const [interviewerId, setInterviewerId] = useState('');
  const handleInterviewer = useCallback((value: string) => setInterviewerId(value), []);
  const uid = currentUid();
  const [recorded, setRecorded] = useState(false);

  const scheduleDirty = when !== '' || meetUrl !== '' || location !== '';
  useUnsavedWarning(scheduleDirty);

  const interviews = [...(candidate?.interviews ?? [])].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  const firstPendingId = interviews.find((i) => i.result === 'PENDIENTE')?.id;
  const anyEvaluated = interviews.some((i) => i.result !== 'PENDIENTE');
  const canSchedule = can('MANAGE_INTERVIEW') && !candidate?.decision;

  const modeValid = mode === 'VIRTUAL' ? /^https?:\/\/\S+$/i.test(meetUrl.trim()) : location.trim().length > 0;
  const scheduleValid = when !== '' && limaDateTimeToInstant(when) !== null && interviewerId.trim() !== '' && modeValid;

  async function submitSchedule(event: FormEvent) {
    event.preventDefault();
    if (!id || !scheduleValid || saving) return;
    const res = await run(
      (token, scope: RecruitmentScope) =>
        scheduleInterview(token, id, scope, {
          scheduledAt: limaDateTimeToInstant(when) ?? when,
          isVirtual: mode === 'VIRTUAL',
          interviewerId: interviewerId.trim(),
          ...(mode === 'VIRTUAL' ? { meetUrl: meetUrl.trim() } : { location: location.trim() }),
        }),
      'No pudimos agendar la entrevista. Intenta de nuevo.',
    );
    if (res.ok) {
      setWhen('');
      setMeetUrl('');
      setLocation('');
      setNotice('Entrevista agendada.');
      await detail.reload();
    }
  }

  async function submitResult(interviewId: string, result: Exclude<InterviewResult, 'PENDIENTE'>, notes: string) {
    const res = await run(
      (token, scope) => recordInterviewResult(token, interviewId, scope, result, notes),
      'No pudimos registrar el resultado. Intenta de nuevo.',
    );
    if (res.ok) {
      setRecorded(true);
      setNotice('Resultado registrado.');
      await detail.reload();
    }
    return res.ok;
  }

  function goToDecision() {
    navigate(`/reclutamiento/candidatos/${id}/decision`, { state: context ?? undefined });
  }

  return (
    <FlowFrame pageTitle="Entrevista" candidateId={id} state={state} hasCandidate={!!candidate} context={context} busy={saving}>
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

          <section aria-labelledby="int-agenda-title" className={styles.card}>
            <h2 id="int-agenda-title" className={styles.sectionTitle}>
              Agenda de entrevistas
            </h2>
            {interviews.length === 0 ? (
              <p className={styles.statusText}>Todavía no hay entrevistas agendadas.</p>
            ) : (
              <ol className={styles.plainList} aria-label="Agenda de entrevistas">
                {interviews.map((interview) => (
                  <li key={interview.id} className={styles.listItem}>
                    <p className={styles.entryMeta}>
                      <time dateTime={interview.scheduledAt}>{formatDateTime(interview.scheduledAt)}</time>
                      {' · '}
                      {interview.isVirtual ? 'Videollamada' : 'Presencial'}
                      {' · '}
                      <strong>{INTERVIEW_RESULT_LABEL[interview.result]}</strong>
                    </p>
                    <p className={styles.entryText}>
                      {interview.isVirtual
                        ? interview.meetUrl && (
                            <a href={interview.meetUrl} target="_blank" rel="noreferrer">
                              Enlace de la videollamada
                            </a>
                          )
                        : interview.location}
                    </p>
                    {interview.interviewerId && <p className={styles.entryMeta}>Entrevistador: {interview.interviewerId}</p>}
                    {interview.qualitativeNotes && <p className={styles.entryText}>{interview.qualitativeNotes}</p>}
                    {interview.result === 'PENDIENTE' && can('MANAGE_INTERVIEW') && !candidate.decision && (
                      <ResultForm
                        interview={interview}
                        focusOnMount={interview.id === firstPendingId}
                        saving={saving}
                        onSubmit={submitResult}
                      />
                    )}
                  </li>
                ))}
              </ol>
            )}
            {(recorded || anyEvaluated) && (
              <div className={styles.rowActions}>
                <button type="button" className={styles.secondaryButton} onClick={goToDecision}>
                  Ir a la decisión
                </button>
              </div>
            )}
          </section>

          {canSchedule && (
            <section aria-labelledby="int-schedule-title" className={styles.card}>
              <h2 id="int-schedule-title" className={styles.sectionTitle}>
                Agendar entrevista
              </h2>
              <form onSubmit={submitSchedule} className={styles.form} noValidate>
                <label className={styles.fieldLabel} htmlFor="int-when">
                  Fecha y hora
                </label>
                <input
                  id="int-when"
                  type="datetime-local"
                  className={styles.input}
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  disabled={saving}
                  aria-required="true"
                />
                <p className={styles.hint}>Duración referencial: ~15 min (no es un límite).</p>
                <fieldset className={styles.fieldset}>
                  <legend>Modalidad</legend>
                  <label className={styles.radioRow}>
                    <input type="radio" name="int-mode" checked={mode === 'VIRTUAL'} onChange={() => setMode('VIRTUAL')} />
                    Videollamada
                  </label>
                  <label className={styles.radioRow}>
                    <input type="radio" name="int-mode" checked={mode === 'PRESENCIAL'} onChange={() => setMode('PRESENCIAL')} />
                    Presencial
                  </label>
                </fieldset>
                {mode === 'VIRTUAL' ? (
                  <>
                    <label className={styles.fieldLabel} htmlFor="int-meet">
                      Enlace de la videollamada
                    </label>
                    <input
                      id="int-meet"
                      type="url"
                      className={styles.input}
                      value={meetUrl}
                      onChange={(e) => setMeetUrl(e.target.value)}
                      placeholder="https://meet.google.com/…"
                      disabled={saving}
                      aria-required="true"
                    />
                  </>
                ) : (
                  <>
                    <label className={styles.fieldLabel} htmlFor="int-location">
                      Dirección
                    </label>
                    <input
                      id="int-location"
                      type="text"
                      className={styles.input}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={saving}
                      aria-required="true"
                    />
                  </>
                )}
                <InterviewerPicker
                  inputId="int-interviewer"
                  label="Entrevistador"
                  scope={context ? { companyId: context.companyId, branchId: context.branchId } : null}
                  currentUserId={uid}
                  disabled={saving}
                  onChange={handleInterviewer}
                />
                <div className={styles.rowActions}>
                  <button type="submit" className={styles.primaryButton} disabled={!scheduleValid || saving}>
                    {saving ? 'Guardando…' : 'Agendar entrevista'}
                  </button>
                </div>
              </form>
            </section>
          )}
          {!can('MANAGE_INTERVIEW') && (
            <p className={styles.statusText}>Solo el personal de selección puede agendar o registrar entrevistas.</p>
          )}
        </>
      )}
    </FlowFrame>
  );
}
