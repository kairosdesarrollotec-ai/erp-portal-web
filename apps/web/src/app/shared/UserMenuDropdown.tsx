import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, Clock, LogOut } from 'lucide-react';
import { getFirebaseAuth } from '../providers/firebase';
import { useWorkSession } from './useWorkSession';
import { useSignOut } from './useSignOut';
import type { RoleRef } from './role-ref';
import styles from './UserMenuDropdown.module.css';

interface NavState {
  companyName?: string;
  branchName?: string;
}

interface UserMenuDropdownProps {
  role?: RoleRef | null;
}

/** Formatea milisegundos restantes en "Xh Ymin restantes" o "< 1 min restante". */
function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Sesión expirada';
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return '< 1 min restante';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min restantes`;
  if (minutes === 0) return `${hours}h restantes`;
  return `${hours}h ${minutes}min restantes`;
}

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas (TDD-00 §8.4)

export function UserMenuDropdown({ role }: UserMenuDropdownProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyName, branchName } = (location.state ?? {}) as NavState;

  const sessionRole = useWorkSession((s) => s.role);
  const roleLabel = (role ?? sessionRole)?.name ?? null;
  const handleSignOut = useSignOut();

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  const email = user?.email ?? '';
  const displayName = user?.displayName || email.split('@')[0] || '—';
  const initial = displayName.charAt(0).toUpperCase();

  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Calcula tiempo restante de sesión
  useEffect(() => {
    const lastSignIn = user?.metadata?.lastSignInTime
      ? new Date(user.metadata.lastSignInTime).getTime()
      : null;

    function tick() {
      if (!lastSignIn) { setRemaining('Sesión activa'); return; }
      const ms = SESSION_DURATION_MS - (Date.now() - lastSignIn);
      setRemaining(formatRemaining(ms));
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [user]);

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Cierra al presionar Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const branchLabel =
    companyName && branchName ? `${companyName} — ${branchName}` : companyName || branchName || null;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerActive : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Menú de perfil y sesión"
        title={email}
      >
        <span className={styles.avatar}>{initial}</span>
      </button>

      {open && (
        <div
          className={styles.dropdown}
          role="menu"
          aria-label="Perfil y sesión"
        >
          {/* Triángulo decorativo */}
          <div className={styles.arrow} aria-hidden="true" />

          {/* Identidad del usuario */}
          <div className={styles.identity}>
            <div className={styles.avatarLarge}>{initial}</div>
            <div className={styles.identityInfo}>
              <span className={styles.displayName}>{displayName}</span>
              {roleLabel && (
                <span className={styles.roleBadge}>{roleLabel}</span>
              )}
            </div>
          </div>

          {/* Empresa y sede */}
          {branchLabel && (
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Empresa y sede activa:</span>
              <div className={styles.branchRow}>
                <Building2 size={13} className={styles.branchIcon} aria-hidden="true" />
                <span className={styles.branchText}>{branchLabel}</span>
              </div>
              <button
                type="button"
                className={styles.changeBranch}
                onClick={() => {
                  setOpen(false);
                  navigate('/seleccion-empresa-sede', { state: location.state });
                }}
              >
                <span>Cambiar empresa/sede</span>
                <ChevronRight size={11} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Tiempo de sesión */}
          {remaining && (
            <div className={styles.sessionRow}>
              <Clock size={13} className={styles.sessionIcon} aria-hidden="true" />
              <span className={styles.sessionText}>
                Sesión activa:{' '}
                <strong className={styles.sessionValue}>{remaining}</strong>
              </span>
            </div>
          )}

          <div className={styles.divider} role="separator" />

          {/* Botón cerrar sesión */}
          <div className={styles.actions}>
            <button
              type="button"
              role="menuitem"
              className={styles.signOutButton}
              onClick={() => {
                setOpen(false);
                void handleSignOut();
              }}
            >
              <LogOut size={15} aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
