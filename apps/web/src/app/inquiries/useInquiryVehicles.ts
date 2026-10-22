import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getFirebaseAuth } from '../providers/firebase';
import { getInquiry, quoteInquiry, InquiryApiError, InquiryCommandError } from './inquiries-client';
import { useWorkContextForInquiries } from './useWorkContextForInquiries';
import { listVehicles, FleetApiError, type FleetVehicle } from '../fleet/fleet-client';
import type { InquiryNavState } from './inquiries-nav-state';
import { addDaysToDateOnly, limaDateToInstant } from '../shared/lima-time';

/** CON-03 - estados READY/LOADING/EMPTY/STALE_VERSION/RECOVERABLE_ERROR (contrato punto 9). */
export type InquiryVehiclesState = 'LOADING' | 'READY' | 'EMPTY' | 'STALE_VERSION' | 'RECOVERABLE_ERROR';

/** La disponibilidad de Fleet nunca se muestra vigente pasados 5 minutos (punto 14). */
const STALE_AFTER_MS = 5 * 60 * 1000;
const STALE_CHECK_INTERVAL_MS = 15 * 1000;

const PLACEHOLDER_PHOTO_URL =
  'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=480&q=60';

/** Vehículo de Fleet adaptado a lo que necesita la UI de cotización. */
export interface InquiryVehicle {
  id: string;
  model: string;
  photoUrl: string;
  dailyRate: number;
  currency: string;
  /** false = ocupado en la ventana del viaje (solo si se consulto con fechas). */
  available: boolean;
  conflictFrom?: string;
  conflictTo?: string;
  /** Capacidad de pasajeros del vehiculo (null = dato faltante en Flota). */
  passengerCapacity: number | null;
  /** Avisos de datos faltantes del vehiculo (no bloquean la cotizacion). */
  vehicleWarnings: string[];
}

/**
 * Ventana de disponibilidad del viaje: desde la fecha de viaje a las 00:00 de Lima
 * (DEC-TZ-LIMA-001) hasta esa fecha + dias estimados (tambien 00:00 de Lima). Sin fecha
 * valida o sin dias, no hay ventana y el catalogo se pide sin filtro de disponibilidad.
 */
export function buildAvailabilityWindow(
  travelDate: string | null | undefined,
  travelDays: number | null | undefined,
): { availableFrom: string; availableTo: string } | null {
  const day = travelDate?.slice(0, 10) ?? '';
  const availableFrom = limaDateToInstant(day);
  if (!availableFrom) return null;
  if (!travelDays || travelDays < 1) return null;
  const endDay = addDaysToDateOnly(day, Math.floor(travelDays));
  const availableTo = endDay ? limaDateToInstant(endDay) : null;
  if (!availableTo) return null;
  return { availableFrom, availableTo };
}

function toInquiryVehicle(vehicle: FleetVehicle): InquiryVehicle | null {
  if (vehicle.dailyRate == null) return null;
  return {
    id: vehicle.id,
    model: `${vehicle.brand} ${vehicle.model}`.trim(),
    photoUrl: vehicle.photoUrl ?? PLACEHOLDER_PHOTO_URL,
    dailyRate: vehicle.dailyRate,
    currency: 'PEN',
    available: vehicle.availability?.available !== false,
    conflictFrom: vehicle.availability?.conflictFrom,
    conflictTo: vehicle.availability?.conflictTo,
    passengerCapacity: vehicle.passengerCapacity ?? null,
    vehicleWarnings: [
      ...(vehicle.passengerCapacity == null ? ['Falta la capacidad de pasajeros en Flota: no se puede validar contra el grupo.'] : []),
    ],
  };
}

/**
 * Hallazgo de revision PR#11 ("Deep link roto en CON-03"): si el usuario
 * llega aqui sin `location.state` (recarga directa de la URL, enlace
 * compartido), antes esta pantalla caia en `version = 1` por defecto y sin
 * ningun contexto empresa/sede - un `If-Match: "1"` incorrecto contra una
 * consulta que ya tiene otra version produce un 412 espurio, y sin
 * contexto la pantalla no puede validar aislamiento por sede. Ahora, si no
 * hay `navState` (o le falta `companyId`/`branchId`), se resuelve el
 * contexto con `useWorkContextForInquiries` (igual patron que las demas
 * pantallas) y se carga la consulta real con `getInquiry` para obtener su
 * version autoritativa - nunca se inventa una version por defecto. El
 * resto de campos de `InquiryNavState` que el backend no persiste
 * (destino, fecha, personas - ver inquiries-client.ts) no se pueden
 * recuperar en un deep link: quedan vacios, documentado como limitacion
 * conocida (mismo motivo que Critico #1 de la revision).
 */
/**
 * Decision 22-oct (CON-03/04): solo se ofrecen vehiculos con capacidad >= `partySize` (personas de la
 * consulta). Si el vehiculo no tiene capacidad registrada no se descarta (aviso en la tarjeta).
 */
export function vehicleFitsParty(vehicle: Pick<InquiryVehicle, 'passengerCapacity'>, partySize: number | null | undefined): boolean {
  if (!partySize || partySize < 1) return true;
  if (vehicle.passengerCapacity == null) return true;
  return vehicle.passengerCapacity >= partySize;
}

export function useInquiryVehicles() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const rawNavState = location.state as InquiryNavState | null;
  const { context: resolvedContext, loading: contextLoading } = useWorkContextForInquiries();

  const [navState, setNavState] = useState<InquiryNavState | null>(rawNavState);
  const [state, setState] = useState<InquiryVehiclesState>('LOADING');
  const [vehicles, setVehicles] = useState<InquiryVehicle[]>([]);
  const [quotingVehicleId, setQuotingVehicleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedAtRef = useRef(0);
  const requestIdRef = useRef(0);

  const hasUsableNavState = Boolean(rawNavState?.companyId && rawNavState?.branchId && rawNavState?.version);

  const loadVehicles = useCallback(async (companyId: string, branchId: string, travelDate?: string, travelDays?: number) => {
    const requestId = ++requestIdRef.current;
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const result = await listVehicles(idToken, {
        companyId,
        branchId,
        status: 'AVAILABLE',
        limit: 100,
        offset: 0,
        ...(buildAvailabilityWindow(travelDate, travelDays) ?? {}),
      });
      if (requestId !== requestIdRef.current) return;
      const mapped = result.items
        .map(toInquiryVehicle)
        .filter((v): v is InquiryVehicle => v !== null)
        // Los ocupados van al final (sort estable: se conserva el orden del catalogo).
        .sort((a, b) => Number(b.available) - Number(a.available));
      loadedAtRef.current = Date.now();
      setVehicles(mapped);
      setState(mapped.length === 0 ? 'EMPTY' : 'READY');
    } catch {
      if (requestId !== requestIdRef.current) return;
      setState('RECOVERABLE_ERROR');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveDeepLink() {
      if (hasUsableNavState && rawNavState) {
        setNavState(rawNavState);
        await loadVehicles(rawNavState.companyId, rawNavState.branchId, rawNavState.travelDate, rawNavState.travelDays);
        return;
      }
      if (contextLoading) return;
      if (!id || !resolvedContext) {
        if (!cancelled) setState('RECOVERABLE_ERROR');
        return;
      }
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('Sesión no disponible.');
        const idToken = await user.getIdToken();
        const inquiry = await getInquiry(idToken, id, resolvedContext.companyId, resolvedContext.branchId);
        if (cancelled) return;
        const nextNavState: InquiryNavState = {
          ...resolvedContext,
          // Deep link directo (sin navState previo): el nombre del cliente
          // no esta disponible sin una llamada extra a GET /customers/{id} que
          // este flujo de recuperacion no hace; queda vacio a proposito.
          customerName: '',
          // Bug fix: destination/travelDays SI vienen en la respuesta de
          // GET /inquiries/{id} (InquirySummaryResponse) - antes se
          // pisaban con '' / 1 sin usarlos, lo que hacia que "Cotizar este
          // vehiculo" fallara con 400 (destination vacio no pasa
          // @IsNotEmpty() en QuoteDto) cada vez que se entraba a esta
          // pantalla por link directo o recarga, en vez de navegando desde
          // CON-02 con el formulario recien lleno.
          destination: inquiry.destination ?? '',
          travelDate: inquiry.travelStartDate ?? '',
          travelers: inquiry.partySize ?? 1,
          travelDays: inquiry.estimatedDays ?? 1,
          displayMode: 'PRESENCIAL',
          channel: inquiry.channel as InquiryNavState['channel'],
          touristUse: inquiry.touristUse,
          version: inquiry.version,
        };
        setNavState(nextNavState);
        await loadVehicles(nextNavState.companyId, nextNavState.branchId, nextNavState.travelDate, nextNavState.travelDays);
      } catch {
        if (!cancelled) setState('RECOVERABLE_ERROR');
      }
    }

    void resolveDeepLink();
    return () => {
      cancelled = true;
    };
    // hasUsableNavState/rawNavState derivan de location.state; resolvedContext/contextLoading ya cubren el resto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hasUsableNavState, resolvedContext, contextLoading, loadVehicles]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - loadedAtRef.current >= STALE_AFTER_MS) {
        setState((prev) => (prev === 'READY' ? 'STALE_VERSION' : prev));
      }
    }, STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const refreshAvailability = useCallback(() => {
    if (!navState) return;
    void loadVehicles(navState.companyId, navState.branchId, navState.travelDate, navState.travelDays);
  }, [navState, loadVehicles]);

  /**
   * Hallazgo de revision PR#11 (Critico #4, lado CON-03): antes esta
   * funcion se llamaba "reservar" y, tras cotizar, navegaba directo a
   * `/reservas` (la bandeja generica) como si la reserva ya existiera -
   * la bandeja ignora por completo el estado de navegacion, asi que no
   * pasaba nada util y el usuario quedaba con la impresion de haber
   * reservado. Ahora solo cotiza (transicion real y legitima
   * REGISTRADA/COTIZADA -> COTIZADA) y navega a CON-04 (detalle de la
   * propia consulta), donde el estado real - cotizada, sin reserva creada
   * todavia - se refleja honestamente (ver useInquiryDetail.ts).
   */
  async function quoteVehicle(vehicleId: string) {
    if (!id || !navState || state === 'STALE_VERSION' || state === 'RECOVERABLE_ERROR') return;
    if (vehicles.find((v) => v.id === vehicleId)?.available === false) return;
    setQuotingVehicleId(vehicleId);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      await quoteInquiry(idToken, id, navState.version, navState.companyId, navState.branchId, vehicleId, navState.destination, navState.travelDays || 1);
      navigate(`/consultas/${id}`, { state: navState });
    } catch (err) {
      if (err instanceof InquiryCommandError && (err.status === 409 || err.status === 412)) {
        setState('STALE_VERSION');
      } else if (err instanceof InquiryApiError || err instanceof FleetApiError) {
        setError(err.message);
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
    vehicles,
    quotingVehicleId,
    error,
    quoteVehicle,
    refreshAvailability,
  };
}
