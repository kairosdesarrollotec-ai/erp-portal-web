import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useInquiryVehicles } from './useInquiryVehicles';
import { estimateQuoteTotal } from './vehicle-catalog';
import styles from './InquiryVehiclesScreen.module.css';

/**
 * CON-03 - Exhibición y cotización. Fuente: PANTALLAS-V3-B-CONSULTA.md.
 * Catálogo de vehículos MOCK (ver vehicle-catalog.ts) - limitación
 * conocida, Fleet no existe todavía.
 *
 * Hallazgo de revision PR#11 (Critico #3, "actualizar disponibilidad no
 * consulta ninguna fuente"): el catalogo es estatico/mock - "Actualizar
 * ahora" solo reinicia el reloj de 5 minutos, nunca consulta una fuente
 * real de disponibilidad. Antes esto no se comunicaba en ningun lado;
 * ahora hay un banner permanente "Catálogo de demostración" (no solo
 * cuando esta STALE) para que nunca se presente como vigente/operativo.
 *
 * Hallazgo de revision PR#11 (Critico #4, lado CON-03): "Reservar este
 * vehículo" navegaba a /reservas como si la reserva ya existiera. Ahora
 * el boton dice "Cotizar este vehículo" (lo unico que realmente hace:
 * transicion REGISTRADA/pendiente -> COTIZADA) y navega a CON-04, donde
 * el estado real de la consulta se refleja sin inventar una reserva.
 */
export function InquiryVehiclesScreen() {
  const { id, navState, state, vehicles, quotingVehicleId, error, quoteVehicle, refreshAvailability } =
    useInquiryVehicles();
  const navigate = useNavigate();

  const isStale = state === 'STALE_VERSION';
  const showVirtualEvidence = navState?.displayMode === 'VIRTUAL';

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
      <header className={styles.header}>
        <Link to={`/consultas/${id}`} state={navState ?? undefined} className={styles.backButton} aria-label="Volver al detalle de la consulta">
          <ChevronLeft size={16} aria-hidden="true" />
          Consultas
        </Link>
        <span className={styles.headerDivider} aria-hidden="true" />
        <span className={styles.brand}>VeloxRent</span>
        <h1 className={styles.title}>
          {navState.destination ? `Disponibles — ${navState.destination}` : 'Vehículos disponibles'}
        </h1>
      </header>

      <div className={styles.content}>
        <p className={styles.demoBanner}>
          Catálogo de demostración: la disponibilidad no proviene de Fleet (todavía no existe como servicio) — no
          refleja el estado real de la flota.
        </p>

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
          <div className={styles.grid}>
            {vehicles.map((vehicle) => (
              <article key={vehicle.id} className={`${styles.card} ${isStale ? styles.cardStale : ''}`}>
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
                  <span className={styles.badge}>Demo</span>

                  <button
                    type="button"
                    className={styles.reserveButton}
                    disabled={isStale || quotingVehicleId === vehicle.id}
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
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
