import { useEffect, useMemo, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { getVacationsCalendar, type HrScope, type VacationRequest } from './hr-client';
import { occupiedDates } from './hr-domain';
import { limaToday } from '../shared/lima-time';

export type OccupiedDaysState = 'IDLE' | 'LOADING' | 'READY' | 'UNAVAILABLE';

/**
 * Dias ocupados del area (vacaciones activas de OTRAS personas) del anio en curso y el siguiente, para el calendario de
 * reprogramacion. Solo se consulta cuando `enabled`. Si la consulta no esta disponible (p. ej. sin permiso) devuelve
 * UNAVAILABLE y decide el servidor (409 VACATION_OVERLAP).
 */
export function useAreaOccupiedDays(input: { enabled: boolean; scope: HrScope | undefined; areaId: string | undefined; employeeId: string | undefined }) {
  const { enabled, scope, areaId, employeeId } = input;
  const companyId = scope?.companyId;
  const branchId = scope?.branchId;
  const active = enabled && !!companyId && !!branchId && !!areaId && !!employeeId;
  const key = active ? `${companyId}:${branchId}:${areaId}` : '';
  const [loaded, setLoaded] = useState<{ key: string; state: 'READY' | 'UNAVAILABLE'; vacations: VacationRequest[] } | null>(null);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('sin sesión');
        const idToken = await user.getIdToken();
        const year = Number(limaToday().slice(0, 4));
        const lists = await Promise.all(
          [year, year + 1].map((y) => getVacationsCalendar(idToken, { companyId: companyId!, branchId: branchId! }, areaId!, y, controller.signal)),
        );
        if (!controller.signal.aborted) setLoaded({ key, state: 'READY', vacations: lists.flat() });
      } catch {
        if (!controller.signal.aborted) setLoaded({ key, state: 'UNAVAILABLE', vacations: [] });
      }
    })();
    return () => controller.abort();
  }, [active, key, companyId, branchId, areaId]);

  const current = active && loaded?.key === key ? loaded : null;
  const occupied = useMemo(() => (current && employeeId ? occupiedDates(current.vacations, employeeId) : new Set<string>()), [current, employeeId]);
  const state: OccupiedDaysState = !active ? 'IDLE' : current ? current.state : 'LOADING';
  return { state, occupied };
}
