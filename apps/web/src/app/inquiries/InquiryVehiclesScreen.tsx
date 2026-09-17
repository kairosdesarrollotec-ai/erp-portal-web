import { Link } from 'react-router-dom';
import { useInquiryVehicles } from './useInquiryVehicles';
import { estimateQuoteTotal } from './vehicle-catalog';
import styles from './InquiryVehiclesScreen.module.css';

/**
 * CON-03 - Exhibición y cotización. Fuente: PANTALLAS-V3-B-CONSULTA.md.
 * Mejora de auditoría aplicada: "Reservar este vehículo" es la acción
 * dominante de cada tarjeta, sin pasar por CON-04. Catálogo de vehículos
 * MOCK (ver vehicle-catalog.ts) - limitación conocida, Fleet no existe
 * todavía. Estado STALE_VERSION: banner + tarjetas atenuadas + botón
 * deshabilitado (nunca confirma sobre disponibilidad obsoleta).
 */
export function InquiryVehiclesScreen() {
  const { id, navState, state, vehicles, quotingVehicleId, error, reserveVehicle, refreshAvailability } =
    useInquiryVehicles();

  const isStale = state === 'STALE_VERSION';
  const showVirtualEvidence = navState?.displayMode === 'VIRTUAL';

  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.brand}>VeloxRent</span>
        <h1 className={styles.title}>
          {navState?.destination ? `Vehículos disponibles — ${navState.destination}` : 'Vehículos disponibles'}
        </h1>
      </header>

      <div className={styles.content}>
        {isStale && (
          <div className={styles.staleBanner}>
            Esta disponibilidad tiene más de 5 minutos — actualizando...
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
                    {navState?.travelDays ? (
                      <span className={styles.rateTotal}>
                        {' '}
                        · Est. S/ {estimateQuoteTotal(vehicle.dailyRate, navState.travelDays).toFixed(2)} (
                        {navState.travelDays} día{navState.travelDays === 1 ? '' : 's'})
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.badge}>Disponible</span>

                  <button
                    type="button"
                    className={styles.reserveButton}
                    disabled={isStale || quotingVehicleId === vehicle.id}
                    onClick={() => void reserveVehicle(vehicle.id)}
                  >
                    {quotingVehicleId === vehicle.id ? 'Cotizando…' : 'Reservar este vehículo'}
                  </button>

                  <Link to={`/consultas/${id}`} state={navState ?? undefined} className={styles.detailLink}>
                    Ver más detalles
                  </Link>

                  {showVirtualEvidence && (
                    <button type="button" className={styles.secondaryButton}>
                      Enviar evidencia (video 360°)
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
