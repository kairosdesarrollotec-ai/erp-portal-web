import { useRolePermissionMatrix } from './useRolePermissionMatrix';
import { AppHeader } from '../shared/AppHeader';
import styles from './RolePermissionMatrixScreen.module.css';

function actionKey(module: string, action: string): string {
  return `${module}.${action}`;
}

/**
 * ADM-02 - Roles y permisos. Fuente: PANTALLAS-V2-B-SOPORTE.md.
 *
 * Responsive (contrato punto 12): "Solo desktop — la matriz es
 * demasiado densa para móvil, se indica explícitamente" - banner fijo
 * arriba y la tabla se oculta bajo 900px (CSS), reemplazada por el
 * mismo aviso.
 *
 * Segregación de funciones (punto 8, criterio de aceptación punto 14):
 * si al marcar 2 celdas quedan en una combinación incompatible para el
 * mismo rol, esas celdas quedan con borde rojo + tooltip explicando el
 * conflicto - el backend es quien realmente bloquea el guardado
 * (409 INCOMPATIBLE_PERMISSIONS), esto es solo feedback inmediato.
 *
 * ALCANCE REAL (no sobre-declarado):
 * 1) Esta matriz es hoy de visualización/auditoría - todavía NO
 *    reemplaza el enforcement real de los `*-role-policy.ts` en cada
 *    handler del backend (ver nota en role-permission-matrix.port.ts).
 * 2) El contrato pide (punto 10) "guardar cambios de permisos requiere
 *    MFA reciente" - no implementado: el codebase no tiene un
 *    mecanismo de step-up/re-challenge de MFA (solo el estado de
 *    enrolamiento `mfaEnrolledAt`). Se documenta aquí en vez de
 *    simular una re-autenticación que no ocurre de verdad.
 */
export function RolePermissionMatrixScreen() {
  const { state, matrix, pendingEntries, dirty, conflicts, saving, saveError, toggle, save, discard } =
    useRolePermissionMatrix();

  const roles = matrix ? Array.from(new Set(matrix.entries.map((entry) => entry.role))) : [];

  async function handleSave() {
    await save();
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Roles y permisos" />

      <div className={styles.mobileNotice}>
        Esta pantalla requiere una tabla amplia, disponible solo en escritorio.
      </div>

      <div className={styles.content}>
        <p className={styles.scopeNote}>
          Esta matriz sirve hoy para visualizar y auditar los permisos vigentes - todavía no reemplaza las reglas de
          acceso reales que ya aplica el sistema en cada acción. Guardar cambios no re-solicita un segundo factor
          (MFA) porque ese mecanismo de re-autenticación aún no existe en el sistema.
        </p>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando matriz…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>No pudimos cargar la matriz de permisos. Intenta de nuevo en unos segundos.</p>
        )}

        {state === 'READY' && matrix && pendingEntries && (
          <>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Rol</th>
                    {matrix.actionCatalog.map((descriptor) => (
                      <th key={actionKey(descriptor.module, descriptor.action)}>{descriptor.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role}>
                      <td className={styles.roleCell}>{role}</td>
                      {matrix.actionCatalog.map((descriptor) => {
                        const key = actionKey(descriptor.module, descriptor.action);
                        const entry = pendingEntries.find(
                          (e) => e.role === role && e.module === descriptor.module && e.action === descriptor.action,
                        );
                        const hasConflict = conflicts.has(`${role}:${key}`);
                        return (
                          <td
                            key={key}
                            className={hasConflict ? styles.conflictCell : styles.cell}
                            title={
                              hasConflict
                                ? 'Este rol no puede tener ambos permisos a la vez (segregación de funciones).'
                                : undefined
                            }
                          >
                            <input
                              type="checkbox"
                              checked={entry?.allowed ?? false}
                              onChange={() => toggle(role, descriptor.module, descriptor.action)}
                              aria-label={`${role}: ${descriptor.label}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {saveError && <p className={styles.errorText}>{saveError}</p>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleSave}
                disabled={!dirty || saving || conflicts.size > 0}
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
              {dirty && (
                <button type="button" className={styles.linkButton} onClick={discard} disabled={saving}>
                  Descartar cambios
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
