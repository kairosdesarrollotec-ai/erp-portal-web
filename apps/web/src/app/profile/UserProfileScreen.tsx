import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react';
import { AppHeader } from '../shared/AppHeader';
import { LogoutConfirmModal } from '../shared/LogoutConfirmModal';
import { getLocalDraftCount, refreshLocalDraftCount } from '../shared/local-drafts';
import { sessionRemainingLabel } from '../shared/session-time';
import { useSignOut } from '../shared/useSignOut';
import { useWorkSession } from '../shared/useWorkSession';
import { useUserProfile } from './useUserProfile';
import styles from './UserProfileScreen.module.css';
import { formatLimaDateTime } from '../shared/lima-time';

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const formatted = formatLimaDateTime(dateStr);
  return formatted === '—' ? dateStr : formatted;
}

interface NavState {
  companyName?: string;
  branchName?: string;
}

/**
 * TR-09: Pantalla de perfil de usuario (`/perfil`, `/profile`), solo lectura.
 * Muestra identidad, contexto activo (empresa/sede/rol), seguridad (MFA, contraseña,
 * tiempo restante de sesión) y asignaciones. Acciones: Cerrar sesión (con confirmación
 * si hay borradores locales sin sincronizar) y Cambiar empresa/sede (TR-05).
 */
export function UserProfileScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, profile, error, reload } = useUserProfile();
  const sessionRole = useWorkSession((s) => s.role);
  const handleSignOut = useSignOut();
  const { companyName, branchName } = (location.state ?? {}) as NavState;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [pendingDraftCount, setPendingDraftCount] = useState(0);

  // Actualiza el conteo cacheado de borradores locales (Dexie). Es auxiliar: si falla,
  // el cierre de sesión sigue disponible sin aviso.
  useEffect(() => {
    void refreshLocalDraftCount().catch(() => undefined);
  }, []);

  const remaining = sessionRemainingLabel(profile?.lastSignInTime);

  function requestSignOut() {
    const count = getLocalDraftCount();
    if (count > 0) {
      setPendingDraftCount(count);
      setShowLogoutModal(true);
    } else {
      void handleSignOut();
    }
  }

  function goChangeContext() {
    navigate('/seleccion-empresa-sede', { state: location.state });
  }

  const shownName = profile?.displayName || profile?.email?.split('@')[0] || '—';
  const initial = (profile?.displayName || profile?.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Mi Perfil" />

      <div className={styles.content}>
        {/* Navegación y enlace de retorno */}
        <nav aria-label="Navegación de migas de pan" className={styles.breadcrumbNav}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate(-1)}
            aria-label="Volver a la página anterior"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Volver</span>
          </button>
          <span className={styles.breadcrumbSeparator} aria-hidden="true">
            /
          </span>
          <Link to="/tablero" className={styles.breadcrumbLink}>
            Inicio
          </Link>
          <span className={styles.breadcrumbSeparator} aria-hidden="true">
            /
          </span>
          <span className={styles.breadcrumbCurrent} aria-current="page">
            Mi Perfil
          </span>
        </nav>

        {/* Encabezado de la pantalla */}
        <div className={styles.titleSection}>
          <h1 className={styles.pageTitle}>Mi Perfil</h1>
          <p className={styles.pageSubtitle}>
            Información de identidad, credenciales de seguridad y sedes autorizadas.
          </p>
        </div>

        {/* Estado de carga */}
        {state === 'LOADING' && (
          <div className={styles.loadingContainer} role="status" aria-live="polite">
            <p className={styles.statusText}>Cargando información del perfil…</p>
          </div>
        )}

        {/* Estado de error irrecuperable */}
        {state === 'ERROR' && !profile && (
          <div className={styles.errorContainer} role="alert">
            <p className={styles.statusText}>{error ?? 'No se pudo cargar el perfil.'}</p>
            <button type="button" className={styles.retryButton} onClick={() => void reload()}>
              Reintentar
            </button>
          </div>
        )}

        {/* Contenido principal cuando hay datos */}
        {profile && (
          <>
            {/* 1. Tarjeta de Identidad */}
            <section className={styles.card} aria-labelledby="heading-identity">
              <div className={styles.cardHeader}>
                <User size={18} className={styles.cardIcon} aria-hidden="true" />
                <h2 id="heading-identity" className={styles.cardTitle}>
                  Identidad del Usuario
                </h2>
              </div>

              <div className={styles.identityBody}>
                <div className={styles.avatarLarge} aria-hidden="true">
                  {initial}
                </div>

                <div className={styles.identityDetails}>
                  <div>
                    <h3 className={styles.displayName}>{shownName}</h3>
                    <p className={styles.email}>{profile.email ?? '—'}</p>
                  </div>

                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>UID / ID de usuario</span>
                      <code className={styles.uidCode}>{profile.firebaseUid}</code>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Fecha de creación</span>
                      <span className={styles.metaValue}>
                        {formatDateTime(profile.creationTime)}
                      </span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Último inicio de sesión</span>
                      <span className={styles.metaValue}>
                        {formatDateTime(profile.lastSignInTime)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 1b. Contexto activo y acciones de sesión */}
            <section className={styles.card} aria-labelledby="heading-context">
              <div className={styles.cardHeader}>
                <Building2 size={18} className={styles.cardIcon} aria-hidden="true" />
                <h2 id="heading-context" className={styles.cardTitle}>
                  Contexto activo
                </h2>
              </div>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Empresa</span>
                  <span className={styles.metaValue}>{companyName ?? '—'}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Sede</span>
                  <span className={styles.metaValue}>{branchName ?? '—'}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Rol</span>
                  <span className={styles.metaValue}>{sessionRole?.name ?? '—'}</span>
                </div>
              </div>
              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={styles.changeContextButton}
                  onClick={goChangeContext}
                >
                  <span>Cambiar empresa/sede</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
                <button type="button" className={styles.signOutButton} onClick={requestSignOut}>
                  <LogOut size={14} aria-hidden="true" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </section>

            {/* 2. Tarjeta de Seguridad */}
            <section className={styles.card} aria-labelledby="heading-security">
              <div className={styles.cardHeader}>
                <ShieldCheck size={18} className={styles.cardIcon} aria-hidden="true" />
                <h2 id="heading-security" className={styles.cardTitle}>
                  Seguridad de la Cuenta
                </h2>
              </div>

              <div className={styles.securityGrid}>
                {/* MFA */}
                <div className={styles.securityItem}>
                  <div className={styles.securityInfo}>
                    <span className={styles.securityLabel}>Estado MFA</span>
                    <span className={styles.securityDescription}>
                      Autenticación multifactor con código de 6 dígitos
                    </span>
                  </div>
                  <div className={styles.securityValue}>
                    {profile.mfaEnrolled ? (
                      <span className={styles.badgeSuccess}>
                        <CheckCircle2 size={13} aria-hidden="true" />
                        Protegido con MFA
                      </span>
                    ) : (
                      <span className={styles.badgeWarning}>
                        <AlertTriangle size={13} aria-hidden="true" />
                        MFA no configurado
                      </span>
                    )}
                  </div>
                </div>

                {/* Contraseña */}
                <div className={styles.securityItem}>
                  <div className={styles.securityInfo}>
                    <span className={styles.securityLabel}>Contraseña</span>
                    <span className={styles.securityDescription}>
                      Estado de caducidad y cambio de credenciales
                    </span>
                  </div>
                  <div className={styles.securityValue}>
                    {profile.requiresPasswordChange ? (
                      <span className={styles.badgeWarning}>
                        <AlertTriangle size={13} aria-hidden="true" />
                        Requiere cambio
                      </span>
                    ) : (
                      <span className={styles.badgeSuccess}>
                        <CheckCircle2 size={13} aria-hidden="true" />
                        Al día
                      </span>
                    )}
                  </div>
                </div>

                {/* Duración de sesión */}
                <div className={styles.securityItem}>
                  <div className={styles.securityInfo}>
                    <span className={styles.securityLabel}>Tiempo restante de sesión</span>
                    <span className={styles.securityDescription}>
                      Calculado desde tu último inicio de sesión
                    </span>
                  </div>
                  <div className={styles.securityValue}>
                    <span className={styles.sessionDurationText}>
                      <Clock size={13} aria-hidden="true" />
                      {remaining ?? '—'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Tarjeta de Sedes autorizadas y Contexto */}
            <section className={styles.card} aria-labelledby="heading-assignments">
              <div className={styles.assignmentsHeader}>
                <div className={styles.cardHeader}>
                  <Building2 size={18} className={styles.cardIcon} aria-hidden="true" />
                  <h2 id="heading-assignments" className={styles.cardTitle}>
                    Contexto y Sedes autorizadas
                  </h2>
                </div>

              </div>

              {profile.assignments.length === 0 ? (
                <p className={styles.emptyAssignments}>
                  No tienes empresas o sedes asignadas actualmente.
                </p>
              ) : (
                <div className={styles.assignmentsList}>
                  {profile.assignments.map((assignment) => (
                    <div
                      key={`${assignment.companyId}-${assignment.branchId}`}
                      className={styles.assignmentItem}
                    >
                      <div className={styles.assignmentMain}>
                        <div className={styles.assignmentIconWrapper}>
                          <Building2 size={20} className={styles.buildingIcon} aria-hidden="true" />
                        </div>
                        <div className={styles.assignmentText}>
                          <span className={styles.companyName}>
                            {assignment.companyName}
                          </span>
                          <span className={styles.branchName}>
                            {assignment.branchName}
                          </span>
                        </div>
                      </div>

                      <div className={styles.assignmentRoleWrapper}>
                        <span
                          className={styles.roleBadge}
                          title={assignment.role.name}
                        >
                          {assignment.role.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <LogoutConfirmModal
        open={showLogoutModal}
        draftCount={pendingDraftCount}
        onConfirm={() => {
          setShowLogoutModal(false);
          void handleSignOut();
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </main>
  );
}
