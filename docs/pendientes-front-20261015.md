# Pendientes del frontend - 2026-10-15

## ENTREGA-04 (rentals) y DEV-04 (returns): mismo mecanismo de captura/sync

Decision del usuario: DEV-04 usa el mismo proceso que ENTREGA-04 para fotos/videos.

Lo que ambos hacen hoy (paridad):

- Captura de foto/video con validacion de tipo (JPEG/WebP, MP4/WebM) y tamano.
- Online: URL firmada -> PUT a GCS -> registro en backend. Offline: cola Dexie (`evidence_queue`, `addEvidenceToQueue`).
- `useSyncManager` sube la cola al evento `online` (ahora enruta a `/rentals/{id}/evidence` o `/returns/{id}/evidence` segun el item).
- Estado derivado en `shared/evidence-sync-state.ts` (`OFFLINE | SYNCING | SYNCED | ONLINE`): SYNCED solo si el listado del
  servidor tiene >=35 fotos y >=3 videos y no hay pendientes locales. "Continuar" solo habilitado en SYNCED (y con conexion).
- Banners: sin conexion + N pendientes, "Sincronizando N archivos...", "Confirmado por servidor", alerta de archivos fallidos.

Correccion hecha en esta rama: `useSyncManager` subia los items de devolucion a los endpoints de rentals
(`rentals-documents-client`) usando el `returnId`; ahora usa `returns-evidence-client` para items con `returnId`.

## Brechas comunes (ENTREGA-04 y por ende DEV-04) - NO implementadas, no se inventan

1. Estado `SYNC_CONFLICT` y pantalla de resolucion (PROTO-ALQ-09-RESOLUCION-DE-CONFLICTO-SYNC-ENTREGA-1/2: Conservar la mia /
   Conservar la del servidor / Combinar solo si no chocan). Alquiler NO la implementa y no existe contrato backend de conflicto
   (`rentals.yaml` 1.4.0 / `returns.yaml` 1.2.0). Hoy cualquier fallo de subida solo marca el item `error` y muestra
   "N archivos no pudieron sincronizarse" (en DEV-04 con boton Reintentar; en ENTREGA-04 sin boton).
2. Estados `LOCAL_DRAFT` y `OFFLINE_READ_ONLY` como estados nombrados: no existen; el borrador (minutos, notas, FIV/FCKE) vive
   en sessionStorage y la lectura offline no esta diferenciada.
3. Grid de 35 fotos + 3 videos por zona: ENTREGA-04 solo tiene selector de zona + lista plana; DEV-04 tiene contador/barra y
   "Progreso por zona" (conteos, sin miniaturas). Ninguno muestra miniaturas ni cuota por zona (el contrato no define cuantas
   fotos por zona).
4. FIV/FCKE: en ENTREGA-04 solo un campo de notas; en DEV-04 dos casillas (`fivDone`, `fckeDone`) en borrador local. Ninguno
   captura los formatos reales (FORMATO N 01/02 y 08) ni los envia al backend.
5. La cola Dexie no tiene reintento con backoff ni limpieza de items `synced` al montar (solo `clearSyncedEvidence(rentalId)`,
   sin equivalente para `returnId`); un item en `error` solo se reintenta en el siguiente evento `online` o con el boton de DEV-04.
6. ENTREGA-04 no dispara la sincronizacion al montar (DEV-04 si); sin evento `online` los pendientes de una sesion previa
   quedan en cola hasta volver a conectar.
7. Limite de video distinto: ENTREGA-04 200 MB, DEV-04 50 MB (contrato returns.yaml). Confirmar con backend.

Cuando exista el contrato de conflicto: implementarlo una vez (hook + pantalla en `shared/`) y usarlo en ambos modulos,
siguiendo el patron `SYNC_CONFLICT` de `ReservationDetailScreen`/`InquiryDetailScreen`.
