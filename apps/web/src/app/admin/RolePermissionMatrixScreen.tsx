import { isReadOnlyRole, ORGANIZATION_SCOPE, useRolePermissionMatrix } from './useRolePermissionMatrix';
import { useRoleManagement } from './useRoleManagement';
import { RoleManagementPanel } from './RoleManagementPanel';
import { AppHeader } from '../shared/AppHeader';
import type { MatrixScope } from './permissions-client';
import styles from './RolePermissionMatrixScreen.module.css';

function actionKey(module: string, action: string): string {
  return `${module}.${action}`;
}

const ORGANIZATION_VALUE = 'org';

function scopeToValue(scope: MatrixScope): string {
  if (scope.companyId && scope.branchId) return `branch:${scope.companyId}:${scope.branchId}`;
  if (scope.companyId) return `company:${scope.companyId}`;
  return ORGANIZATION_VALUE;
}

function valueToScope(value: string): MatrixScope {
  const [kind, companyId, branchId] = value.split(':');
  if (kind === 'branch') return { companyId, branchId };
  if (kind === 'company') return { companyId, branchId: null };
  return ORGANIZATION_SCOPE;
}

/**
 * ADM-02 - Roles y permisos. Fuente: PANTALLAS-V2-B-SOPORTE.md.
 *
 * Roles dinamicos: las filas salen de GET /admin/roles (solo activos, incluye
 * roles nuevos sin permisos) y las entradas se identifican por `roleId`. El
 * rol PLATFORM_ADMIN es fijo: su fila es de solo lectura. Arriba hay un panel
 * para crear, renombrar y desactivar roles. Al guardar se puede elegir el
 * ambito de la nueva version (por defecto, toda la organizacion).
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
 * (409 INCOMPATIBLE_PERMISSION_COMBINATION), esto es solo feedback inmediato.
 *
 * ALCANCE REAL (no sobre-declarado):
 * 1) El contrato pide (punto 10) "guardar cambios de permisos requiere
 *    MFA reciente" - no implementado: el codebase no tiene un
 *    mecanismo de step-up/re-challenge de MFA (solo el estado de
 *    enrolamiento `mfaEnrolledAt`). Se documenta aquí en vez de
 *    simular una re-autenticación que no ocurre de verdad. Lo mismo aplica
 *    a crear/renombrar/desactivar roles.
 */
export function RolePermissionMatrixScreen() {
  const {
    state, matrix, roles, pendingEntries, context, dirty, conflicts, saving, saveError,
    companies, scope, setScope, toggle, save, discard, reloadRoles,
  } = useRolePermissionMatrix();
  const management = useRoleManagement(context, reloadRoles);

  async function handleSave() {
    await save();
  }

  const currentScopeLabel = matrix?.scope?.branchId
    ? 'una sede'
    : matrix?.scope?.companyId
      ? 'una empresa'
      : 'toda la organización';

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Roles y permisos" />

      <div className={styles.mobileNotice}>
        Esta pantalla requiere una tabla amplia, disponible solo en escritorio.
      </div>

      <div className={styles.content}>
        <p className={styles.scopeNote}>
          Aquí se administran los roles y los permisos que el sistema usa para autorizar cada acción. Guardar cambios no
          re-solicita un segundo factor (MFA) porque ese mecanismo de re-autenticación aún no existe en el sistema.
        </p>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando matriz…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>No pudimos cargar la matriz de permisos. Intenta de nuevo en unos segundos.</p>
        )}

        {state === 'READY' && matrix && (
          <>
            <RoleManagementPanel roles={roles} management={management} />

            <section aria-labelledby="matrix-title" className={styles.matrixSection}>
              <h2 id="matrix-title" className={styles.sectionTitle}>
                Matriz de permisos
              </h2>
              <p className={styles.versionNote}>
                Versión vigente: {matrix.version} (aplica a {currentScopeLabel}).
              </p>

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
                    {roles.map((role) => {
                      const readOnly = isReadOnlyRole(role);
                      return (
                        <tr key={role.id}>
                          <td className={styles.roleCell}>
                            {role.name}
                            {readOnly && <span className={styles.roleTag}>Solo lectura</span>}
                          </td>
                          {matrix.actionCatalog.map((descriptor) => {
                            const key = actionKey(descriptor.module, descriptor.action);
                            const entry = pendingEntries.find(
                              (e) => e.roleId === role.id && e.module === descriptor.module && e.action === descriptor.action,
                            );
                            const hasConflict = conflicts.has(`${role.id}:${key}`);
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
                                  disabled={readOnly}
                                  onChange={() => toggle(role.id, descriptor.module, descriptor.action)}
                                  aria-label={`${role.name}: ${descriptor.label}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.scopeSelector}>
                <label className={styles.fieldLabel} htmlFor="matrix-scope">
                  Ámbito de la nueva versión
                </label>
                <select
                  id="matrix-scope"
                  className={styles.textInput}
                  value={scopeToValue(scope)}
                  onChange={(e) => setScope(valueToScope(e.target.value))}
                  disabled={saving}
                >
                  <option value={ORGANIZATION_VALUE}>Toda la organización</option>
                  {companies.map((company) => (
                    <optgroup key={company.companyId} label={company.companyName}>
                      <option value={`company:${company.companyId}`}>Toda la empresa {company.companyName}</option>
                      {company.branches.map((branch) => (
                        <option key={branch.branchId} value={`branch:${company.companyId}:${branch.branchId}`}>
                          Solo la sede {branch.branchName}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {conflicts.size > 0 && (
                <p role="alert" className={styles.errorText}>
                  Hay permisos incompatibles marcados en rojo (segregación de funciones). Corrígelos para poder guardar.
                </p>
              )}
              {saveError && (
                <p role="alert" className={styles.errorText}>
                  {saveError}
                </p>
              )}

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
            </section>
          </>
        )}
      </div>
    </main>
  );
}
