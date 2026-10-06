import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
  const [state, setState] = useState<IncidentDetailState>('LOADING');
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const getIdToken = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('Sesión no disponible');
    return user.getIdToken();
  }, []);

  const load = useCallback(async () => {
    if (!context) return null;
    try {
      const idToken = await getIdToken();
      const detail = await getIncident(idToken, id, context.companyId, context.branchId);
      setIncident(detail);
      setState('READY');
      return detail;
    } catch (err) {
      const status = (err as { status?: number }).status;
      setState(status === 404 ? 'NOT_FOUND' : 'RECOVERABLE_ERROR');
      return null;
    }
  }, [context, getIdToken, id]);

  useEffect(() => {
    if (!contextLoading && context) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, load]);

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
      setState('SAVING');
      setError(null);
      setNotice(null);
      try {
        const idToken = await getIdToken();
        const updated = await command(idToken, incident, context.companyId, context.branchId);
        setIncident(updated);
        setNotice(successNotice);
        setState('READY');
        return true;
      } catch (err) {
        setError(describeIncidentError(err, fallback));
        if (isStaleIncidentError(err)) {
          await load();
        } else {
          setState('READY');
        }
        return false;
      }
    },
    [context, getIdToken, incident, load],
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

  return { id, state, incident, context, error, notice, addAction, close, referLegal, reload: load };
}
