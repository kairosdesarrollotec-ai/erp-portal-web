const KEY = 'kairos.deviceId';
let memoryId: string | null = null;

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `dev-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

/** Identificador estable de este dispositivo (`deviceId`, max 100). localStorage con respaldo en memoria. */
export function getDeviceId(): string {
  if (memoryId) return memoryId;
  try {
    const stored = globalThis.localStorage?.getItem(KEY);
    if (stored) {
      memoryId = stored;
      return stored;
    }
  } catch {
    /* almacenamiento bloqueado: usa memoria */
  }
  memoryId = newId();
  try {
    globalThis.localStorage?.setItem(KEY, memoryId);
  } catch {
    /* sin persistencia */
  }
  return memoryId;
}

/** Solo para pruebas. */
export function resetDeviceIdForTests(): void {
  memoryId = null;
}
