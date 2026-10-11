import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { AppHeader } from '../shared/AppHeader';
import { getEmployee, requestFieldTrip, type EmployeeDetail } from './hr-client';
import { localToIso, toIsoDate } from './hr-domain';
import { describeHrError } from './hr-errors';
import { useHrPermissions } from './hr-permissions';
import { useHrResource } from './useHrResource';
import { useOnlineStatus } from './useOnlineStatus';
import { getFirebaseAuth } from '../providers/firebase';
import styles from './HrFlow.module.css';

export const OFFLINE_MESSAGE = 'Necesitas conexión a internet para solicitar una salida a campo — esta solicitud no se puede guardar sin conexión';

/**
 * ADP-06 - Solicitud de salida a campo (mobile-first). Siempre requiere conexion (ADP-P12): sin
 * conexion el formulario se REEMPLAZA por un mensaje bloqueante y nada se guarda como borrador local.
 */
function FieldTripRequest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  // El area es informativa: si la ficha no se puede leer (p. ej. rol de campo sin VIEW_EMPLOYEES) igual se puede solicitar.
  const { state, data, context } = useHrResource<{ employee: EmployeeDetail | null }>(
    id ? async (token) => ({ employee: await getEmployee(token, id).catch(() => null) }) : null,
    id ?? '',
  );
  const [destination, setDestination] = useState('');
  const [objective, setObjective] = useState('');
  const [departure, setDeparture] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectiveRef = useRef<HTMLInputElement>(null);

  const ready = state === 'READY' && online;
  useEffect(() => {
    if (ready) objectiveRef.current?.focus();
  }, [ready]);

  const timesInvalid = !!departure && !!returnTime && returnTime <= departure;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!id || !context || !objective.trim() || !destination.trim() || !departure || !returnTime || timesInvalid) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const today = toIsoDate(new Date());
      const trip = await requestFieldTrip(idToken, id, {
        destination: destination.trim(),
        objective: objective.trim(),
        estimatedDeparture: localToIso(today, departure),
        estimatedReturn: localToIso(today, returnTime),
      });
      navigate(`/personal/campo/${trip.id}/autorizacion`, { state: context });
    } catch (err) {
      setError(describeHrError(err, 'No pudimos enviar la solicitud. Revisa tu conexión e intenta de nuevo.'));
      setBusy(false);
    }
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Personal" />
      <div className={styles.content} aria-busy={busy || state === 'LOADING'}>
        <button type="button" className={styles.backLink} onClick={() => navigate(`/personal/${id}`, { state: context ?? undefined })}>
          ← Volver a la ficha
        </button>
        <h1 className={styles.title}>Solicitar salida a campo</h1>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando…</p>}
        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText} role="alert">
            No pudimos preparar la solicitud. Intenta de nuevo en unos segundos.
          </p>
        )}

        {state === 'READY' && !online && (
          <div className={styles.bannerError} role="alert">
            <p className={styles.resultAlert}>
              <WifiOff size={22} aria-hidden="true" /> Sin conexión
            </p>
            <p>{OFFLINE_MESSAGE}</p>
          </div>
        )}

        {state === 'READY' && online && data && (
          <form onSubmit={(e) => void submit(e)} noValidate className={styles.form} aria-label="Solicitud de salida a campo">
            <label className={styles.fieldLabel} htmlFor="campo-area">
              Área
            </label>
            <input id="campo-area" className={`${styles.input} ${styles.readOnlyField} ${styles.mobileInput}`} value={data.employee?.areaName ?? 'No disponible'} readOnly aria-readonly="true" />

            <label className={styles.fieldLabel} htmlFor="campo-tema">
              Tema de la salida
            </label>
            <input
              id="campo-tema"
              ref={objectiveRef}
              className={`${styles.input} ${styles.mobileInput}`}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              aria-invalid={submitted && !objective.trim()}
              required
            />
            {submitted && !objective.trim() && (
              <p className={styles.fieldError} role="alert">
                Indica el tema de la salida.
              </p>
            )}

            <label className={styles.fieldLabel} htmlFor="campo-destino">
              Destino
            </label>
            <input
              id="campo-destino"
              className={`${styles.input} ${styles.mobileInput}`}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              aria-invalid={submitted && !destination.trim()}
              required
            />
            {submitted && !destination.trim() && (
              <p className={styles.fieldError} role="alert">
                Indica a dónde vas.
              </p>
            )}

            <label className={styles.fieldLabel} htmlFor="campo-salida">
              Hora de salida (hoy)
            </label>
            <input id="campo-salida" type="time" className={`${styles.input} ${styles.mobileInput}`} value={departure} onChange={(e) => setDeparture(e.target.value)} aria-invalid={submitted && !departure} required />
            {submitted && !departure && (
              <p className={styles.fieldError} role="alert">
                Indica la hora de salida.
              </p>
            )}

            <label className={styles.fieldLabel} htmlFor="campo-retorno">
              Hora estimada de retorno
            </label>
            <input id="campo-retorno" type="time" className={`${styles.input} ${styles.mobileInput}`} value={returnTime} onChange={(e) => setReturnTime(e.target.value)} aria-invalid={(submitted && !returnTime) || timesInvalid} required />
            {submitted && !returnTime && (
              <p className={styles.fieldError} role="alert">
                Indica la hora estimada de retorno.
              </p>
            )}
            {timesInvalid && (
              <p className={styles.fieldError} role="alert">
                La hora de retorno debe ser posterior a la de salida.
              </p>
            )}

            {error && (
              <p className={styles.errorBanner} role="alert">
                {error}
              </p>
            )}
            <p className={styles.hint}>La solicitud pasa por 3 niveles de autorización, 5 minutos por nivel. Si nadie responde, la salida no se autoriza.</p>
            <div className={styles.stickyActions}>
              <button type="submit" className={styles.accentButton} disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

export function FieldTripRequestScreen() {
  const { can } = useHrPermissions();
  if (!can('REQUEST_FIELD_TRIP')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Personal" />
        <div className={styles.content}>
          <p className={styles.statusText} role="alert">
            No tienes permiso para solicitar salidas a campo.
          </p>
        </div>
      </main>
    );
  }
  return <FieldTripRequest />;
}
