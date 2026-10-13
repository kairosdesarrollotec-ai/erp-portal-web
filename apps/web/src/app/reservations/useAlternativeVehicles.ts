import { useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listVehicles, type FleetVehicle } from '../fleet/fleet-client';
import type { ReservationSummary } from './reservations-client';
import type { ReservationsWorkContext } from './useWorkContextForReservations';

export type AlternativesState = 'LOADING' | 'READY' | 'EMPTY' | 'ERROR';

/**
 * RES-06/RES-07 - vehículos libres en la ventana [startAt, endAt) de la reserva
 * (GET /fleet/vehicles?availableFrom&availableTo), sin el vehículo original.
 */
export function useAlternativeVehicles(
  reservation: ReservationSummary | null,
  context: ReservationsWorkContext | null,
  enabled = true,
) {
  const [state, setState] = useState<AlternativesState>('LOADING');
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [attempt, setAttempt] = useState(0);

  const reservationId = reservation?.id;
  const currentVehicleId = reservation?.vehicle.id;
  const startAt = reservation?.startAt;
  const endAt = reservation?.endAt;
  const companyId = context?.companyId;
  const branchId = context?.branchId;

  useEffect(() => {
    if (!enabled || !reservationId || !startAt || !endAt || !companyId || !branchId) return;
    let cancelled = false;
    void (async () => {
      setState('LOADING');
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('Sesión no disponible.');
        const idToken = await user.getIdToken();
        const result = await listVehicles(idToken, {
          companyId,
          branchId,
          availableFrom: startAt,
          availableTo: endAt,
          limit: 50,
        });
        if (cancelled) return;
        const free = result.items.filter(
          (v) => v.id !== currentVehicleId && v.status === 'AVAILABLE' && v.availability?.available !== false,
        );
        setVehicles(free);
        setState(free.length === 0 ? 'EMPTY' : 'READY');
      } catch {
        if (!cancelled) setState('ERROR');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, reservationId, currentVehicleId, startAt, endAt, companyId, branchId, attempt]);

  return { state, vehicles, retry: () => setAttempt((n) => n + 1) };
}
