import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { AppHeader } from '../shared/AppHeader';
import { getFirebaseAuth } from '../providers/firebase';
import { HrFrame } from './HrFrame';
import { HrCommandError, advanceFieldTripTimeout, authorizeFieldTrip, getFieldTrip, rejectFieldTrip, type FieldTrip } from './hr-client';
import { HrDialog } from './HrDialog';
import {
  CASCADE_LEVEL_LABEL,
  FIELD_TRIP_STATUS_LABEL,
  formatCountdown,
  levelTimeoutAt,
  pendingLevel,
  remainingSeconds,
} from './hr-domain';
import { formatDateTime } from './hr-format';
import { useHrPermissions } from './hr-permissions';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import { useNow } from './useNow';
import styles from './HrFlow.module.css';
import dialogStyles from './HrDialog.module.css';

const POLL_MS = 10_000;

/**
 * ADP-07 - Cola de autorizacion de salida a campo (BR-ADP-004). Mobile-first. Cascada de 3 niveles
 * exactos (genericos: Nivel 1 de 3, 2 de 3, 3 de 3; los decide el permiso, no una persona), 5 minutos por nivel. Los plazos los fija y avanza el SERVIDOR
 * (advance-timeout): el cliente solo muestra la cuenta regresiva y pide el avance cuando vence.
 * Si los 3 niveles no responden: "Sin autorizacion". Nunca hay aprobacion automatica ni un 4º nivel.
 */
function FieldTripAuthorization() {
  const { tripId } = useParams();
  const { can } = useHrPermissions();
  const { state, data: trip, context, reload, setData } = useHrResource<FieldTrip>(tripId ? (token) => getFieldTrip(token, tripId) : null, tripId ?? '');
  const command = useHrCommand({ context, reload });
  const approveRef = useRef<HTMLButtonElement>(null);
  const advancedFor = useRef<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonSubmitted, setReasonSubmitted] = useState(false);

  const level = trip ? pendingLevel(trip.status) : null;
  const now = useNow(level !== null);
  const timeoutAt = trip && level ? levelTimeoutAt(trip, level) : null;
  const remaining = timeoutAt ? remainingSeconds(timeoutAt, now) : null;
  const canAuthorize = can('AUTHORIZE_FIELD_TRIP') && level !== null;
  // advance-timeout lo exige AUTHORIZE_FIELD_TRIP en el servidor.
  const canOperate = can('AUTHORIZE_FIELD_TRIP');

  // Foco en el boton principal al cargar la solicitud pendiente.
  useEffect(() => {
    if (canAuthorize) approveRef.current?.focus();
  }, [canAuthorize, trip?.status]);

  // Actualiza la solicitud mientras espera (otro nivel puede haber respondido).
  useEffect(() => {
    if (level === null) return;
    const timer = setInterval(() => void reload(), POLL_MS);
    return () => clearInterval(timer);
  }, [level, reload]);

  // Al vencer el plazo del nivel, le pide al servidor que avance la cascada (una sola vez por estado).
  useEffect(() => {
    if (!trip || level === null || remaining === null || remaining > 0 || !canOperate) return;
    const key = `${trip.id}:${trip.status}`;
    if (advancedFor.current === key) return;
    advancedFor.current = key;
    void (async () => {
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();
        setData(await advanceFieldTripTimeout(idToken, trip.id));
      } catch (err) {
        if (err instanceof HrCommandError && err.problem?.code === 'FIELD_TRIP_TIMEOUT_NOT_ELAPSED') {
          // El reloj de este equipo va adelantado respecto del servidor: se reintenta en unos segundos.
          advancedFor.current = null;
          setTimeout(() => setRetryTick((n) => n + 1), 3000);
        } else {
          void reload();
        }
      }
    })();
  }, [trip, level, remaining, canOperate, reload, setData, retryTick]);

  async function approve() {
    if (!trip || level === null) return;
    const res = await command.run((token) => authorizeFieldTrip(token, trip.id, level), 'No pudimos registrar la autorización. Intenta de nuevo.');
    if (res.ok) {
      setData(res.value);
      command.setNotice('Salida autorizada.');
    }
  }

  async function reject(event: FormEvent) {
    event.preventDefault();
    setReasonSubmitted(true);
    if (!trip || reason.trim().length < 5) return;
    const res = await command.run((token) => rejectFieldTrip(token, trip.id, reason.trim()), 'No pudimos registrar el rechazo. Intenta de nuevo.');
    if (res.ok) {
      setData(res.value);
      setRejecting(false);
      setReason('');
      setReasonSubmitted(false);
      command.setNotice('Salida rechazada. La persona no sale.');
    } else if (res.stale) {
      setRejecting(false);
    }
  }

  const levelText = level ? CASCADE_LEVEL_LABEL[level] : null;

  return (
    <HrFrame
      pageTitle={trip ? `Autorización de salida a campo — ${trip.employeeName ?? 'colaborador'}` : 'Autorización de salida a campo'}
      back={{ label: 'Volver a las salidas a campo', to: '/personal/campo' }}
      context={context}
      state={state}
      hasData={!!trip}
      subject="la solicitud"
      busy={command.saving}
    >
      {trip && (
        <>
          <div aria-live="polite">
            {command.notice && (
              <p className={styles.notice} role="status">
                {command.notice}
              </p>
            )}
          </div>
          {command.error && (
            <p className={styles.errorBanner} role="alert">
              {command.error}
            </p>
          )}

          <section className={styles.card} aria-labelledby="campo-detalle">
            <h2 id="campo-detalle" className={styles.sectionTitle}>
              Motivo de la salida
            </h2>
            <dl className={styles.dataGrid}>
              <div className={styles.wide}>
                <dt>Motivo</dt>
                <dd>{trip.objective}</dd>
              </div>
              <div>
                <dt>Destino</dt>
                <dd>{trip.destination}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{FIELD_TRIP_STATUS_LABEL[trip.status]}</dd>
              </div>
              <div>
                <dt>Hora de salida</dt>
                <dd>{formatDateTime(trip.estimatedDeparture)}</dd>
              </div>
              <div>
                <dt>Hora estimada de retorno</dt>
                <dd>{formatDateTime(trip.estimatedReturn)}</dd>
              </div>
            </dl>
          </section>

          {level !== null && (
            <section className={`${styles.card} ${styles.timerBlock}`} aria-labelledby="campo-nivel">
              <h2 id="campo-nivel" className={styles.levelLabel}>
                {levelText}
              </h2>
              {remaining !== null ? (
                <p className={styles.timer} role="timer" aria-label={`Tiempo restante del nivel ${level}: ${formatCountdown(remaining)}`}>
                  {formatCountdown(remaining)}
                </p>
              ) : (
                <p className={styles.hint}>El tiempo de espera de este nivel todavía no está disponible.</p>
              )}
              <p className={styles.hint}>
                Cada nivel tiene 5 minutos para responder. Si no hay respuesta, pasa solo al siguiente nivel (Nivel 1 de 3, 2 de 3 y 3 de 3). Si los 3 niveles no responden, la salida no se autoriza.
              </p>
              <div aria-live="polite" className={styles.srOnly}>
                {levelText}
              </div>
            </section>
          )}

          {trip.status === 'NO_AUTORIZADA' && (
            <section className={styles.bannerError} role="alert" aria-labelledby="campo-sin-autorizacion">
              <p id="campo-sin-autorizacion" className={styles.resultAlert}>
                <AlertTriangle size={22} aria-hidden="true" /> Sin autorización
              </p>
              {trip.rejectionReason ? (
                <p>
                  La salida fue rechazada{trip.rejectedAtLevel ? ` en el nivel ${trip.rejectedAtLevel} de 3` : ''}
                  {trip.rejectedByName ? ` por ${trip.rejectedByName}` : ''}. Motivo: {trip.rejectionReason}
                </p>
              ) : (
                <p>Ningún nivel respondió a tiempo. La persona no puede salir. Cualquier otra gestión es manual, fuera del sistema.</p>
              )}
            </section>
          )}

          {trip.status === 'AUTORIZADA' && (
            <p className={styles.notice} role="status">
              Salida autorizada
              {trip.authorizationLevel ? ` en el nivel ${trip.authorizationLevel} de 3` : ''}
              {trip.authorizedByName ? ` por ${trip.authorizedByName}` : ''}.
            </p>
          )}
          {(trip.status === 'CERRADA_NORMAL' || trip.status === 'OBSERVADA') && (
            <p className={styles.notice} role="status">
              {FIELD_TRIP_STATUS_LABEL[trip.status]}
              {trip.lateMinutes > 0 ? ` · regresó con ${trip.lateMinutes} min de retraso` : ''}.
            </p>
          )}

          {canAuthorize && (
            <div className={styles.stickyActions}>
              <button ref={approveRef} type="button" className={styles.primaryButton} disabled={command.saving} onClick={() => void approve()}>
                {command.saving ? 'Guardando…' : 'Aprobar'}
              </button>
              <button type="button" className={styles.dangerButton} disabled={command.saving} onClick={() => setRejecting(true)}>
                Rechazar
              </button>
            </div>
          )}

          {trip.status === 'AUTORIZADA' && can('EVALUATE_FIELD_TRIP_RETURN') && (
            <p>
              <Link className={styles.smallButton} to={`/personal/campo/${trip.id}/regreso`} state={context ?? undefined}>
                Seguimiento de regreso
              </Link>
            </p>
          )}
          {rejecting && (
            <HrDialog
              titleId="rechazo-salida-title"
              title="Rechazar salida a campo"
              description="La persona no saldrá. Indica el motivo: queda en el expediente de la salida."
              onClose={() => {
                if (!command.saving) setRejecting(false);
              }}
            >
              <form onSubmit={(e) => void reject(e)} noValidate>
                <div className={dialogStyles.field}>
                  <label htmlFor="rechazo-motivo">Motivo del rechazo</label>
                  <textarea id="rechazo-motivo" className={dialogStyles.input} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} aria-invalid={reasonSubmitted && reason.trim().length < 5} required />
                  {reasonSubmitted && reason.trim().length < 5 && (
                    <span className={dialogStyles.error} role="alert">
                      Indica el motivo del rechazo (al menos 5 caracteres).
                    </span>
                  )}
                </div>
                {command.error && (
                  <p className={dialogStyles.error} role="alert">
                    {command.error}
                  </p>
                )}
                <div className={dialogStyles.actions}>
                  <button type="button" className={dialogStyles.secondaryButton} onClick={() => setRejecting(false)} disabled={command.saving}>
                    Cancelar
                  </button>
                  <button type="submit" className={dialogStyles.primaryButton} disabled={command.saving}>
                    {command.saving ? 'Guardando…' : 'Confirmar rechazo'}
                  </button>
                </div>
              </form>
            </HrDialog>
          )}
        </>
      )}
    </HrFrame>
  );
}

export function FieldTripAuthorizationScreen() {
  const { can } = useHrPermissions();
  if (!can('REQUEST_FIELD_TRIP') && !can('AUTHORIZE_FIELD_TRIP')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Personal" />
        <div className={styles.content}>
          <p className={styles.statusText} role="alert">
            No tienes acceso a las autorizaciones de salida a campo.
          </p>
        </div>
      </main>
    );
  }
  return <FieldTripAuthorization />;
}

