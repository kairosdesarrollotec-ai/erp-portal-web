import { useState } from 'react';
import type { AdminRole } from './roles-client';
import { isReadOnlyRole } from './useRolePermissionMatrix';
import type { useRoleManagement } from './useRoleManagement';
import styles from './RolePermissionMatrixScreen.module.css';

type RoleManagement = ReturnType<typeof useRoleManagement>;

interface RoleManagementPanelProps {
  roles: AdminRole[];
  management: RoleManagement;
}

const NAME_MAX = 60;

/**
 * ADM-02 - gestion de roles dinamicos: crear (nace sin permisos), renombrar en
 * linea y desactivar con confirmacion. Los errores del back (nombre duplicado o
 * invalido, version desactualizada, rol con usuarios, ultimo administrador) se
 * muestran en lenguaje claro junto al campo o a la lista.
 */
export function RoleManagementPanel({ roles, management }: RoleManagementPanelProps) {
  const { busy, createError, renameError, roleError, notice, create, rename, deactivate, clearMessages } = management;
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (await create(newName)) setNewName('');
  }

  function startRename(role: AdminRole) {
    clearMessages();
    setConfirmingId(null);
    setRenamingId(role.id);
    setRenameValue(role.name);
  }

  async function handleRename(role: AdminRole) {
    if (await rename(role, renameValue)) setRenamingId(null);
    // Con VERSION_CONFLICT la lista se recarga: se cierra la edicion para no
    // volver a enviar con la version vieja.
    else setRenamingId((current) => (management.renameError?.roleId === role.id ? current : null));
  }

  async function handleDeactivate(role: AdminRole) {
    await deactivate(role);
    setConfirmingId(null);
  }

  return (
    <section className={styles.rolesPanel} aria-labelledby="roles-panel-title">
      <h2 id="roles-panel-title" className={styles.sectionTitle}>
        Roles
      </h2>
      <p className={styles.scopeNote}>
        Los roles son dinámicos: puedes crear nuevos, renombrarlos y desactivarlos. Un rol nuevo nace sin permisos;
        actívalos en la matriz de abajo. El Administrador de Plataforma es fijo.
      </p>

      <form className={styles.createRoleForm} onSubmit={(e) => void handleCreate(e)} noValidate>
        <label className={styles.fieldLabel} htmlFor="new-role-name">
          Nombre del nuevo rol
        </label>
        <div className={styles.inlineRow}>
          <input
            id="new-role-name"
            className={`${styles.textInput} ${createError ? styles.inputInvalid : ''}`}
            value={newName}
            maxLength={NAME_MAX}
            onChange={(e) => setNewName(e.target.value)}
            aria-invalid={createError ? true : undefined}
            aria-describedby={createError ? 'new-role-name-error' : undefined}
            placeholder="Ej. Supervisor de flota"
          />
          <button type="submit" className={styles.primaryButton} disabled={busy || newName.trim().length === 0}>
            Crear rol
          </button>
        </div>
        {createError && (
          <p id="new-role-name-error" role="alert" className={styles.errorText}>
            {createError}
          </p>
        )}
      </form>

      {notice && (
        <p role="status" className={styles.noticeText}>
          {notice}
        </p>
      )}
      {roleError && (
        <p role="alert" className={styles.errorText}>
          {roleError}
        </p>
      )}

      <ul className={styles.roleList} aria-label="Roles de la organización">
        {roles.map((role) => {
          const fixed = isReadOnlyRole(role);
          const renaming = renamingId === role.id;
          const confirming = confirmingId === role.id;
          const errorHere = renameError?.roleId === role.id ? renameError.message : null;
          return (
            <li key={role.id} className={styles.roleItem}>
              {renaming ? (
                <div className={styles.roleEdit}>
                  <input
                    className={`${styles.textInput} ${errorHere ? styles.inputInvalid : ''}`}
                    value={renameValue}
                    maxLength={NAME_MAX}
                    onChange={(e) => setRenameValue(e.target.value)}
                    aria-label={`Nuevo nombre del rol ${role.name}`}
                    aria-invalid={errorHere ? true : undefined}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setRenamingId(null);
                      if (e.key === 'Enter' && renameValue.trim().length > 0 && !busy) void handleRename(role);
                    }}
                  />
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={busy || renameValue.trim().length === 0}
                    onClick={() => void handleRename(role)}
                  >
                    Guardar nombre
                  </button>
                  <button type="button" className={styles.linkButton} onClick={() => setRenamingId(null)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <span className={styles.roleName}>
                  {role.name}
                  {role.isSystem && <span className={styles.roleTag}>Sistema</span>}
                  {fixed && <span className={styles.roleTag}>Fijo</span>}
                  <span className={styles.roleMeta}>
                    {role.assignmentCount} {role.assignmentCount === 1 ? 'usuario' : 'usuarios'}
                  </span>
                </span>
              )}

              {errorHere && (
                <p role="alert" className={styles.errorText}>
                  {errorHere}
                </p>
              )}

              {!renaming && !fixed && (
                <span className={styles.roleActions}>
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => startRename(role)}
                    aria-label={`Renombrar rol ${role.name}`}
                  >
                    Renombrar
                  </button>
                  {confirming ? (
                    <span className={styles.confirmGroup}>
                      <button
                        type="button"
                        className={styles.dangerButton}
                        disabled={busy}
                        onClick={() => void handleDeactivate(role)}
                        aria-label={`Confirmar desactivación del rol ${role.name}`}
                      >
                        Confirmar desactivación
                      </button>
                      <button type="button" className={styles.linkButton} onClick={() => setConfirmingId(null)}>
                        Volver
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.dangerLink}
                      onClick={() => {
                        clearMessages();
                        setRenamingId(null);
                        setConfirmingId(role.id);
                      }}
                      aria-label={`Desactivar rol ${role.name}`}
                    >
                      Desactivar
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
