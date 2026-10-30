import { forgetWorkContext } from '../auth/work-context-memory';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../providers/firebase';
import { useWorkSession } from './useWorkSession';
import { usePermissionsStore } from './usePermissions';
import { evaluateSession } from './session-timeout';

/** Ruta de destino al expirar: el login muestra el aviso (TR-10 SESSION_EXPIRED). */
export const SESSION_EXPIRED_PATH = '/?motivo=sesion-expirada';

const ACTIVITY_KEY = 'kairos.session.lastActivity';
const CHECK_INTERVAL_MS = 10_000;
const ACTIVITY_THROTTLE_MS = 1_000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

function readSharedActivity(): number | null {
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeSharedActivity(value: number | null): void {
  try {
    if (value === null) window.localStorage.removeItem(ACTIVITY_KEY);
    else window.localStorage.setItem(ACTIVITY_KEY, String(value));
  } catch {
    // Sin localStorage el control sigue funcionando por pestana.
  }
}

/**
 * SEC-F3 - cierra la sesion por inactividad (30 min; 15 min en Gerencia/Finanzas/RR.HH.)
 * o por duracion absoluta (8 h). Se monta una vez dentro de las rutas autenticadas.
 * La actividad se comparte entre pestanas via localStorage (si otra pestana esta
 * activa, esta no expira).
 */
export function useSessionTimeout(): void {
  const navigate = useNavigate();
  const role = useWorkSession((s) => s.role);
  // Ref: un cambio de rol no debe reiniciar el reloj de inactividad.
  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    let expired = false;
    let lastActivityAt = Date.now();
    let lastRecordedAt = 0;
    writeSharedActivity(lastActivityAt);

    function recordActivity() {
      const now = Date.now();
      if (now - lastRecordedAt < ACTIVITY_THROTTLE_MS) return;
      lastRecordedAt = now;
      lastActivityAt = now;
      writeSharedActivity(now);
    }

    async function expire() {
      if (expired) return;
      expired = true;
      writeSharedActivity(null);
      useWorkSession.getState().clearSession();
      usePermissionsStore.getState().reset();
      try {
        forgetWorkContext();
        await signOut(getFirebaseAuth());
      } catch {
        // Aun si signOut falla, se saca al usuario de las pantallas protegidas.
      } finally {
        navigate(SESSION_EXPIRED_PATH, { replace: true });
      }
    }

    function check() {
      if (expired) return;
      const lastSignIn = getFirebaseAuth().currentUser?.metadata?.lastSignInTime;
      const signedInAt = lastSignIn ? new Date(lastSignIn).getTime() : NaN;
      const status = evaluateSession({
        now: Date.now(),
        lastActivityAt: Math.max(lastActivityAt, readSharedActivity() ?? 0),
        signedInAt: Number.isNaN(signedInAt) ? null : signedInAt,
        role: roleRef.current,
      });
      if (status !== 'ACTIVE') void expire();
    }

    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, recordActivity, { passive: true });
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, recordActivity);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [navigate]);
}
