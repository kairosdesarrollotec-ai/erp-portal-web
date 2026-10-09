import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFirebaseAuth } from '../providers/firebase';
import {
  addIncidentAction,
  closeIncident,
  getIncident,
  referIncidentToLegal,
  type IncidentDetail,
} from './incidents-client';
import { describeIncidentError, isStaleIncidentError } from './incident-errors';
import { useWorkContextForIncidents } from './useWorkContextForIncidents';

/** INC-02 - estados READY / SAVING (+ LOADING y RECOVERABLE_ERROR de carga). */
export type IncidentDetailState = 'LOADING' | 'READY' | 'SAVING' | 'RECOVERABLE_ERROR' | 'NOT_FOUND';

export function useIncidentDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { context, loading: contextLoading } = useWorkContextForIncidents();
  const queryClient = useQueryClient();
  const [commandError, setCommandError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const getIdToken = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('Sesión no disponible');
    return user.getIdToken();
  }, []);

  const queryKey = useMemo(
    () => ['incident', id, context?.companyId, context?.branchId] as const,
    [id, context?.companyId, context?.branchId],
  );

  const {
    data: incident,
    isLoading: queryLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const idToken = await getIdToken();
      return getIncident(idToken, id, context!.companyId, context!.branchId);
    },
    enabled: !contextLoading && !!context && !!id,
    retry: false,
  });

  const state: IncidentDetailState = saving
    ? 'SAVING'
    : contextLoading || (!!context && queryLoading)
    ? 'LOADING'
    : !context
    ? 'RECOVERABLE_ERROR'
    : queryError
    ? ((queryError as { status?: number }).status === 404 ? 'NOT_FOUND' : 'RECOVERABLE_ERROR')
    : incident
    ? 'READY'
    : 'LOADING';

  /**
   * Ejecuta un comando con If-Match. 409/428 (version desactualizada o ya no
   * abierta): recarga la incidencia y avisa. 400/422/403: muestra el mensaje.
   */
  const run = useCallback(
    async (
      command: (idToken: string, current: IncidentDetail, companyId: string, branchId: string) => Promise<IncidentDetail>,
      fallback: string,
      successNotice: string,
    ): Promise<boolean> => {
      if (!context || !incident) return false;
      setSaving(true);
      setCommandError(null);
      setNotice(null);
      try {
        const idToken = await getIdToken();
        const updated = await command(idToken, incident, context.companyId, context.branchId);
        queryClient.setQueryData(queryKey, updated);
        setNotice(successNotice);
        return true;
      } catch (err) {
        setCommandError(describeIncidentError(err, fallback));
        if (isStaleIncidentError(err)) {
          await refetch();
        }
        return false;
      } finally {
        setSaving(false);
      }
    },
    [context, getIdToken, incident, queryClient, queryKey, refetch],
  );

  const addAction = useCallback(
    (description: string) =>
      run(
        (token, cur, c, b) => addIncidentAction(token, cur.id, cur.version, c, b, description),
        'No pudimos agregar la acción. Intenta de nuevo.',
        'Acción agregada al historial.',
      ),
    [run],
  );

  const close = useCallback(
    (resolutionSummary: string) =>
      run(
        (token, cur, c, b) => closeIncident(token, cur.id, cur.version, c, b, resolutionSummary),
        'No pudimos cerrar la incidencia. Intenta de nuevo.',
        'Incidencia cerrada.',
      ),
    [run],
  );

  const referLegal = useCallback(
    (reason: string) =>
      run(
        (token, cur, c, b) => referIncidentToLegal(token, cur.id, cur.version, c, b, reason),
        'No pudimos derivar la incidencia a vía legal. Intenta de nuevo.',
        'Incidencia derivada a vía legal.',
      ),
    [run],
  );

  return {
    id,
    state,
    incident: incident ?? null,
    context,
    error: commandError,
    notice,
    addAction,
    close,
    referLegal,
    reload: refetch,
  };
}
