import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInquiryDetail } from './useInquiryDetail';
import { INQUIRY_STATUS_LABELS } from './inquiry-status';
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
 */
export function InquiryDetailScreen() {
  const { navState, state, inquiry, customerName, saving, actionError, closeWithoutConversion, convertToReservation, reload } =
    useInquiryDetail();
  const navigate = useNavigate();
  const { can } = useRolePermissions();
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [showReserveForm, setShowReserveForm] = useState(false);
  const [channelMode, setChannelMode] = useState<'PRESENCIAL' | 'VIRTUAL'>('PRESENCIAL');
  const [startAt, setStartAt] = useState('');

  async function handleReserve() {
    if (!startAt) return;
    const reservationId = await convertToReservation(channelMode, new Date(startAt).toISOString());
    if (reservationId) navigate(`/reservas/${reservationId}`);
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
  const isClosed = inquiry.status === 'CERRADA_SIN_CONVERSION';

  const timelineEvents = [
    ...(inquiry.interactions ?? []).map((item) => ({
      id: item.id,
      label: item.type,
      detail: item.note,
      at: item.occurredAt,
    })),
    ...(inquiry.quotations ?? []).map((item) => ({
      id: item.id,
      label: `Cotización — ${item.vehicleId}`,
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
              <dd>{latestQuotation ? latestQuotation.vehicleId : 'Sin cotizar todavía'}</dd>
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
            <button type="button" className={styles.primaryButton} onClick={() => setShowReserveForm(true)}>
              Reservar este vehículo
            </button>
          )}

          {canReserve && inquiry.customerId && showReserveForm && (
            <div className={styles.closeForm}>
              <label htmlFor="reserve-channel-mode">Modalidad</label>
              <select
                id="reserve-channel-mode"
                value={channelMode}
                onChange={(event) => setChannelMode(event.target.value as 'PRESENCIAL' | 'VIRTUAL')}
              >
                <option value="PRESENCIAL">Presencial</option>
                <option value="VIRTUAL">Virtual</option>
              </select>
              <label htmlFor="reserve-start-at">Fecha y hora de inicio</label>
              <input
                id="reserve-start-at"
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
              />
              <div className={styles.closeActions}>
                <button type="button" className={styles.primaryButton} disabled={!startAt || saving} onClick={() => void handleReserve()}>
                  {saving ? 'Creando reserva…' : 'Confirmar reserva'}
                </button>
                <button type="button" className={styles.linkButton} onClick={() => setShowReserveForm(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!latestQuotation && !isClosed && (
            <>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => navigate(`/consultas/${inquiry.id}/vehiculos`, { state: navState ?? undefined })}
              >
                Cotizar vehículo
              </button>
              <p className={styles.helperText}>
                Esta consulta todavía no tiene una cotización. Continúa para elegir el vehículo y generar el precio.
              </p>
            </>
          )}

          {!isClosed && !showCloseForm && can('INQUIRY', 'CLOSE') && (
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

          {isClosed && <p className={styles.closedMessage}>Esta consulta fue cerrada sin conversión.</p>}
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
