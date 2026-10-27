import { getFirebaseAuth } from '../../app/providers/firebase';

/**
 * SDD-00 §17.4: la clave local solo se habilita DESPUES de autenticar. Los almacenes offline obtienen el usuario de la
 * sesion de Firebase (que se restaura sin red). Sin sesion no se guarda ni se lee nada sensible.
 */
export class LocalCryptoUnavailableError extends Error {
  readonly code = 'LOCAL_CRYPTO_UNAVAILABLE';
  constructor() {
    super('No hay una sesión autenticada: no se pueden guardar ni leer datos sin conexión de forma segura.');
    this.name = 'LocalCryptoUnavailableError';
  }
}

type UserIdProvider = () => string | null | undefined;

function defaultProvider(): string | null {
  try {
    return getFirebaseAuth().currentUser?.uid ?? null;
  } catch {
    return null;
  }
}

let provider: UserIdProvider = defaultProvider;

/** Solo para pruebas: reemplaza (o restaura con `null`) el origen del identificador de usuario. */
export function setLocalCryptoUserIdProvider(next: UserIdProvider | null): void {
  provider = next ?? defaultProvider;
}

export function getLocalCryptoUserId(): string | null {
  return provider() ?? null;
}

export function requireLocalCryptoUserId(): string {
  const userId = getLocalCryptoUserId();
  if (!userId) throw new LocalCryptoUnavailableError();
  return userId;
}
