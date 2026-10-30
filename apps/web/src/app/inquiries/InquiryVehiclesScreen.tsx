import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useInquiryVehicles, vehicleFitsParty } from './useInquiryVehicles';
import { estimateQuoteTotal } from './vehicle-catalog';
import { AppHeader } from '../shared/AppHeader';
import styles from './InquiryVehiclesScreen.module.css';
import { formatLimaDayMonth } from '../shared/lima-time';

/**
 * CON-03 - Exhibición y cotización. Fuente: PANTALLAS-V3-B-CONSULTA.md.
 * El catálogo de vehículos disponibles proviene del módulo Fleet real
 * (ver `useInquiryVehicles.ts` / `fleet-client.ts`), filtrado por la
 * empresa/sede de la consulta y por estado `AVAILABLE`.
 *
 * Hallazgo de revision PR#11 (Critico #3, "actualizar disponibilidad no
 * consulta ninguna fuente"): antes el catalogo era estatico/mock y
 * "Actualizar ahora" solo reiniciaba el reloj de 5 minutos sin consultar
 * ninguna fuente real. Ahora "Actualizar ahora" vuelve a consultar Fleet
 * (`refreshAvailability` -> `listVehicles`); el aviso de 5 minutos se
 * mantiene como recordatorio de que la disponibilidad pudo cambiar desde
 * la ultima carga, no como limitacion de un mock.
 *
 * Hallazgo de revision PR#11 (Critico #4, lado CON-03): "Reservar este
 * vehículo" navegaba a /reservas como si la reserva ya existiera. Ahora
 * el boton dice "Cotizar este vehículo" (lo unico que realmente hace:
 * transicion REGISTRADA/pendiente -> COTIZADA) y navega a CON-04, donde
 * el estado real de la consulta se refleja sin inventar una reserva.
 */
/** dd/mm en hora de Lima a partir de un ISO date-time. */
function formatDayMonth(iso: string): string {
  return formatLimaDayMonth(iso);
}

export function InquiryVehiclesScreen() {
  const { id, navState, state, vehicles, quotingVehicleId, error, quoteVehicle, refreshAvailability } =
    useInquiryVehicles();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const isStale = state === 'STALE_VERSION';
  const showVirtualEvidence = navState?.displayMode === 'VIRTUAL';

  const filteredVehicles = vehicles.filter((v) => {
    // CR-11 / respuesta 29-oct #10: la capacidad solo INFORMA al cliente, no oculta ni bloquea el vehículo.
    const q = search.trim().toLowerCase();
    const matchesSearch = q === '' || v.model.toLowerCase().includes(q);
    const matchesMin = priceMin === '' || v.dailyRate >= Number(priceMin);
    const matchesMax = priceMax === '' || v.dailyRate <= Number(priceMax);
    return matchesSearch && matchesMin && matchesMax;
  });

  const allBusy = vehicles.length > 0 && vehicles.every((v) => !v.available);

  if (state === 'LOADING') {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>Cargando vehículos…</p>
      </main>
    );
  }

  if (state === 'RECOVERABLE_ERROR' || !navState) {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>
          No pudimos cargar esta consulta. Vuelve a la bandeja e intenta de nuevo.
        </p>
        <button type="button" className={styles.secondaryButton} onClick={() => navigate('/consultas')}>
          Volver a la bandeja
        </button>
      </main>
    );
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader
        pageTitle={navState.destination ? `Disponibles — ${navState.destination}` : 'Vehículos disponibles'}
        actions={
          <Link to={`/consultas/${id}`} state={navState ?? undefined} className={styles.backButton} aria-label="Volver al detalle de la consulta">
            <ChevronLeft size={16} aria-hidden="true" />
            Consultas
          </Link>
        }
      />

      <div className={styles.content}>
        {isStale && (
          <div className={styles.staleBanner}>
            Esta vista tiene más de 5 minutos — vuelve a cargarla antes de cotizar.
            <button type="button" className={styles.refreshButton} onClick={refreshAvailability}>
              Actualizar ahora
            </button>
          </div>
        )}

        {error && <p className={styles.errorText}>{error}</p>}

        {state === 'EMPTY' && <p className={styles.statusText}>No hay vehículos elegibles para esta consulta.</p>}

        {state !== 'EMPTY' && (
          <>
            <div className={styles.filters}>
              <label className={styles.filterField}>
                <span className={styles.filterLabel}>Buscar</span>
                <input
                  className={styles.filterInput}
                  type="search"
                  placeholder="Marca o modelo…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar por marca o modelo"
                />
              </label>
              <label className={styles.filterField}>
                <span className={styles.filterLabel}>Precio mín. (S/)</span>
                <input
                  className={styles.filterInput}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  aria-label="Tarifa diaria mínima"
                />
              </label>
              <label className={styles.filterField}>
                <span className={styles.filterLabel}>Precio máx. (S/)</span>
                <input
                  className={styles.filterInput}
                  type="number"
                  min={0}
                  placeholder="Sin límite"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  aria-label="Tarifa diaria máxima"
                />
              </label>
            </div>

            {allBusy && (
              <p className={styles.busyNotice} role="status">
                Todos los vehículos están ocupados en las fechas de este viaje. Cambia las fechas de la consulta o
                revisa más tarde.
              </p>
            )}

            {filteredVehicles.length === 0 && (
              <p className={styles.statusText}>No hay vehículos que coincidan con los filtros aplicados.</p>
            )}

          <div className={styles.grid}>
            {filteredVehicles.map((vehicle) => {
              const reasonId = `unavailable-${vehicle.id}`;
              const conflictFrom = vehicle.conflictFrom ? formatDayMonth(vehicle.conflictFrom) : '';
              const conflictTo = vehicle.conflictTo ? formatDayMonth(vehicle.conflictTo) : '';
              return (
              <article
                key={vehicle.id}
                className={`${styles.card} ${isStale ? styles.cardStale : ''} ${vehicle.available ? '' : styles.cardUnavailable}`}
              >
                <img className={styles.photo} src={vehicle.photoUrl} alt={vehicle.model} />
                <div className={styles.cardBody}>
                  <h2 className={styles.model}>{vehicle.model}</h2>
                  <span className={styles.rate}>
                    S/ {vehicle.dailyRate.toFixed(2)} / día
                    {navState.travelDays ? (
                      <span className={styles.rateTotal}>
                        {' '}
                        · Est. S/ {estimateQuoteTotal(vehicle.dailyRate, navState.travelDays).toFixed(2)} (
                        {navState.travelDays} día{navState.travelDays === 1 ? '' : 's'})
                      </span>
                    ) : null}
                  </span>

                  <span className={styles.rateTotal}>
                    {vehicle.passengerCapacity != null ? `Capacidad: ${vehicle.passengerCapacity} pasajeros` : 'Capacidad no registrada'}
                  </span>
                  {!vehicleFitsParty(vehicle, navState?.travelers) && (
                    <p className={styles.busyNotice} role="status" data-testid="capacity-info">
                      Este vehículo tiene capacidad para {vehicle.passengerCapacity} pasajeros y el cliente indicó {navState?.travelers}. Informa al cliente; no bloquea la cotización.
                    </p>
                  )}
                  {vehicle.vehicleWarnings.map((warning) => (
                    <p key={warning} className={styles.busyNotice} role="status">
                      {warning}
                    </p>
                  ))}

                  {!vehicle.available && (
                    <p id={reasonId} className={styles.unavailableReason}>
                      <strong>No disponible en estas fechas</strong>
                      {conflictFrom && conflictTo && (
                        <span className={styles.unavailableDates}>Ocupado del {conflictFrom} al {conflictTo}</span>
                      )}
                    </p>
                  )}

                  <button
                    type="button"
                    className={styles.reserveButton}
                    disabled={isStale || !vehicle.available || quotingVehicleId === vehicle.id}
                    aria-describedby={vehicle.available ? undefined : reasonId}
                    onClick={() => void quoteVehicle(vehicle.id)}
                  >
                    {quotingVehicleId === vehicle.id ? 'Cotizando…' : 'Cotizar este vehículo'}
                  </button>

                  <Link to={`/consultas/${id}`} state={navState ?? undefined} className={styles.detailLink}>
                    Ver más detalles
                  </Link>

                  {showVirtualEvidence && (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled
                      title="Disponible cuando exista el flujo real de evidencia (video 360°)"
                    >
                      Enviar evidencia (video 360°) — no disponible todavía
                    </button>
                  )}
                </div>
              </article>
              );
            })}
          </div>
          </>
        )}
      </div>
    </main>
  );
}
