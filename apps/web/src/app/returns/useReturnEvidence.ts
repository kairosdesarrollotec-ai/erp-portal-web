import { useCallback, useEffect, useState } from 'react';
import {
  listReturnEvidence,
  deleteReturnEvidence,
  recordReturnEvidence,
  requestReturnEvidenceUploadSession,
  uploadReturnEvidenceToGcs,
  ReturnEvidenceContentType,
  ReturnEvidenceResponse,
  ReturnEvidenceType,
} from './returns-client';
import { describeReturnError } from './return-errors';
import { MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, PHOTO_TYPES, VIDEO_TYPES } from './return-evidence';
import type { ReturnsWorkContext } from './useWorkContextForReturns';

/**
 * Evidencia real de retorno (DEV-04, TR-08 online-only como ALQ-09): pide URL
 * firmada -> PUT directo a GCS -> registra en backend. Un fallo de lectura no
 * bloquea la pantalla (deja el progreso en 0 hasta el proximo reintento).
 * "SYNCED" solo lo determina el servidor: los contadores salen del listado
 * persistido, nunca de lo que se subio localmente.
 */
export function useReturnEvidence(
  id: string,
  context: ReturnsWorkContext | null,
  getIdToken: () => Promise<string>,
) {
  const [evidence, setEvidence] = useState<ReturnEvidenceResponse[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!context || !id) return;
    try {
      const idToken = await getIdToken();
      setEvidence(await listReturnEvidence(idToken, id, context.companyId, context.branchId));
    } catch {
      // ver nota de la funcion
    } finally {
      setLoaded(true);
    }
  }, [context, id, getIdToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const upload = useCallback(
    async (type: ReturnEvidenceType, zone: string, files: File[]) => {
      if (!context || !id || files.length === 0) return;
      setError(null);
      setUploading(true);
      try {
        for (const file of files) {
          const allowed = type === 'PHOTO' ? PHOTO_TYPES : VIDEO_TYPES;
          if (!allowed.includes(file.type)) {
            setError(type === 'PHOTO' ? 'Solo se admiten imágenes JPEG o WebP.' : 'Solo se admiten videos MP4 o WebM.');
            continue;
          }
          const maxBytes = type === 'PHOTO' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
          if (file.size > maxBytes) {
            setError(`El archivo supera el tamaño máximo de ${Math.round(maxBytes / (1024 * 1024))} MB.`);
            continue;
          }
          try {
            const idToken = await getIdToken();
            const session = await requestReturnEvidenceUploadSession(
              idToken,
              id,
              context.companyId,
              context.branchId,
              type,
              zone,
              file.type as ReturnEvidenceContentType,
              file.size,
            );
            await uploadReturnEvidenceToGcs(session.uploadUrl, file);
            await recordReturnEvidence(idToken, id, context.companyId, context.branchId, type, zone, session.objectUrl);
          } catch (err) {
            setError(
              describeReturnError(err, 'No pudimos subir el archivo. Verifica tu conexión e intenta de nuevo.'),
            );
            break;
          }
        }
        await reload();
      } finally {
        setUploading(false);
      }
    },
    [context, id, getIdToken, reload],
  );

  /** Elimina una evidencia ya registrada (solo mientras la devolucion admite evidencia). */
  const remove = useCallback(
    async (evidenceId: string) => {
      if (!context || !id) return;
      setError(null);
      try {
        const idToken = await getIdToken();
        await deleteReturnEvidence(idToken, id, evidenceId, context.companyId, context.branchId);
      } catch (err) {
        const status = (err as { status?: number }).status;
        setError(
          status === 409
            ? 'La devolución ya no admite cambios en la evidencia.'
            : status === 404
              ? 'Ese archivo ya no existe. Actualizamos la lista.'
              : 'No pudimos eliminar el archivo. Intenta de nuevo.',
        );
      }
      await reload();
    },
    [context, id, getIdToken, reload],
  );

  return { evidence, loaded, uploading, error, upload, remove, reload };
}
