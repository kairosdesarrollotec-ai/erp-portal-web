import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { quoteInquiry, InquiryCommandError } from './inquiries-client';
import { VEHICLE_CATALOG } from './vehicle-catalog';
import type { InquiryNavState } from './inquiries-nav-state';

/** CON-03 - estados READY/LOADING/EMPTY/STALE_VERSION (contrato punto 9). */
export type InquiryVehiclesState = 'LOADING' | 'READY' | 'EMPTY' | 'STALE_VERSION';

/** La disponibilidad nunca se muestra vigente pasados 5 minutos (punto 14). */
const STALE_AFTER_MS = 5 * 60 * 1000;
const STALE_CHECK_INTERVAL_MS = 15 * 1000;

export function useInquiryVehicles() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as InquiryNavState | null) ?? null;

  const [state, setState] = useState<InquiryVehiclesState>(VEHICLE_CATALOG.length === 0 ? 'EMPTY' : 'READY');
  const [version, setVersion] = useState(navState?.version ?? 1);
  const [quotingVehicleId, setQuotingVehicleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedAtRef = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - loadedAtRef.current >= STALE_AFTER_MS) {
        setState((prev) => (prev === 'EMPTY' ? prev : 'STALE_VERSION'));
      }
    }, STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const refreshAvailability = useCallback(() => {
    loadedAtRef.current = Date.now();
    setState(VEHICLE_CATALOG.length === 0 ? 'EMPTY' : 'READY');
  }, []);

  async function reserveVehicle(vehicleId: string) {
    if (!id || !navState || state === 'STALE_VERSION') return;
    setQuotingVehicleId(vehicleId);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const updated = await quoteInquiry(
        idToken,
        id,
        version,
        vehicleId,
        navState.destination,
        navState.travelDays || 1,
      );
      setVersion(updated.version);
      // CON-03 -> RES-04 (directo, PANTALLAS-V3-B-CONSULTA.md). La pantalla
      // RES-04 real que retoma esta cotizacion (crear la Reservation con
      // POST /reservations usando inquiryId) no esta construida en este
      // corte de HU-27 - el enlace queda preparado con el contexto y el
      // vehiculo cotizado, pero el flujo puede no completarse todavia.
      navigate('/reservas', {
        state: { ...navState, inquiryId: id, vehicleId, version: updated.version },
      });
    } catch (err) {
      if (err instanceof InquiryCommandError && err.status === 409) {
        setState('STALE_VERSION');
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo cotizar el vehículo.');
      }
    } finally {
      setQuotingVehicleId(null);
    }
  }

  return {
    id,
    navState,
    state,
    vehicles: VEHICLE_CATALOG,
    quotingVehicleId,
    error,
    reserveVehicle,
    refreshAvailability,
  };
}
