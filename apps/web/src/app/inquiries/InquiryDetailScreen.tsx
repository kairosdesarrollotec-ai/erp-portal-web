import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInquiryDetail } from './useInquiryDetail';
import { INQUIRY_STATUS_LABELS } from './inquiry-status';
import { rentalWizardPathForStatus } from '../rentals/rental-status';
import { AppHeader } from '../shared/AppHeader';
import { useRolePermissions } from '../shared/useRolePermissions';
import styles from './InquiryDetailScreen.module.css';

/**
 * CON-04 - Detalle, cierre o conversión. Fuente: PANTALLAS-V3-B-CONSULTA.md.
 * Aqui se usa para reabrir una consulta desde la bandeja, ver su
 * cotización, o cerrarla sin conversión (motivo obligatorio, BR-CON-003).
 * Timeline: interactions + quotations combinadas y ordenadas por fecha;
 * desktop lateral, tablet/móvil en acordeón "Ver historial".
 *
 * Hallazgo de revision PR#11 (Critico #4, "conversión/reserva
 * incompleta"): antes "Reservar este vehículo" llamaba al comando
 * `convert-to-reservation` sin capturar `channelMode`/`startAt`, que el
 * backend exige para crear la Reservation real en la misma transaccion
 * (ver inquiries-client.ts). Reactivado: este formulario captura esos 2
 * datos (los unicos que faltaban) y crea la reserva real, navegando a
 * RES-04/05 (`/reservas/:id`), consistente con el flujo documentado en
 * PANTALLAS-V3-B-RESERVA.md. Exige ademas `inquiry.customerId` (una
 * consulta de prospecto sin cliente formal no puede convertirse -
 * `CUSTOMER_REQUIRED_FOR_CONVERSION`, ver decision-log.md NOTA-PR7).
 *
 * "Convertir a Alquiler" (oct 2026, a pedido de Russbel): junto a "Reservar este
 * vehiculo" se ofrecen SIEMPRE ambas salidas; todo alquiler pasa por Consulta
 * (ya no existe "Nuevo alquiler" en ALQ-01). Llama a
 * `convert-to-rental` y navega al expediente del alquiler creado.
 *
 * Correccion (oct 2026, a pedido de Russbel):
 * - El vehiculo cotizado se mostraba como UUID crudo - se resuelve ahora
 *   via Flota (ver useInquiryDetail.ts, mismo patron que customerName).
 * - La fecha de inicio se pedia vacia, aunque CON-02 ya captura una
 *   fecha de viaje aproximada (`inquiry.travelStartDate`) - PANTALLAS-V3-B-
 *   RESERVA.md (RES-04, punto 15) es tajante: "Cliente, vehiculo, fechas,
 *   destino - vienen de CON-02/CON-03, nunca se vuelven a pedir". Se
 *   prellena con esa fecha; el usuario solo confirma/ajusta la hora
 *   exacta de inicio (dato que CON-02 nunca captura - "periodo" es
 *   duracion estimada, no una hora de recojo).
 * - La modalidad (presencial/remota) NO es una pregunta libre segun el
 *   diseno: BR-RES-005/DAT-RES-001 la calculan a partir de la ubicacion
 *   del cliente (Ayacucho + puede acercarse -> presencial; si no,
 *   remota). Ese dato de ubicacion no se captura todavia en Consulta, asi
 *   que esto cae exactamente en la excepcion que el propio contrato de
 *   RES-04 prevé ("revelado progresivo": la modalidad "solo se convierte
 *   en pregunta editable si el sistema no puede determinarla
 *   automaticamente") - se reformula con esa pregunta exacta en vez de un
 *   selector generico Presencial/Virtual.
 */
export function InquiryDetailScreen() {
  const { navState, context, state, inquiry, customerName, vehicleLabel, vehiclePhotoUrl, saving, actionError, closeWithoutConversion, convertToReservation, convertToRental, reload } =
    useInquiryDetail();
  const navigate = useNavigate();
  const { can } = useRolePermissions();
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [showReserveForm, setShowReserveForm] = useState(false);
  /** null = sin responder todavia (caso excepcional, ver nota arriba). */
  const [canComeToOffice, setCanComeToOffice] = useState<boolean | null>(null);
  const [startAt, setStartAt] = useState('');

  // Prellena con la fecha de viaje ya capturada en CON-02 (si existe) -
  // el usuario solo ajusta la hora, nunca se le pide la fecha de cero.
  function openReserveForm() {
    if (inquiry?.travelStartDate && !startAt) {
      setStartAt(`${inquiry.travelStartDate.slice(0, 10)}T09:00`);
    }
    setShowReserveForm(true);
  }

  async function handleReserve() {
    if (!startAt || canComeToOffice === null) return;
    const channelMode = canComeToOffice ? 'PRESENCIAL' : 'VIRTUAL';
    const reservationId = await convertToReservation(channelMode, new Date(startAt).toISOString());
    if (reservationId) navigate(`/reservas/${reservationId}`);
  }

  async function handleConvertToRental() {
    const rental = await convertToRental();
    if (rental) {
      navigate(rentalWizardPathForStatus(rental.id, (rental.status ?? 'DRAFT') as Parameters<typeof rentalWizardPathForStatus>[1]), {
        state: context ?? undefined,
      });
    }
  }

  if (state === 'LOADING') {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>Cargando consulta…</p>
      </main>
    );
  }

  if (state === 'RECOVERABLE_ERROR' || !inquiry) {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>No pudimos cargar esta consulta. Vuelve a la bandeja e intenta de nuevo.</p>
        <button type="button" className={styles.linkButton} onClick={() => navigate('/consultas')}>
          Volver a la bandeja
        </button>
      </main>
    );
  }

  const latestQuotation = inquiry.quotations?.[inquiry.quotations.length - 1] ?? null;
  const canReserve = Boolean(latestQuotation) && inquiry.status !== 'CONVERTIDA' && inquiry.status !== 'CERRADA_SIN_CONVERSION';
  const isTerminal = inquiry.status === 'CERRADA_SIN_CONVERSION' || inquiry.status === 'CONVERTIDA';

  /**
   * Bug (hallazgo Russbel, ronda 2 - "Cambiar vehiculo" dejaba CON-03
   * bloqueada con el aviso de staleness sin importar cuantas veces se
   * actualizara): `navState` es el estado de navegacion CON-02->CON-03
   * original, congelado desde que se entro a esta pantalla - su
   * `version` nunca se actualiza cuando `inquiry.version` avanza (por
   * ejemplo, al cotizar un vehiculo, que es justo lo que pasa antes de
   * poder pulsar "Cambiar vehiculo"). Reenviar ese `navState` tal cual
   * mandaba a CON-03 un `version` desactualizado, que el backend
   * rechazaba con 409/412 en cuanto se intentaba cotizar - y
   * "Actualizar ahora" en CON-03 solo reconsulta Flota, nunca la version
   * de la consulta, asi que el error no se podia resolver desde ahi. Se
   * corrige mezclando siempre la `version` vigente de `inquiry` (la que
   * SI se mantiene actualizada via reload()) sobre el navState heredado.
   */
  const vehiclesNavState = navState ? { ...navState, version: inquiry.version } : undefined;

  const timelineEvents = [
    ...(inquiry.interactions ?? []).map((item) => ({
      id: item.id,
      label: item.type,
      detail: item.note,
      at: item.occurredAt,
    })),
    ...(inquiry.quotations ?? []).map((item) => ({
      id: item.id,
      // UUID crudo quitado del label (mismo bug que el panel de resumen) -
      // el timeline no resuelve nombre por cada cotizacion historica
      // (podria haber varias, solo se resuelve la vigente), asi que se deja
      // generico en vez de un UUID sin contexto.
      label: 'Cotización registrada',
      detail: item.destination,
      at: item.createdAt,
    })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <main className={styles.wrapper}>
      <AppHeader
        actions={
          <button type="button" className={styles.linkButton} onClick={() => navigate('/consultas')}>
            Volver a la bandeja
          </button>
        }
      />

      <div className={styles.content}>
        {state === 'SYNC_CONFLICT' && (
          <div className={styles.conflictBanner}>
            Esta consulta cambió por otra operación mientras la veías.{' '}
            <button type="button" className={styles.linkButton} onClick={() => void reload()}>
              Recargar
            </button>
          </div>
        )}

        <div className={styles.summaryPanel}>
          <p className={styles.customerLabel}>{navState?.customerName ?? customerName ?? 'Sin cliente registrado'}</p>
          <dl className={styles.summaryList}>
            <div>
              <dt>Vehículo cotizado</dt>
              <dd className={styles.vehicleSummary}>
                {latestQuotation && vehiclePhotoUrl && (
                  <img className={styles.vehicleThumb} src={vehiclePhotoUrl} alt={vehicleLabel ?? 'Vehículo cotizado'} />
                )}
                <span>{latestQuotation ? (vehicleLabel ?? 'Cargando…') : 'Sin cotizar todavía'}</span>
                {latestQuotation && !isTerminal && inquiry.status !== 'CONVERTIDA' && (
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => navigate(`/consultas/${inquiry.id}/vehiculos`, { state: vehiclesNavState })}
                  >
                    Cambiar vehículo
                  </button>
                )}
              </dd>
            </div>
            <div>
              <dt>Fecha de registro</dt>
              <dd>{new Date(inquiry.createdAt).toLocaleDateString('es-PE')}</dd>
            </div>
            <div>
              <dt>Canal</dt>
              <dd>{inquiry.channel}</dd>
            </div>
          </dl>

          <details className={styles.mobileTimeline}>
            <summary>Ver historial</summary>
            <Timeline events={timelineEvents} />
          </details>

          <div className={styles.desktopTimeline}>
            <h2 className={styles.timelineTitle}>Historial</h2>
            <Timeline events={timelineEvents} />
          </div>
        </div>

        <div className={styles.mainPanel}>
          <span className={styles.badge}>{INQUIRY_STATUS_LABELS[inquiry.status]}</span>

          {actionError && <p className={styles.errorText}>{actionError}</p>}

          {canReserve && !inquiry.customerId && (
            <p className={styles.helperText}>
              Esta consulta no tiene un cliente formal asociado (fue registrada como prospecto), así que no se
              puede convertir en reserva. Vincula un cliente para continuar.
            </p>
          )}

          {canReserve && inquiry.customerId && !showReserveForm && (
            <div className={styles.closeActions}>
              <button type="button" className={styles.primaryButton} onClick={openReserveForm} disabled={saving}>
                Reservar este vehículo
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => void handleConvertToRental()} disabled={saving}>
                {saving ? 'Convirtiendo…' : 'Convertir a Alquiler'}
              </button>
            </div>
          )}

          {canReserve && inquiry.customerId && showReserveForm && (
            <div className={styles.reserveForm}>
              <p className={styles.reserveFormTitle}>Confirmar datos de la reserva</p>

              <div className={styles.fieldGroup}>
                <label htmlFor="reserve-start-at" className={styles.fieldLabel}>
                  Fecha y hora de inicio
                </label>
                <p className={styles.fieldHint}>
                  Tomada de la fecha de viaje ya registrada en la consulta — solo ajusta la hora si hace falta.
                </p>
                <input
                  id="reserve-start-at"
                  type="datetime-local"
                  className={styles.fieldInput}
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <p className={styles.fieldLabel}>¿El cliente puede acercarse a oficina?</p>
                <p className={styles.fieldHint}>
                  Esta modalidad es distinta a la registrada en Consulta (esa es sobre cómo se mostró el
                  vehículo). Aquí se trata de la ubicación del cliente para firmar y recibir el vehículo —
                  un dato que todavía no capturamos antes de este paso.
                </p>
                <div className={styles.modalityButtons}>
                  <button
                    type="button"
                    className={canComeToOffice === true ? styles.modalityButtonActive : styles.modalityButton}
                    onClick={() => setCanComeToOffice(true)}
                  >
                    Sí — presencial
                  </button>
                  <button
                    type="button"
                    className={canComeToOffice === false ? styles.modalityButtonActive : styles.modalityButton}
                    onClick={() => setCanComeToOffice(false)}
                  >
                    No — remota
                  </button>
                </div>
              </div>

              <div className={styles.closeActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!startAt || canComeToOffice === null || saving}
                  onClick={() => void handleReserve()}
                >
                  {saving ? 'Creando reserva…' : 'Confirmar reserva'}
                </button>
                <button type="button" className={styles.linkButton} onClick={() => setShowReserveForm(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!latestQuotation && !isTerminal && (
            <>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => navigate(`/consultas/${inquiry.id}/vehiculos`, { state: vehiclesNavState })}
              >
                Cotizar vehículo
              </button>
              <p className={styles.helperText}>
                Esta consulta todavía no tiene una cotización. Continúa para elegir el vehículo y generar el precio.
              </p>
            </>
          )}

          {!isTerminal && !showCloseForm && can('INQUIRY', 'CLOSE') && (
            <button type="button" className={styles.dangerLink} onClick={() => setShowCloseForm(true)}>
              Cerrar sin conversión
            </button>
          )}

          {showCloseForm && (
            <div className={styles.closeForm}>
              <p className={styles.closeQuestion}>¿Por qué cierras esta consulta sin conversión?</p>
              <textarea
                className={styles.closeReason}
                placeholder="Motivo del cierre (obligatorio)"
                value={closeReason}
                onChange={(event) => setCloseReason(event.target.value)}
              />
              <div className={styles.closeActions}>
                <button
                  type="button"
                  className={styles.dangerButton}
                  disabled={saving || closeReason.trim().length === 0}
                  onClick={() => void closeWithoutConversion(closeReason.trim())}
                >
                  {saving ? 'Cerrando…' : 'Confirmar cierre'}
                </button>
                <button type="button" className={styles.linkButton} onClick={() => setShowCloseForm(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {inquiry.status === 'CERRADA_SIN_CONVERSION' && <p className={styles.closedMessage}>Esta consulta fue cerrada sin conversión.</p>}
        </div>
      </div>
    </main>
  );
}

function Timeline({ events }: { events: Array<{ id: string; label: string; detail?: string; at: string }> }) {
  if (events.length === 0) {
    return <p className={styles.emptyTimeline}>Sin eventos registrados todavía.</p>;
  }
  return (
    <ol className={styles.timeline}>
      {events.map((event) => (
        <li key={event.id} className={styles.timelineItem}>
          <span className={styles.timelineDate}>{new Date(event.at).toLocaleString('es-PE')}</span>
          <span className={styles.timelineLabel}>{event.label}</span>
          {event.detail && <span className={styles.timelineDetail}>{event.detail}</span>}
        </li>
      ))}
    </ol>
  );
}
