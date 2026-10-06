import { useState } from 'react';
import { useAdminUsers } from './useAdminUsers';
import { AppHeader } from '../shared/AppHeader';
import styles from './AdminUsersScreen.module.css';

/**
 * ADM-01 - Usuarios y asignaciones. Fuente: PANTALLAS-V2-B-SOPORTE.md.
 * Los roles son dinamicos (ADM-02): el selector se alimenta de GET /admin/roles
 * (solo activos) y se asigna por `targetRoleId`; la tabla muestra `role.name`.
 * Estados: READY, LOADING, EMPTY (contrato punto 9). Reutiliza
 * user_company_assignments (misma tabla de TR-05) via GET /admin/users.
 *
 * El administrador define una contraseña inicial al crear el usuario.
 * Al primer login, TR-02 redirige al usuario a /activar-cuenta donde debe
 * cambiar la contraseña obligatoriamente y enrolar MFA.
 */
export function AdminUsersScreen() {
  const { state, users, context, companies, roles, rolesError, assigning, assignError, deactivatingId, actionError, assign, deactivate } =
    useAdminUsers();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [initialPassword, setInitialPassword] = useState('');

  // Empresa/sede seleccionable: usa la lista del grupo cuando ya cargo, y
  // mientras tanto (o si falla) se degrada al contexto de trabajo actual
  // del admin, como hacia antes esta pantalla.
  const selectableCompanies =
    companies.length > 0
      ? companies
      : context
        ? [{ companyId: context.companyId, companyName: context.companyName, branches: [{ branchId: context.branchId, branchName: context.branchName }] }]
        : [];

  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => {
    return context ? [`${context.companyId}::${context.branchId}`] : [];
  });

  function handleOpenAssignForm() {
    if (context && selectedKeys.length === 0) {
      setSelectedKeys([`${context.companyId}::${context.branchId}`]);
    }
    setShowAssignForm(true);
  }

  function toggleBranch(companyId: string, branchId: string) {
    const key = `${companyId}::${branchId}`;
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function toggleAllCompanyBranches(company: (typeof selectableCompanies)[0]) {
    const branchKeys = company.branches.map((b) => `${company.companyId}::${b.branchId}`);
    const allSelected = branchKeys.length > 0 && branchKeys.every((k) => selectedKeys.includes(k));
    setSelectedKeys((prev) => {
      if (allSelected) {
        return prev.filter((k) => !branchKeys.includes(k));
      } else {
        const toAdd = branchKeys.filter((k) => !prev.includes(k));
        return [...prev, ...toAdd];
      }
    });
  }

  async function handleAssign() {
    if (selectedKeys.length === 0 || !context) return;
    const targets = selectedKeys.map((k) => {
      const [targetCompanyId, targetBranchId] = k.split('::');
      return { targetCompanyId, targetBranchId };
    });
    const ok = await assign({
      targetEmail,
      targets,
      targetRoleId: targetRole,
      initialPassword: initialPassword.length > 0 ? initialPassword : undefined,
    });
    if (ok) {
      setTargetEmail('');
      setTargetRole('');
      setInitialPassword('');
      if (context) {
        setSelectedKeys([`${context.companyId}::${context.branchId}`]);
      }
      setShowAssignForm(false);
    }
  }

  async function handleDeactivate(assignmentId: string) {
    await deactivate(assignmentId);
    setConfirmingId(null);
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader
        pageTitle="Usuarios y asignaciones"
        actions={
          context && !showAssignForm ? (
            <button type="button" className={styles.primaryButton} onClick={handleOpenAssignForm}>
              Agregar usuario
            </button>
          ) : undefined
        }
      />

      <div className={styles.content}>
        {showAssignForm && (
          <section className={styles.assignForm}>
            <p className={styles.helperNote}>
              Se enviará un correo al usuario con estas credenciales. Al primer ingreso, el sistema lo obligará a cambiar la contraseña y enrolar su MFA.
            </p>
            {assignError && <p className={styles.errorText}>{assignError}</p>}
            <label className={styles.field}>
              <span>Correo del usuario</span>
              <input
                className={styles.input}
                type="email"
                value={targetEmail}
                onChange={(event) => setTargetEmail(event.target.value)}
                placeholder="usuario@veloxrent.pe"
              />
            </label>
            <div className={styles.field}>
              <span className={styles.selectorLabel}>Empresas y sedes asignadas (selecciona una o más)</span>
              <div className={styles.companiesSelector}>
                {selectableCompanies.map((company) => {
                  const branchKeys = company.branches.map((b) => `${company.companyId}::${b.branchId}`);
                  const allSelected = branchKeys.length > 0 && branchKeys.every((k) => selectedKeys.includes(k));
                  const someSelected = branchKeys.some((k) => selectedKeys.includes(k));

                  return (
                    <div key={company.companyId} className={styles.companyCard}>
                      <label className={styles.companyHeaderLabel}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected && !allSelected;
                          }}
                          onChange={() => toggleAllCompanyBranches(company)}
                          aria-label={`Seleccionar todas las sedes de ${company.companyName}`}
                        />
                        <span>{company.companyName}</span>
                      </label>
                      <div className={styles.branchesList}>
                        {company.branches.map((branch) => {
                          const key = `${company.companyId}::${branch.branchId}`;
                          const isChecked = selectedKeys.includes(key);
                          return (
                            <label key={branch.branchId} className={styles.branchLabel}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleBranch(company.companyId, branch.branchId)}
                                aria-label={`${company.companyName} - ${branch.branchName}`}
                              />
                              <span>{branch.branchName}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <label className={styles.field}>
              <span>Contraseña inicial (solo si el correo es nuevo, mínimo 8 caracteres)</span>
              <input
                className={styles.input}
                type="password"
                value={initialPassword}
                onChange={(event) => setInitialPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
            </label>
            <label className={styles.field}>
              <span>Rol</span>
              <select
                className={styles.input}
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
              >
                <option value="">Selecciona un rol</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            {rolesError && (
              <p className={styles.errorText}>No pudimos cargar los roles disponibles. Recarga la pantalla para intentar de nuevo.</p>
            )}
            <p className={styles.helperNote}>
              Deja la contraseña en blanco si el correo ya tiene una cuenta en KAIROS: se reutilizara y solo se le
              agregara la nueva empresa/sede/rol.
            </p>
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={
                  assigning ||
                  !targetEmail ||
                  !targetRole ||
                  selectedKeys.length === 0 ||
                  (initialPassword.length > 0 && initialPassword.length < 8)
                }
                onClick={() => void handleAssign()}
              >
                {assigning ? 'Agregando…' : 'Agregar usuario'}
              </button>
              <button type="button" className={styles.linkButton} onClick={() => setShowAssignForm(false)}>
                Cancelar
              </button>
            </div>
          </section>
        )}

        {actionError && <p className={styles.errorText}>{actionError}</p>}

        {state === 'LOADING' && <p className={styles.statusText}>Cargando usuarios…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>No pudimos cargar la bandeja de usuarios. Intenta de nuevo en unos segundos.</p>
        )}

        {state === 'EMPTY' && <p className={styles.statusText}>Todavía no hay usuarios asignados a esta organización.</p>}

        {state === 'READY' && (
          <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Correo</th>
                <th>Empresa/Sede</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>MFA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={styles.row}>
                  <td>{user.email ?? user.firebaseUid}</td>
                  <td>
                    {user.companyName} — {user.branchName}
                  </td>
                  <td>{user.role.name}</td>
                  <td>
                    <span className={`${styles.badge} ${user.active ? styles.badgeActive : styles.badgeInactive}`}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{user.mfaEnrolled ? '✓' : '—'}</td>
                  <td>
                    {user.active &&
                      (confirmingId === user.id ? (
                        <span className={styles.confirmGroup}>
                          <button
                            type="button"
                            className={styles.dangerButton}
                            disabled={deactivatingId === user.id}
                            onClick={() => void handleDeactivate(user.id)}
                          >
                            {deactivatingId === user.id ? 'Dando de baja…' : 'Confirmar baja'}
                          </button>
                          <button type="button" className={styles.linkButton} onClick={() => setConfirmingId(null)}>
                            Volver
                          </button>
                        </span>
                      ) : (
                        <button type="button" className={styles.dangerLink} onClick={() => setConfirmingId(user.id)}>
                          Dar de baja
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </main>
  );
}
