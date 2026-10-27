import Dexie, { type Table } from 'dexie';
import { kairosDb } from '../database/kairos-db';

/**
 * SDD-00 §17.4 / §22.1.1: Cifrado local de datos offline.
 * - Algoritmo: Web Crypto API AES-256-GCM.
 * - Clave por usuario/dispositivo con `extractable: false` (no exportable).
 * - Rotación periódica cada 90 días (KEY_MAX_AGE_MS).
 * - Descarte seguro al cerrar sesión (con advertencia si hay datos sin sincronizar).
 * - Migración perezosa de datos planos heredados.
 * - Bloqueo estricto de datos altamente sensibles prohibidos offline (PAYMENT).
 */

export const KEY_ROTATION_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000; // 90 días en ms

export interface StoredCryptoKey {
  keyId: string; // `${userId}:v${version}`
  userId: string;
  version: number;
  cryptoKey: CryptoKey;
  createdAt: number;
}

export interface EncryptedRecordPayload {
  _encrypted: true;
  keyVersion: number;
  iv: string; // base64 12 bytes
  ciphertext: string; // base64
}

export interface EncryptedBlobPayload {
  _encryptedBlob: true;
  keyVersion: number;
  iv: string; // base64 12 bytes
  mimeType: string;
  /** Texto cifrado en base64: un string sobrevive intacto a IndexedDB y a Dexie `update` (que corrompe ArrayBuffer/Blob). Se aceptan Blob/ArrayBuffer heredados al leer. */
  encryptedBlob: string | Blob | ArrayBuffer;
}

class CryptoKeyDatabase extends Dexie {
  crypto_keys!: Table<StoredCryptoKey, string>;

  constructor() {
    super('kairos-crypto-keys');
    this.version(1).stores({
      crypto_keys: 'keyId, userId, version, createdAt',
    });
  }
}

export const cryptoKeyDb = new CryptoKeyDatabase();

// Helpers base64 portables (Node / Vitest / Navegador)
function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * SDD-00 §17.4 línea 626 / línea 632:
 * "Pago: Exclusivamente online — la fuente financiera siempre prevalece."
 * "Los datos altamente sensibles no están disponibles en modo offline bajo ninguna circunstancia."
 */
export function assertOfflineAllowed(dataType?: string): void {
  if (dataType === 'PAYMENT') {
    throw new Error('Los datos de pago son exclusivamente online. Prohibido almacenar offline (SDD-00 §17.4).');
  }
}

/**
 * Genera una nueva CryptoKey AES-256-GCM con extractable: false.
 */
async function generateAes256GcmKey(): Promise<CryptoKey> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API (crypto.subtle) no está disponible en este entorno.');
  }
  return subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // extractable = false (nunca exportable)
    ['encrypt', 'decrypt'],
  );
}

/**
 * Obtiene o crea la clave activa para el usuario, aplicando rotación si supera 90 días.
 */
export async function getOrCreateActiveUserKey(userId: string): Promise<StoredCryptoKey> {
  if (!userId || userId.trim() === '') {
    throw new Error('Se requiere userId para inicializar el cifrado local.');
  }
  await cryptoKeyDb.open();

  // Buscar todas las versiones del usuario, ordenadas por versión descendente
  const existing = await cryptoKeyDb.crypto_keys
    .where('userId')
    .equals(userId)
    .sortBy('version');

  const latest = existing.length > 0 ? existing[existing.length - 1] : null;

  const now = Date.now();
  if (latest) {
    const age = now - latest.createdAt;
    if (age <= KEY_ROTATION_INTERVAL_MS) {
      return latest;
    }
    // Clave expirada (> 90 días): rotación automática a nueva versión
    const newVersion = latest.version + 1;
    const newCryptoKey = await generateAes256GcmKey();
    const rotated: StoredCryptoKey = {
      keyId: `${userId}:v${newVersion}`,
      userId,
      version: newVersion,
      cryptoKey: newCryptoKey,
      createdAt: now,
    };
    await cryptoKeyDb.crypto_keys.put(rotated);
    return rotated;
  }

  // Primera clave para el usuario (v1)
  const initialKey = await generateAes256GcmKey();
  const stored: StoredCryptoKey = {
    keyId: `${userId}:v1`,
    userId,
    version: 1,
    cryptoKey: initialKey,
    createdAt: now,
  };
  await cryptoKeyDb.crypto_keys.put(stored);
  return stored;
}

/**
 * Busca una versión específica de clave para desencriptar datos históricos.
 */
export async function getKeyByVersion(userId: string, version: number): Promise<StoredCryptoKey | null> {
  await cryptoKeyDb.open();
  const keyId = `${userId}:v${version}`;
  const found = await cryptoKeyDb.crypto_keys.get(keyId);
  return found ?? null;
}

/**
 * Cifra un objeto o string en formato JSON con AES-256-GCM y un IV de 12 bytes aleatorio.
 */
export async function encryptLocalPayload<T>(
  userId: string,
  data: T,
  dataType?: string,
): Promise<EncryptedRecordPayload> {
  assertOfflineAllowed(dataType);
  const activeKey = await getOrCreateActiveUserKey(userId);

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = JSON.stringify(data);
  const encodedPlaintext = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    activeKey.cryptoKey,
    encodedPlaintext,
  );

  return {
    _encrypted: true,
    keyVersion: activeKey.version,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertextBuffer)),
  };
}

/**
 * Descifra una carga local. Si el registro no está cifrado (datos heredados sin _encrypted),
 * devuelve los datos directamente (migración perezosa).
 */
export async function decryptLocalPayload<T>(userId: string, payload: unknown): Promise<T> {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('_encrypted' in payload) ||
    (payload as EncryptedRecordPayload)._encrypted !== true
  ) {
    // Migración perezosa: dato plano heredado
    return payload as T;
  }

  const enc = payload as EncryptedRecordPayload;
  const keyRecord = await getKeyByVersion(userId, enc.keyVersion);
  if (!keyRecord) {
    throw new Error(`Clave de descifrado local no encontrada para la versión ${enc.keyVersion}.`);
  }

  const iv = fromBase64(enc.iv);
  const ciphertext = fromBase64(enc.ciphertext);

  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    keyRecord.cryptoKey,
    ciphertext as unknown as BufferSource,
  );

  const decodedText = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decodedText) as T;
}

/**
 * Cifra un Blob binario (foto/video de evidencia o asistencia) con AES-256-GCM.
 */
export async function encryptLocalBlob(
  userId: string,
  blob: Blob,
  dataType?: string,
): Promise<EncryptedBlobPayload> {
  assertOfflineAllowed(dataType);
  const activeKey = await getOrCreateActiveUserKey(userId);

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const arrayBuffer = await blob.arrayBuffer();

  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    activeKey.cryptoKey,
    arrayBuffer,
  );

  return {
    _encryptedBlob: true,
    keyVersion: activeKey.version,
    iv: toBase64(iv),
    mimeType: blob.type,
    encryptedBlob: toBase64(new Uint8Array(encryptedBuffer)),
  };
}

/**
 * Descifra un Blob binario. Si no está cifrado, devuelve el Blob tal cual.
 */
export async function decryptLocalBlob(userId: string, payload: unknown): Promise<Blob> {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('_encryptedBlob' in payload) ||
    (payload as EncryptedBlobPayload)._encryptedBlob !== true
  ) {
    return payload as Blob;
  }

  const enc = payload as EncryptedBlobPayload;
  const keyRecord = await getKeyByVersion(userId, enc.keyVersion);
  if (!keyRecord) {
    throw new Error(`Clave de descifrado local no encontrada para la versión ${enc.keyVersion}.`);
  }

  const iv = fromBase64(enc.iv);
  const stored = enc.encryptedBlob;
  let arrayBuffer: BufferSource;
  if (typeof stored === 'string') arrayBuffer = fromBase64(stored) as unknown as BufferSource;
  else if (typeof (stored as Blob).arrayBuffer === 'function') arrayBuffer = await (stored as Blob).arrayBuffer();
  else arrayBuffer = stored as ArrayBuffer;

  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    keyRecord.cryptoKey,
    arrayBuffer,
  );

  return new Blob([decryptedBuffer], { type: enc.mimeType });
}

/**
 * Elimina todas las claves locales del usuario en IndexedDB al cerrar sesión.
 */
export async function discardUserCryptoKeys(userId: string): Promise<void> {
  await cryptoKeyDb.open();
  const keys = await cryptoKeyDb.crypto_keys
    .where('userId')
    .equals(userId)
    .toArray();

  for (const k of keys) {
    await cryptoKeyDb.crypto_keys.delete(k.keyId);
  }
}

/**
 * Cuenta los registros pendientes de sincronización en todas las colas de kairosDb.
 * Usado antes de cerrar sesión para alertar al usuario antes de purgar claves locales.
 */
export async function countPendingUnsyncedItems(): Promise<{
  total: number;
  evidence: number;
  fieldEdits: number;
  attendance: number;
}> {
  await kairosDb.open();

  const pendingEvidence = await kairosDb.evidence_queue
    .filter((item) => item.status === 'pending' || item.status === 'error')
    .count();

  const pendingFieldEdits = await kairosDb.sync_field_edits
    .filter((edit) => !edit.sentAt)
    .count();

  const pendingAttendance = await kairosDb.attendance_queue
    .filter((item) => item.queueStatus === 'pending' || item.queueStatus === 'error')
    .count();

  return {
    total: pendingEvidence + pendingFieldEdits + pendingAttendance,
    evidence: pendingEvidence,
    fieldEdits: pendingFieldEdits,
    attendance: pendingAttendance,
  };
}
