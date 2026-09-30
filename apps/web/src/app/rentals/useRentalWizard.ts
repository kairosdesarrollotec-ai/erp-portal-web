import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getRental, RentalApiError, RentalResponse } from './rentals-client';
import { useWorkContextForRentals } from './useWorkContextForRentals';

/**
 * Hook base del asistente de Entrega (ENTREGA-01..05). Carga el expediente
 * por :id y expone el contexto multiempresa + un helper de idToken para que
 * cada etapa ejecute su propio comando (validate-documents,
 * register-alcohol-test, evaluate-notary, formalize-contract,
 * complete-delivery). No hay endpoint de "guardado de borrador" en el
 * backend: cada etapa persiste al ejecutar su comando (BR mapeadas 1:1 a
 * las transiciones de estado de rental-status.ts), por eso "Continuar"
 * es la accion que autoguarda esa etapa.
 */
export type RentalWizardState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR' | 'NOT_FOUND';

export function useRentalWizard() {
  const { id } = useParams<{ id: string }>();
  const { context, loading: contextLoading } = useWorkContextForRentals();
  const [state, setState] = useState<RentalWizardState>('LOADING');
  const [rental, setRental] = useState<RentalResponse | null>(null);

  const reload = useCallback(async () => {
    if (!context || !id) return;
    setState('LOADING');
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const result = await getRental(idToken, id, context.companyId, context.branchId);
      setRental(result);
      setState('READY');
    } catch (error) {
      if (error instanceof RentalApiError && error.status === 404) {
        setState('NOT_FOUND');
      } else {
        setState('RECOVERABLE_ERROR');
      }
    }
  }, [context, id]);

  useEffect(() => {
    if (!contextLoading && context && id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void reload();
    } else if (!contextLoading && !context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
    }
  }, [context, contextLoading, id, reload]);

  const getIdToken = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('Sesión no disponible');
    return user.getIdToken();
  }, []);

  return { id: id ?? '', state, rental, context, reload, setRental, getIdToken };
}
