import { ArrowRight, Building2, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { useWorkContext } from './useWorkContext';
import type { WorkContextAssignment } from './work-context-client';
import styles from './WorkContextScreen.module.css';

/**
 * TR-05 - ¿Donde vas a trabajar hoy? Fuente: PANTALLAS-V2-B-TRANSVERSAL.md,
 * prototipo aprobado PROTO-TR-05-SELECCION-EMPRESA-SEDE (READY, desktop,
 * PRODUCTO, 2026-09-14). Solo hay prototipo desktop aprobado - la version
 * mobile queda pendiente (decision del 16 sep 2026: se construye solo con
 * lo ya aprobado, se evalua mas adelante si hace falta el resto).
 *
 * NOTA: el prototipo usa el acento naranja anterior a la correccion WCAG
 * 2.2 AA del design system (#C6600A) - aqui se usa el token actual
 * --color-accent (#9E4C08, corregido 11 sep 2026 en colors.css) en su
 * lugar, para no reintroducir un color ya descartado por accesibilidad.
 *
 * NOTA (hallazgo de revision, PR #8): ni EMPTY ni RECOVERABLE_ERROR tienen
 * un prototipo aprobado propio (solo existe PROTO-TR-05-SELECCION-EMPRESA-SEDE
 * para el estado READY desktop) - ambos mensajes son deliberadamente
 * minimos/defensivos, no se presentan como UX final. Pendiente que
 * Producto apruebe sus propios prototipos (incluida la variante mobile).
 */
export function WorkContextScreen() {
  const { state, assignments, selectionError, selectContext, retry } = useWorkContext();
  const navigate = useNavigate();
  const isSelecting = state === 'SELECTING';

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
    navigate('/');
  }

  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.brand}>VeloxRent</span>
      </header>

      <div className={styles.content}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>¿Dónde vas a trabajar hoy?</h1>
          <p className={styles.subtitle}>Selecciona tu empresa y sede para ingresar al sistema</p>
        </div>

        {state === 'EMPTY' ? (
          <p className={styles.emptyMessage}>
            No tienes ninguna empresa o sede asignada todavía. Contacta a tu administrador.
          </p>
        ) : state === 'RECOVERABLE_ERROR' ? (
          <div role="alert" className={styles.emptyMessage}>
            <p>No pudimos cargar tus empresas y sedes asignadas por un problema de conexión.</p>
            <button type="button" className={styles.signOutLink} onClick={() => void retry()}>
              Reintentar
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {selectionError && (
              <p role="alert" className={styles.selectionError}>
                {selectionError}
              </p>
            )}
            {assignments.map((assignment) => (
              <WorkplaceCard
                key={`${assignment.companyId}-${assignment.branchId}`}
                assignment={assignment}
                disabled={isSelecting}
                onSelect={() => void selectContext(assignment)}
              />
            ))}
          </div>
        )}

        <div className={styles.signOutRow}>
          <button type="button" className={styles.signOutLink} onClick={() => void handleSignOut()}>
            <LogOut size={16} />
            Cerrar sesión / Usar otra cuenta
          </button>
        </div>
      </div>

      <footer className={styles.footer}>
        <span>VeloxRent © 2026 · Sistema de Gestión Interna</span>
      </footer>
    </main>
  );
}

function WorkplaceCard({
  assignment,
  disabled,
  onSelect,
}: {
  assignment: WorkContextAssignment;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.card}
      disabled={disabled}
      onClick={onSelect}
      aria-label={`Ingresar a ${assignment.companyName}, ${assignment.branchName}`}
    >
      <span className={styles.cardLeft}>
        <span className={styles.iconContainer}>
          <Building2 size={20} />
        </span>
        <span className={styles.cardText}>
          <span className={styles.companyName}>{assignment.companyName}</span>
          <span className={styles.branchName}>{assignment.branchName}</span>
        </span>
      </span>
      <span className={styles.arrowIndicator}>
        <ArrowRight size={20} />
      </span>
    </button>
  );
}
