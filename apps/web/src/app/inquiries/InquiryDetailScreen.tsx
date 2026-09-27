import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInquiryDetail } from './useInquiryDetail';
import { INQUIRY_STATUS_LABELS } from './inquiry-status';
import { AppHeader } from '../shared/AppHeader';
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
 * `convert-to-reservation` (que deja la consulta en CONVERTIDA, un estado
 * TERMINAL) y navegaba a /reservas como si la reserva ya existiera - sin
 * crear ninguna Reservation real (ese comando exige `customerId`,
 * fechas y `branchId` que este frontend no captura en ningún flujo
 * todavía, ver inquiries-client.ts). Convertir la consulta sin una
 * reserva asociada es una pérdida de integridad de datos irreversible.
 * Ahora la acción se muestra deshabilitada con una explicación honesta -
 * la consulta se queda en COTIZADA, que es su estado real, hasta que
 * exista una pantalla de creación de Reserva que junte los datos que
 * faltan.
 */
export function InquiryDetailScreen() {
  const { navState, state, inquiry, saving, actionError, closeWithoutConversion, reload } = useInquiryDetail();
  const navigate = useNavigate();
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeReason, setCloseReason] = useState('');

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
          <p className={styles.customerLabel}>{navState?.customerName ?? inquiry.customer?.name ?? 'Sin cliente registrado'}</p>
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

          {canReserve && (
            <>
              <button
                type="button"
                className={styles.primaryButton}
                disabled
                title="Disponible cuando exista la pantalla de creación de Reserva (captura de cliente y fechas)"
              >
                Crear reserva — no disponible todavía
              </button>
              <p className={styles.helperText}>
                Esta consulta ya tiene una cotización, pero crear la reserva requiere datos que esta pantalla
                todavía no captura (cliente formal y fechas de recojo/devolución). La consulta se mantiene en
                Cotizada hasta que ese flujo exista.
              </p>
            </>
          )}

          {!isClosed && !showCloseForm && (
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
