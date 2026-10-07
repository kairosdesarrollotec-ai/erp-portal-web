import { Link, useNavigate } from 'react-router-dom';
import { useRentalsList } from './useRentalsList';
import { RENTAL_STATUS_LABELS, rentalStageForStatus, rentalWizardPathForStatus } from './rental-status';
import { AppHeader } from '../shared/AppHeader';
import { useIncidentPermissions } from '../incidents/incident-permissions';
import styles from './RentalsListScreen.module.css';

/**
 * ALQ-01 - Bandeja de Alquileres. Fuente: PANTALLAS-V3-B-ALQUILER.md.
 * Tabla (desktop) / tarjetas (movil, via CSS) con Cliente, Vehiculo, Etapa,
 * Empresa. El boton "Continuar" por fila lleva directo a la etapa del
 * asistente de Entrega donde se quedo el expediente. No hay boton
 * "Nuevo alquiler": todo alquiler nace de una Consulta (CON-04 ->
 * "Convertir a Alquiler").
 */
export function RentalsListScreen() {
  const { state, rentals, context } = useRentalsList();
  const navigate = useNavigate();
  const { can: canIncident } = useIncidentPermissions();

  function openRental(rental: (typeof rentals)[number]) {
    // ACTIVE ya no pertenece al asistente de Entrega: el alquiler en curso se
    // devuelve desde el modulo Devolucion (ALQ-10 -> DEV-02/DEV-01).
    if (rental.status === 'RETURN_IN_PROGRESS') {
      navigate('/devoluciones', { state: context ?? undefined });
      return;
    }
    if (rental.status === 'ACTIVE') {
      startReturn(rental);
      return;
    }
    navigate(rentalWizardPathForStatus(rental.id, rental.status), { state: context ?? undefined });
  }

  /** ALQ-10 -> DEV-02: "Iniciar devolucion" en 1 accion (PANTALLAS-V3-B-DEVOLUCION.md). */
  function startReturn(rental: (typeof rentals)[number]) {
    navigate(`/devoluciones/recepcion/${rental.id}`, { state: context ?? undefined });
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Alquileres" />

      <div className={styles.content}>
        {state === 'LOADING' && <p className={styles.statusText}>Cargando alquileres…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>
            No pudimos cargar la bandeja de alquileres. Intenta de nuevo en unos segundos.
          </p>
        )}

        {state === 'EMPTY' && <p className={styles.statusText}>Todavía no hay alquileres registrados.</p>}

        {state === 'READY' && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  <th>Etapa</th>
                  <th>Empresa</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rentals.map((rental) => {
                  const stage = rentalStageForStatus(rental.status);
                  return (
                    <tr key={rental.id} className={styles.row} onClick={() => openRental(rental)}>
                      <td data-label="Cliente">{rental.customerName}</td>
                      <td data-label="Vehículo">
                        {rental.vehicleBrand} {rental.vehicleModel} - {rental.vehiclePlate}
                      </td>
                      <td data-label="Etapa">
                        <span className={`${styles.badge} ${styles[`badge_${rental.status}`] ?? ''}`}>
                          {RENTAL_STATUS_LABELS[rental.status]}
                        </span>
                        {stage && (
                          <div className={styles.progressTrack} aria-hidden="true">
                            <div className={styles.progressFill} style={{ width: `${(stage / 5) * 100}%` }} />
                          </div>
                        )}
                      </td>
                      <td data-label="Empresa">{context?.companyName ?? '—'}</td>
                      <td>
                        {rental.status === 'ACTIVE' && (
                          <button
                            type="button"
                            className={styles.continueButton}
                            aria-label={`Iniciar devolución de ${rental.vehiclePlate}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              startReturn(rental);
                            }}
                          >
                            Iniciar devolución
                          </button>
                        )}
                        {rental.status === 'RETURN_IN_PROGRESS' && (
                          <button
                            type="button"
                            className={styles.continueButton}
                            aria-label={`Continuar devolución de ${rental.vehiclePlate}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openRental(rental);
                            }}
                          >
                            Continuar devolución
                          </button>
                        )}
                        {(rental.status === 'ACTIVE' || rental.status === 'EXTENSION_PENDING' || rental.status === 'RETURN_IN_PROGRESS') &&
                          canIncident('VIEW') && (
                            // ALQ-10 -> INC-01: incidencias del expediente (ver o registrar).
                            <Link
                              to={`/incidencias?rentalId=${rental.id}`}
                              state={context ?? undefined}
                              className={styles.secondaryLink}
                              aria-label={`Ver o registrar incidencias de ${rental.vehiclePlate}`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              Ver/Registrar incidencias
                            </Link>
                          )}
                        {rental.status !== 'CLOSED' &&
                          rental.status !== 'CANCELLED' &&
                          rental.status !== 'ACTIVE' &&
                          rental.status !== 'RETURN_IN_PROGRESS' && (
                            <button
                              type="button"
                              className={styles.continueButton}
                              onClick={(event) => {
                                event.stopPropagation();
                                openRental(rental);
                              }}
                            >
                              Continuar
                            </button>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
