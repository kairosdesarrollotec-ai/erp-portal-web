import { useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { getVacationsCalendar, type HrScope, type VacationRequest } from './hr-client';
import { findVacationConflict, yearsOfRange } from './hr-domain';

export type ConflictCheck =
  | { status: 'IDLE' }
  | { status: 'CHECKING' }
  | { status: 'FREE' }
  | { status: 'UNAVAILABLE' }
  | { status: 'CONFLICT'; startDate: string; endDate: string };

/**
 * BR-ADP-002 - valida el conflicto ANTES de enviar, con el calendario del area. Solo devuelve el
 * conflicto puntual (rango ocupado), nunca el calendario completo ni quien lo ocupa. Si la consulta
 * no esta disponible (p. ej. sin permiso de lectura) se devuelve UNAVAILABLE y decide el servidor al enviar.
 */
export function useVacationConflict(input: {
  scope: HrScope | undefined;
  areaId: string | undefined;
  employeeId: string | undefined;
  startDate: string;
  endDate: string;
}): ConflictCheck {
  const { scope, areaId, employeeId, startDate, endDate } = input;
  const companyId = scope?.companyId;
  const branchId = scope?.branchId;
  const valid = !!companyId && !!branchId && !!areaId && !!employeeId && !!startDate && !!endDate && startDate <= endDate;
  const [result, setResult] = useState<ConflictCheck>({ status: 'IDLE' });

  useEffect(() => {
    if (!valid) {
      queueMicrotask(() => setResult({ status: 'IDLE' }));
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setResult({ status: 'CHECKING' });
    });
    (async () => {
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('sin sesión');
        const idToken = await user.getIdToken();
        const lists = await Promise.all(
          yearsOfRange({ startDate, endDate }).map((year) => getVacationsCalendar(idToken, { companyId: companyId!, branchId: branchId! }, areaId!, year, controller.signal)),
        );
        if (controller.signal.aborted) return;
        const all: VacationRequest[] = lists.flat();
        const conflict = findVacationConflict(all, employeeId!, { startDate, endDate });
        setResult(conflict ? { status: 'CONFLICT', startDate: conflict.startDate, endDate: conflict.endDate } : { status: 'FREE' });
      } catch {
        if (!controller.signal.aborted) setResult({ status: 'UNAVAILABLE' });
      }
    })();
    return () => controller.abort();
  }, [valid, companyId, branchId, areaId, employeeId, startDate, endDate]);

  return result;
}
