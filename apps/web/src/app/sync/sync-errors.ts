import { SyncCommandError } from './sync-client';

/** Codigos de dominio de sync.yaml 1.0.0 traducidos a lenguaje de negocio. */
const DOMAIN_MESSAGES: Record<string, string> = {
  SYNC_SOURCE_NOT_FOUND: 'No encontramos el expediente en esta empresa y sede. Vuelve a la bandeja y ábrelo de nuevo.',
  SYNC_CONFLICT_NOT_FOUND: 'Ese conflicto ya no existe. Actualizamos la lista.',
  SYNC_DRAFT_REJECTED:
    'Este expediente ya fue confirmado, cerrado o cancelado, por eso el servidor no recibió tu borrador. Avisa a tu supervisor.',
  SYNC_DRAFT_EXPIRED: 'Tu borrador en este dispositivo venció (más de 72 horas) y el servidor no lo aceptó. Avisa a tu supervisor.',
  SYNC_PAYLOAD_INVALID: 'Algunos datos guardados en este dispositivo no son válidos. Revisa el checklist e inténtalo otra vez.',
  SYNC_PAYMENT_ONLINE_ONLY: 'Los pagos solo se registran con conexión. Quita el pago del borrador y regístralo en línea.',
  SYNC_RESOLVER_NOT_SUPPORTED:
    'Este dato no se resuelve aquí: los datos de empleados los resuelve RR.HH. y los borrados críticos, el Data Owner.',
  SYNC_CONFLICT_ALREADY_OPEN: 'Ya hay un conflicto abierto sobre este dato con otro valor. Resuélvelo antes de sincronizar de nuevo.',
  SYNC_CONFLICT_ALREADY_RESOLVED: 'Ese conflicto ya fue resuelto por otra persona. Actualizamos la lista.',
  SYNC_CONFLICT_VERSION_MISMATCH:
    'El conflicto cambió mientras lo revisabas. Cargamos la versión más reciente: revísala y elige de nuevo.',
  SYNC_CONFIRMATION_REQUIRED: 'Confirma de forma explícita qué versión se conserva.',
  SYNC_REASON_REQUIRED: 'Escribe el motivo de la decisión (entre 10 y 500 caracteres).',
  SYNC_MERGE_NOT_ALLOWED: '«Combinar» no está disponible: los datos chocan entre sí. Conserva la tuya o la del servidor.',
  SYNC_CONFLICT_PENDING: 'Hay conflictos de sincronización sin resolver. Un supervisor debe resolverlos antes de continuar.',
  ROLE_NOT_ALLOWED: 'Tu rol no tiene permiso para esta acción.',
};

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Tu sesión venció. Vuelve a ingresar.',
  403: 'No tienes permiso para esta acción en esta empresa y sede.',
  412: DOMAIN_MESSAGES.SYNC_CONFLICT_VERSION_MISMATCH,
  428: 'No pudimos validar la versión del conflicto. Recarga la pantalla e inténtalo de nuevo.',
};

/** 412 / SYNC_CONFLICT_VERSION_MISMATCH: la pantalla debe recargar el conflicto. */
export function isSyncVersionMismatch(error: unknown): boolean {
  return (
    error instanceof SyncCommandError &&
    (error.status === 412 || error.problem?.code === 'SYNC_CONFLICT_VERSION_MISMATCH')
  );
}

/** Errores tras los cuales la lista de conflictos ya no es valida y hay que recargarla. */
export function shouldReloadSyncConflicts(error: unknown): boolean {
  if (!(error instanceof SyncCommandError)) return false;
  return (
    isSyncVersionMismatch(error) ||
    error.problem?.code === 'SYNC_CONFLICT_ALREADY_RESOLVED' ||
    error.problem?.code === 'SYNC_CONFLICT_NOT_FOUND'
  );
}

export function describeSyncError(error: unknown, fallback: string): string {
  if (error instanceof SyncCommandError) {
    const code = error.problem?.code;
    if (code && DOMAIN_MESSAGES[code]) return DOMAIN_MESSAGES[code];
    if (STATUS_MESSAGES[error.status]) return STATUS_MESSAGES[error.status];
    return fallback;
  }
  return fallback;
}
