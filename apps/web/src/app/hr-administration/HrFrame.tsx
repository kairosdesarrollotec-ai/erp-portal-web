import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import type { HrResourceState } from './useHrResource';
import type { HrWorkContext } from './useWorkContextForHr';
import styles from './HrFlow.module.css';

interface Props {
  pageTitle: string;
  /** Texto y destino del enlace de regreso. */
  back?: { label: string; to: string };
  context: HrWorkContext | null;
  state: HrResourceState;
  hasData: boolean;
  /** Que se esta cargando, para los mensajes ("la ficha", "la solicitud"...). */
  subject?: string;
  busy?: boolean;
  wide?: boolean;
  children: ReactNode;
}

/** Marco comun de las pantallas ADP: cabecera, regreso, titulo y estados de carga / error. */
export function HrFrame({ pageTitle, back, context, state, hasData, subject = 'la información', busy, wide, children }: Props) {
  const navigate = useNavigate();
  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Personal" />
      <div className={`${styles.content} ${wide ? styles.contentWide : ''}`} aria-busy={busy || state === 'LOADING'}>
        {back && (
          <button type="button" className={styles.backLink} onClick={() => navigate(back.to, { state: context ?? undefined })}>
            ← {back.label}
          </button>
        )}
        <h1 className={styles.title}>{pageTitle}</h1>
        <div aria-live="polite">{state === 'LOADING' && !hasData && <p className={styles.statusText}>Cargando {subject}…</p>}</div>
        {state === 'NOT_FOUND' && (
          <p className={styles.statusText} role="alert">
            No encontramos {subject} en tu empresa y sede.
          </p>
        )}
        {state === 'FORBIDDEN' && (
          <p className={styles.statusText} role="alert">
            No tienes permiso para ver {subject}.
          </p>
        )}
        {state === 'RECOVERABLE_ERROR' && !hasData && (
          <p className={styles.statusText} role="alert">
            No pudimos cargar {subject}. Intenta de nuevo en unos segundos.
          </p>
        )}
        {hasData && children}
      </div>
    </main>
  );
}
