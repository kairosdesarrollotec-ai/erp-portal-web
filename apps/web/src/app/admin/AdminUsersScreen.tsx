import { useState } from 'react';
import { useAdminUsers } from './useAdminUsers';
import { WORKER_ROLE_LABELS, WorkerRole } from '../dashboard/worker-role';
import styles from './AdminUsersScreen.module.css';

const ASSIGNABLE_ROLES = Object.keys(WORKER_ROLE_LABELS) as WorkerRole[];

/**
 * ADM-01 - Usuarios y asignaciones. Fuente: PANTALLAS-V2-B-SOPORTE.md.
 * Estados: READY, LOADING, EMPTY (contrato punto 9). Reutiliza
 * user_company_assignments (misma tabla de TR-05) via GET /admin/users.
 *
 * Alcance real: si el correo no existe en Firebase, el backend crea la
 * cuenta y devuelve un passwordResetLink que se muestra al administrador
 * para que lo comparta con el usuario. El usuario usa ese enlace para
 * establecer su contrasena y luego completa el enrolamiento MFA en TR-02.
 */
export function AdminUsersScreen() {
  const { state, users, context, assigning, assignError, lastPasswordResetLink, deactivatingId, actionError, assign, deactivate } =
    useAdminUsers();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [targetRole, setTargetRole] = useState<WorkerRole>('FRONT_OFFICE');
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleAssign() {
    if (!context) return;
    const ok = await assign({
      targetEmail,
      targetCompanyId: context.companyId,
      targetBranchId: context.branchId,
      targetRole,
    });
    if (ok) {
      setTargetEmail('');
      setTargetRole('FRONT_OFFICE');
      setShowAssignForm(false);
      setCopiedLink(false);
    }
  }

  async function handleCopyLink(link: string) {
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
  }

  async function handleDeactivate(assignmentId: string) {
    await deactivate(assignmentId);
    setConfirmingId(null);
  }

  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.brand}>Kairos Corporation</span>
        <h1 className={styles.title}>Usuarios y asignaciones</h1>
        {context && !showAssignForm && (
          <button type="button" className={styles.primaryButton} onClick={() => setShowAssignForm(true)}>
            Agregar usuario
          </button>
        )}
      </header>

      <div className={styles.content}>
        {showAssignForm && (
          <section className={styles.assignForm}>
            <p className={styles.helperNote}>
              Si el correo no existe, se crea la cuenta automáticamente y se genera un enlace de acceso para compartir con el usuario.
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
                disabled={assigning || !targetEmail}
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

        {lastPasswordResetLink && (
          <section className={styles.resetLinkBox}>
            <p className={styles.resetLinkTitle}>Usuario creado — enlace de primer acceso</p>
            <p className={styles.resetLinkNote}>
              Compartí este enlace con el usuario para que establezca su contraseña. Expira según la política de Firebase
              (1 hora por defecto).
            </p>
            <div className={styles.resetLinkRow}>
              <code className={styles.resetLinkCode}>{lastPasswordResetLink}</code>
              <button
                type="button"
                className={styles.copyButton}
                onClick={() => void handleCopyLink(lastPasswordResetLink)}
              >
                {copiedLink ? 'Copiado' : 'Copiar'}
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
        )}
      </div>
    </main>
  );
}
