import { SESSION_DURATION_MS } from '../../app/shared/session-time';
import { decryptLocalPayload, encryptLocalPayload } from '../crypto/local-encryption';
import { getLocalCryptoUserId } from '../crypto/local-user';

/**
 * V-27 · SDD-KAIROS-TRANSVERSAL §17.1/§17.3/§17.4: los 2 checklists (entrega y recepción de devolución) funcionan sin
 * conexión y la sesión offline dura 8 h. Para poder recargar la página sin red se guarda, CIFRADO con la clave local del
 * usuario (AES-256-GCM, la misma de las colas offline), un "snapshot" de la última verificación hecha por el servidor:
 *  - cuándo se verificó la cuenta (vigencia 8 h),
 *  - el contexto empresa/sede, los permisos efectivos y el rol,
 *  - el último expediente abierto de cada checklist (devolución / alquiler).
 * NUNCA se guardan tokens, contraseñas ni datos de pago. Se borra al cerrar sesión, al vencer las 8 h o si el servidor
 * responde 401/403 (sesión revocada).
 */

const STORAGE_KEY = 'kairos.offline-session.v1';
const MAX_RESOURCES = 5;

export interface OfflineContext {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
}

export interface OfflinePermissions {
  contextKey: string;
  granted: string[];
  matrixVersion: number | null;
  role: unknown;
}

interface OfflineResource {
  savedAt: number;
  data: unknown;
}

export interface OfflineSnapshot {
  /** Último momento en que el SERVIDOR confirmó la cuenta (0 = nunca verificada). */
  verifiedAt: number;
  context?: OfflineContext;
  permissions?: OfflinePermissions;
  resources: Record<string, OfflineResource>;
}

interface StoredEnvelope {
  uid: string;
  payload: unknown;
}

/** ¿El error es de RED (el servidor no respondió)? Un 401/403/404/5xx con respuesta NO es fallo de red. */
export function isNetworkFailure(error: unknown): boolean {
  if (!error) return false;
  const e = error as { code?: unknown; status?: unknown };
  if (typeof e.status === 'number') return false;
  if (error instanceof TypeError) return true;
  if (e.code === 'auth/network-request-failed') return true;
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** ¿El servidor/Firebase indica que la sesión fue revocada o ya no es válida? (§17.3) */
export function isSessionRevoked(error: unknown): boolean {
  if (!error) return false;
  const e = error as { code?: unknown; status?: unknown };
  if (e.status === 401 || e.status === 403) return true;
  return e.code === 'auth/user-disabled' || e.code === 'auth/user-token-expired' || e.code === 'auth/id-token-revoked';
}

export function isSnapshotFresh(snapshot: OfflineSnapshot, now: number = Date.now()): boolean {
  return snapshot.verifiedAt > 0 && now - snapshot.verifiedAt < SESSION_DURATION_MS;
}

function currentUid(): string | null {
  try {
    return getLocalCryptoUserId();
  } catch {
    return null;
  }
}

function readEnvelope(): StoredEnvelope | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEnvelope;
    return parsed && typeof parsed.uid === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function clearOfflineSession(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sin almacenamiento disponible
  }
}

async function readRaw(): Promise<OfflineSnapshot | null> {
  const uid = currentUid();
  if (!uid) return null;
  const envelope = readEnvelope();
  if (!envelope || envelope.uid !== uid) return null;
  try {
    return await decryptLocalPayload<OfflineSnapshot>(uid, envelope.payload);
  } catch {
    return null;
  }
}

/** Snapshot vigente (verificado por el servidor hace menos de 8 h) del usuario actual; null si no hay o venció. */
export async function readOfflineSnapshot(): Promise<OfflineSnapshot | null> {
  const snapshot = await readRaw();
  if (!snapshot) return null;
  if (!isSnapshotFresh(snapshot)) {
    clearOfflineSession();
    return null;
  }
  return snapshot;
}

let queue: Promise<unknown> = Promise.resolve();

/** Modifica el snapshot en serie (evita pisarse entre escrituras concurrentes). Sin usuario autenticado no hace nada. */
function updateSnapshot(mutate: (current: OfflineSnapshot) => OfflineSnapshot): Promise<void> {
  const run = async () => {
    const uid = currentUid();
    if (!uid) return;
    try {
      const current = (await readRaw()) ?? { verifiedAt: 0, resources: {} };
      const next = mutate(current);
      const payload = await encryptLocalPayload(uid, next);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ uid, payload } satisfies StoredEnvelope));
    } catch {
      // el modo offline es una mejora: un fallo al guardar nunca bloquea la operación en línea
    }
  };
  const result = queue.then(run, run);
  queue = result;
  return result;
}

/** El SERVIDOR acaba de confirmar la cuenta: reinicia la ventana de 8 h. */
export function markSessionVerified(): Promise<void> {
  return updateSnapshot((s) => ({ ...s, verifiedAt: Date.now() }));
}

export function rememberContext(context: OfflineContext): Promise<void> {
  return updateSnapshot((s) => ({ ...s, context }));
}

export async function recallContext(): Promise<OfflineContext | null> {
  return (await readOfflineSnapshot())?.context ?? null;
}

export function rememberPermissions(permissions: OfflinePermissions): Promise<void> {
  return updateSnapshot((s) => ({ ...s, permissions }));
}

export async function recallPermissions(contextKey: string): Promise<OfflinePermissions | null> {
  const stored = (await readOfflineSnapshot())?.permissions;
  return stored && stored.contextKey === contextKey ? stored : null;
}

export function rememberResource(key: string, data: unknown): Promise<void> {
  return updateSnapshot((s) => {
    const resources = { ...s.resources, [key]: { savedAt: Date.now(), data } };
    const keys = Object.keys(resources).sort((a, b) => resources[b].savedAt - resources[a].savedAt);
    for (const old of keys.slice(MAX_RESOURCES)) delete resources[old];
    return { ...s, resources };
  });
}

export async function recallResource<T>(key: string): Promise<T | null> {
  const resource = (await readOfflineSnapshot())?.resources[key];
  if (!resource || Date.now() - resource.savedAt >= SESSION_DURATION_MS) return null;
  return resource.data as T;
}

/** Solo para pruebas. */
export function __resetOfflineSessionQueueForTests(): void {
  queue = Promise.resolve();
}
