import { Link } from 'react-router-dom';
import { useModuleHub } from './useModuleHub';
import { AppHeader } from '../shared/AppHeader';
import { MODULE_ITEMS } from './module-definitions';
import { isModuleVisible } from './module-visibility';
import { usePermissions } from '../shared/usePermissions';
import styles from './ModuleHubScreen.module.css';

/**
 * TR-11 — Hub de módulos de navegación (HU-25).
 *
 * Baselines aprobados PROVISIONALMENTE (23-sep-2026):
 *   PROTO-TR-11-MENU-MODULOS       (desktop, 1600×1000)
 *   PROTO-TR-11-MENU-MODULOS-MOVIL (mobile,  390×844)
 *
 * MISSING_SOURCE registrado: PANTALLAS-V3-B-TRANSVERSAL.md no existe en
 * el repo; TR-11 no tiene entradas en BDD/SDD/TDD. Ver:
 *   docs/conflicts/MISSING_TR11_UXUI_CONTRACT.md
 *   docs/decision-log.md fila PROV-TR-11-001
 *
 * La visibilidad de cada modulo se decide por PERMISOS (GET /me/permissions,
 * ver module-visibility.ts), no por rol.
 */
export function ModuleHubScreen() {
  const { state, role } = useModuleHub();
  const { can } = usePermissions();

  const visibleModules = MODULE_ITEMS.filter((m) => isModuleVisible(m, can));

  return (
    <main className={styles.wrapper}>
      <AppHeader role={role} />

      <div className={styles.content}>
        {state === 'LOADING' && <p className={styles.loadingText}>Cargando módulos…</p>}

        {state === 'UNRESOLVED' && (
          <p className={styles.errorText}>
            No pudimos determinar tu contexto de trabajo. Vuelve a iniciar sesión.
          </p>
        )}

        {state === 'READY' && (
          <>
            <div className={styles.pageHeader}>
              <div>
                <p className={styles.pageLabel}>Centro de Operaciones ERP</p>
                <h1 className={styles.pageTitle}>Módulos del Sistema</h1>
                <p className={styles.pageSubtitle}>
                  Acceso a la gestión integral de operaciones y administración.
                </p>
              </div>
            </div>

            <ul className={styles.grid} role="list" aria-label="Módulos del sistema">
              {visibleModules.map((mod) => (
                <li key={mod.id}>
                  {mod.path ? (
                    <Link to={mod.path} className={styles.card} aria-label={mod.label}>
                      <span className={styles.cardIcon} aria-hidden="true">
                        {mod.icon}
                      </span>
                      <span className={styles.cardLabel}>{mod.label}</span>
                      <span className={styles.cardDescription}>{mod.description}</span>
                    </Link>
                  ) : (
                    <div
                      className={`${styles.card} ${styles.cardDisabled}`}
                      aria-disabled="true"
                      role="img"
                      aria-label={`${mod.label} — próximamente`}
                    >
                      <span className={styles.cardIcon} aria-hidden="true">
                        {mod.icon}
                      </span>
                      <span className={styles.cardLabel}>{mod.label}</span>
                      <span className={styles.cardDescription}>{mod.description}</span>
                      <span className={styles.comingSoonBadge}>Próximamente</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
