import { useState } from 'react';
import { useAdminUsers } from './useAdminUsers';
import { WORKER_ROLE_LABELS, WorkerRole } from '../dashboard/worker-role';
import { AppHeader } from '../shared/AppHeader';
import styles from './AdminUsersScreen.module.css';

const ASSIGNABLE_ROLES = Object.keys(WORKER_ROLE_LABELS) as WorkerRole[];

/**
 * ADM-01 - Usuarios y asignaciones. Fuente: PANTALLAS-V2-B-SOPORTE.md.
 * Estados: READY, LOADING, EMPTY (contrato punto 9). Reutiliza
 * user_company_assignments (misma tabla de TR-05) via GET /admin/users.
 *
 * El administrador define una contraseña inicial al crear el usuario.
 * Al primer login, TR-02 redirige al usuario a /activar-cuenta donde debe
 * cambiar la contraseña obligatoriamente y enrolar MFA.
 */
export function AdminUsersScreen() {
  const { state, users, context, assigning, assignError, deactivatingId, actionError, assign, deactivate } =
    useAdminUsers();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [targetRole, setTargetRole] = useState<WorkerRole>('FRONT_OFFICE');
  const [initialPassword, setInitialPassword] = useState('');

  async function handleAssign() {
    if (!context) return;
    const ok = await assign({
      targetEmail,
      targetCompanyId: context.companyId,
      targetBranchId: context.branchId,
      targetRole,
      initialPassword,
    });
    if (ok) {
      setTargetEmail('');
      setTargetRole('FRONT_OFFICE');
      setInitialPassword('');
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
            <button type="button" className={styles.primaryButton} onClick={() => setShowAssignForm(true)}>
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
            <label className={styles.field}>
              <span>Contraseña inicial (mínimo 8 caracteres)</span>
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
                onChange={(event) => setTargetRole(event.target.value as WorkerRole)}
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {WORKER_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            <p className={styles.helperNote}>
              Empresa/sede: {context?.companyName} — {context?.branchName} (tu contexto actual).
            </p>
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={assigning || !targetEmail || initialPassword.length < 8}
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
                  <td>{WORKER_ROLE_LABELS[user.role]}</td>
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
