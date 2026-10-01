import { Link, useNavigate } from 'react-router-dom';
import { useRentalsList } from './useRentalsList';
import { RENTAL_STATUS_LABELS, rentalStageForStatus, rentalWizardPathForStatus } from './rental-status';
import { AppHeader } from '../shared/AppHeader';
import styles from './RentalsListScreen.module.css';

/**
 * ALQ-01 - Bandeja de Alquileres. Fuente: PANTALLAS-V3-B-ALQUILER.md.
 * Tabla (desktop) / tarjetas (movil, via CSS) con Cliente, Vehiculo, Etapa,
 * Empresa. El boton "Continuar" por fila lleva directo a la etapa del
 * asistente de Entrega donde se quedo el expediente.
 */
export function RentalsListScreen() {
  const { state, rentals, context } = useRentalsList();
  const navigate = useNavigate();

  function openRental(rental: (typeof rentals)[number]) {
    navigate(rentalWizardPathForStatus(rental.id, rental.status), { state: context ?? undefined });
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader
        pageTitle="Alquileres"
        actions={
          <Link to="/alquileres/nuevo" state={context ?? undefined} className={styles.newButton}>
            Nuevo alquiler
          </Link>
        }
      />

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
                        {rental.status !== 'CLOSED' && rental.status !== 'CANCELLED' && (
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
