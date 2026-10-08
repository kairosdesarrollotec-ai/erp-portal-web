import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { getFirebaseAuth } from '../providers/firebase';
import { useCandidatesBoard } from './useCandidatesBoard';
import { useRecruitmentPermissions } from './recruitment-permissions';
import { CANDIDATE_STAGES, CANDIDATE_STAGE_LABEL, type CandidateStage } from './recruitment-domain';
import {
  changeCandidateStage,
  registerCandidate,
  type CandidateResponse,
  type RegisterCandidateInput,
} from './recruitment-client';
import { describeRecruitmentError, isStaleRecruitmentError } from './recruitment-errors';
import { CandidateCard } from './CandidateCard';
import { NewCandidateDialog } from './NewCandidateDialog';
import styles from './CandidatesBoardScreen.module.css';

/**
 * REC-03 - Bandeja de candidatos (tablero). Sin puntajes ni filtrado automatico:
 * mover de etapa es siempre una decision humana (menu "Mover a…" por tarjeta).
 * Mover a "Decision" solo cambia la etapa; la contratacion se decide en REC-06.
 */
export function CandidatesBoardScreen() {
  const { state, vacancyId, vacancyTitle, candidates, context, reload, replaceCandidate, addCandidate } =
    useCandidatesBoard();
  const navigate = useNavigate();
  const { can } = useRecruitmentPermissions();
  const canRegister = can('REGISTER_CANDIDATE');
  const canDecide = can('DECIDE_CANDIDATE');

  const [stageFilter, setStageFilter] = useState<CandidateStage | ''>('');
  const [creating, setCreating] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function getToken() {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('Sesión no disponible');
    return user.getIdToken();
  }

  async function move(candidate: CandidateResponse, stage: CandidateStage) {
    if (!context) return;
    setMovingId(candidate.id);
    setNotice(null);
    setProblem(null);
    try {
      const idToken = await getToken();
      const updated = await changeCandidateStage(
        idToken, candidate.id, candidate.version,
        { companyId: context.companyId, branchId: context.branchId }, stage,
      );
      replaceCandidate(updated);
      setNotice(`${candidate.fullName} pasó a ${CANDIDATE_STAGE_LABEL[stage]}.`);
    } catch (err) {
      setProblem(describeRecruitmentError(err, 'No pudimos mover al candidato. Intenta de nuevo.'));
      if (isStaleRecruitmentError(err)) void reload();
    } finally {
      setMovingId(null);
    }
  }

  async function create(input: RegisterCandidateInput) {
    if (!context || !vacancyId) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const idToken = await getToken();
      const created = await registerCandidate(
        idToken, vacancyId, { companyId: context.companyId, branchId: context.branchId }, input,
      );
      addCandidate(created);
      setNotice(`Candidato ${created.fullName} creado en la etapa Nuevo.`);
      setCreating(false);
    } catch (err) {
      setCreateError(describeRecruitmentError(err, 'No pudimos crear el candidato. Intenta de nuevo.'));
    } finally {
      setCreateBusy(false);
    }
  }

  const openFile = (c: CandidateResponse) => navigate(`/reclutamiento/candidatos/${c.id}`, { state: context ?? undefined });
  const goDecision = (c: CandidateResponse) =>
    navigate(`/reclutamiento/candidatos/${c.id}/decision`, { state: context ?? undefined });
  const backToVacancy = () => navigate(`/reclutamiento/vacantes/${vacancyId}`, { state: context ?? undefined });

  const visibleStages = stageFilter ? CANDIDATE_STAGES.filter((s) => s === stageFilter) : CANDIDATE_STAGES;

  function renderBody() {
    if (state === 'LOADING') return <p className={styles.statusText} role="status">Cargando candidatos…</p>;
    if (state === 'FORBIDDEN') {
      return (
        <div role="alert">
          <h2 className={styles.title}>No tienes acceso a esta sección</h2>
          <p className={styles.statusText}>Pide a tu administrador el permiso para ver candidatos de esta vacante.</p>
        </div>
      );
    }
    if (state === 'RECOVERABLE_ERROR') {
      return (
        <div role="alert">
          <p className={styles.statusText}>No pudimos cargar los candidatos.</p>
          <button type="button" className={styles.secondaryButton} onClick={() => void reload()}>Reintentar</button>
        </div>
      );
    }
    if (candidates.length === 0) {
      return (
        <div>
          <p className={styles.statusText}>Esta vacante aún no tiene candidatos.</p>
          {canRegister && <p className={styles.statusText}>Usa «Crear candidato» para registrar al primero.</p>}
        </div>
      );
    }
    return (
      <div className={styles.board}>
        {visibleStages.map((stage) => {
          const items = candidates.filter((c) => c.stage === stage);
          const headingId = `col-${stage}`;
          return (
            <section key={stage} className={styles.column} aria-labelledby={headingId}>
              <h2 id={headingId} className={styles.columnTitle}>
                {CANDIDATE_STAGE_LABEL[stage]} <span className={styles.count}>({items.length})</span>
              </h2>
              {items.length === 0 ? (
                <p className={styles.emptyColumn}>Sin candidatos en esta etapa.</p>
              ) : (
                <ul className={styles.cardList}>
                  {items.map((c) => (
                    <CandidateCard key={c.id} candidate={c} canMove={canRegister} canDecide={canDecide}
                      busy={movingId === c.id} onOpen={() => openFile(c)} onDecision={() => goDecision(c)}
                      onMove={(s) => void move(c, s)} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Candidatos" />
      <div className={styles.content}>
        <button type="button" className={styles.linkButton} onClick={backToVacancy}>Volver a la vacante</button>
        <h1 className={styles.title}>
          Candidatos{vacancyTitle ? ` · ${vacancyTitle}` : ''}
        </h1>
        <p className={styles.helper}>
          Tú decides cuándo avanza cada candidato. Aquí no hay puntajes ni selección automática.
        </p>

        <div aria-live="polite" role="status">
          {notice && <p className={styles.notice}>{notice}</p>}
        </div>
        {problem && <p className={styles.problem} role="alert">{problem}</p>}

        {state === 'READY' && (
          <div className={styles.toolbar}>
            <label className={styles.filter}>
              Etapa
              <select className={styles.select} value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as CandidateStage | '')}>
                <option value="">Todas las etapas</option>
                {CANDIDATE_STAGES.map((s) => (
                  <option key={s} value={s}>{CANDIDATE_STAGE_LABEL[s]}</option>
                ))}
              </select>
            </label>
            {canRegister && (
              <button type="button" className={styles.primaryButton} onClick={() => { setCreateError(null); setCreating(true); }}>
                Crear candidato
              </button>
            )}
          </div>
        )}

        {renderBody()}
      </div>

      {creating && (
        <NewCandidateDialog busy={createBusy} error={createError} onSubmit={(i) => void create(i)}
          onCancel={() => setCreating(false)} />
      )}
    </main>
  );
}
