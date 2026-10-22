import { useState } from 'react';
import {
  CANDIDATE_DECISION_LABEL,
  CANDIDATE_STAGE_LABEL,
  PROCESS_STATE_LABEL,
  nextStages,
  type CandidateStage,
} from './recruitment-domain';
import type { CandidateResponse } from './recruitment-client';
import styles from './CandidatesBoardScreen.module.css';

interface Props {
  candidate: CandidateResponse;
  canMove: boolean;
  canDecide: boolean;
  busy: boolean;
  onOpen: () => void;
  onDecision: () => void;
  onMove: (stage: CandidateStage) => void;
}

/** Tarjeta del tablero: sin puntaje; mover de etapa es una accion manual por menu (sin arrastrar). */
export function CandidateCard({ candidate, canMove, canDecide, busy, onOpen, onDecision, onMove }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const decided = Boolean(candidate.decision);
  const targets = nextStages(candidate.stage);
  const showMove = canMove && !decided && targets.length > 0;
  const menuId = `move-${candidate.id}`;

  return (
    <li className={styles.card}>
      <p className={styles.cardName}>{candidate.fullName}</p>
      {candidate.documentNumber && (
        <p className={styles.cardMeta}>
          {candidate.documentType} {candidate.documentNumber}
        </p>
      )}
      <p className={styles.cardMeta}>{PROCESS_STATE_LABEL[candidate.processState]}</p>
      {decided && candidate.decision && (
        <p className={styles.decisionBadge}>{CANDIDATE_DECISION_LABEL[candidate.decision]}</p>
      )}
      <div className={styles.cardActions}>
        <button type="button" className={styles.linkButton} onClick={onOpen} aria-label={`Abrir ficha de ${candidate.fullName}`}>
          Abrir
        </button>
        {canDecide && !decided && candidate.stage === 'DECISION' && (
          <button type="button" className={styles.linkButton} onClick={onDecision}
            aria-label={`Ir a decisión de ${candidate.fullName}`}>
            Ir a decisión
          </button>
        )}
        {showMove && (
          <button type="button" className={styles.moveButton} aria-expanded={menuOpen} aria-controls={menuId}
            aria-label={`Mover a… ${candidate.fullName}`} disabled={busy} onClick={() => setMenuOpen((v) => !v)}>
            Mover a…
          </button>
        )}
      </div>
      {showMove && menuOpen && (
        <ul id={menuId} className={styles.moveMenu} aria-label={`Etapas disponibles para ${candidate.fullName}`}>
          {targets.map((stage) => (
            <li key={stage}>
              <button type="button" className={styles.moveOption} disabled={busy}
                onClick={() => { setMenuOpen(false); onMove(stage); }}>
                {CANDIDATE_STAGE_LABEL[stage]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
