import { useQuery } from '@tanstack/react-query';
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
  const reservationId = reservation?.id;
  const currentVehicleId = reservation?.vehicle.id;
  const startAt = reservation?.startAt;
  const endAt = reservation?.endAt;
  const companyId = context?.companyId;
  const branchId = context?.branchId;

  const queryEnabled = enabled && Boolean(reservationId && startAt && endAt && companyId && branchId);

  const { data, isPending, isError, refetch } = useQuery<FleetVehicle[]>({
    queryKey: ['alternativeVehicles', reservationId, currentVehicleId, startAt, endAt, companyId, branchId],
    queryFn: async () => {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const result = await listVehicles(idToken, {
        companyId: companyId!,
        branchId: branchId!,
        availableFrom: startAt!,
        availableTo: endAt!,
        limit: 50,
      });
      return result.items.filter(
        (v) => v.id !== currentVehicleId && v.status === 'AVAILABLE' && v.availability?.available !== false,
      );
    },
    enabled: queryEnabled,
  });

  const vehicles: FleetVehicle[] = data ?? [];
  const state: AlternativesState =
    !queryEnabled || isPending ? 'LOADING' : isError ? 'ERROR' : vehicles.length === 0 ? 'EMPTY' : 'READY';

  return { state, vehicles, retry: () => void refetch() };
}
