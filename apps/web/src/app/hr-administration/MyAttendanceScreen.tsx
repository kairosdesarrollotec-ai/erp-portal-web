import { useState } from 'react';
import { HrFrame } from './HrFrame';
import { AttendanceMarkInfo } from './AttendanceMarkInfo';
import { captureAttendanceLocation, type AttendanceLocation } from './attendance-location';
import { geofenceVerdict } from './geofence';
import {
  ATTENDANCE_EVIDENCE_MAX_BYTES,
  ATTENDANCE_EVIDENCE_TYPES,
  getMyAttendance,
  logMyAttendance,
  uploadAttendanceEvidence,
  type MyAttendance,
} from './hr-client';
import { ATTENDANCE_STATUS_LABEL, limaToday, monthKey } from './hr-domain';
import { formatDate } from './hr-format';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import { useOnlineStatus } from './useOnlineStatus';
import styles from './HrFlow.module.css';

function validatePhoto(file: File): string | null {
  if (!(ATTENDANCE_EVIDENCE_TYPES as readonly string[]).includes(file.type)) return 'La foto debe ser JPG, PNG o WEBP.';
  if (file.size > ATTENDANCE_EVIDENCE_MAX_BYTES) return 'La foto supera el tamaño máximo de 12 MB.';
  if (file.size <= 0) return 'El archivo está vacío.';
  return null;
}

function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }).format(new Date(iso));
}

/**
 * MI-ASISTENCIA (22-oct #9) - la persona marca su PROPIA entrada y salida: foto obligatoria en la entrada, ubicacion
 * obligatoria, indicador dentro / fuera de la geocerca de la sede. Una marca fuera de la geocerca se registra igual y queda
 * pendiente de revision. Marca sin conexion: NO HECHO (la foto y el envio necesitan internet; ver DEC-F2-ATT-004).
 */
export function MyAttendanceScreen() {
  const month = monthKey(new Date(`${limaToday()}T12:00:00`));
  const { state, data, context, reload } = useHrResource<MyAttendance>((token, scope) => getMyAttendance(token, scope, month), month);
  const command = useHrCommand({ context, reload });
  const online = useOnlineStatus();
  const [location, setLocation] = useState<(AttendanceLocation & { capturedAt: string }) | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [late, setLate] = useState(false);
  const [minutesLate, setMinutesLate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const today = limaToday();
  const todayRecord = data?.items.find((r) => r.date.slice(0, 10) === today);
  const hasCheckIn = !!todayRecord?.checkInTime;
  const hasCheckOut = !!todayRecord?.checkOutTime;
  const type: 'CHECK_IN' | 'CHECK_OUT' = hasCheckIn ? 'CHECK_OUT' : 'CHECK_IN';
  const verdict = data ? geofenceVerdict(data.geofence, location) : null;
  const minutesValue = Number(minutesLate);
  const lateInvalid = type === 'CHECK_IN' && late && (!Number.isInteger(minutesValue) || minutesValue < 1);

  async function locate() {
    setLocating(true);
    setLocationError(null);
    const found = await captureAttendanceLocation(10_000);
    setLocating(false);
    if (!found) {
      setLocation(null);
      setLocationError('No pudimos obtener tu ubicación. Activa el permiso de ubicación del navegador e intenta de nuevo.');
      return;
    }
    setLocation({ ...found, capturedAt: new Date().toISOString() });
  }

  function onPhoto(file: File | null) {
    setPhoto(file);
    setPhotoError(file ? validatePhoto(file) : null);
  }

  async function mark() {
    setSubmitted(true);
    if (!data || !location || lateInvalid) return;
    if (type === 'CHECK_IN' && (!photo || validatePhoto(photo))) return;
    const res = await command.run(async (token, scope) => {
      let evidence: { kind: 'SELF_PHOTO'; storageRef: string } | undefined;
      if (type === 'CHECK_IN' && photo) {
        const session = await uploadAttendanceEvidence(token, data.employeeId, photo);
        evidence = { kind: 'SELF_PHOTO', storageRef: session.storageRef };
      }
      return logMyAttendance(token, scope, {
        type,
        ...(type === 'CHECK_IN' ? { status: late ? ('TARDANZA' as const) : ('PRESENTE' as const), ...(late ? { minutesLate: minutesValue } : {}) } : {}),
        capturedAt: location.capturedAt,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy ?? 0,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(evidence ? { evidence } : {}),
      });
    }, 'No pudimos registrar tu marca. Intenta de nuevo.');
    if (res.ok) {
      command.setNotice(
        res.value.requiresReview
          ? 'Marca registrada. Quedó fuera de la geocerca de la sede, por eso un responsable la revisará.'
          : type === 'CHECK_IN'
            ? 'Entrada registrada.'
            : 'Salida registrada.',
      );
      setPhoto(null);
      setLocation(null);
      setLate(false);
      setMinutesLate('');
      setNotes('');
      setSubmitted(false);
      await reload();
    }
  }

  const items = [...(data?.items ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <HrFrame pageTitle="Mi asistencia" context={context} state={state} hasData={!!data} subject="tu asistencia" busy={command.saving}>
      {data && (
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

          <section className={styles.card} aria-labelledby="mi-marca">
            <h2 id="mi-marca" className={styles.sectionTitle}>
              {hasCheckOut ? 'Hoy ya marcaste tu entrada y tu salida' : hasCheckIn ? 'Marcar mi salida' : 'Marcar mi entrada'}
            </h2>
            {hasCheckOut ? (
              <p className={styles.hint}>
                Entrada {formatTime(todayRecord?.checkInTime)} · Salida {formatTime(todayRecord?.checkOutTime)}. Vuelve mañana para tu próxima marca.
              </p>
            ) : (
              <div className={styles.stack}>
                {!online && (
                  <p className={styles.banner} role="status" data-testid="my-attendance-offline">
                    Sin conexión: para marcar necesitas internet (la foto y la marca se envían en el momento). Vuelve a intentarlo cuando tengas conexión.
                  </p>
                )}
                {!data.geofence.configured && (
                  <p className={styles.hint} data-testid="geofence-not-configured">
                    Tu sede todavía no tiene geocerca configurada: tu marca se registra con tu ubicación, sin comparar contra la sede.
                  </p>
                )}
                <div>
                  <button type="button" className={styles.secondaryButton} onClick={() => void locate()} disabled={locating || command.saving}>
                    {locating ? 'Obteniendo ubicación…' : location ? 'Actualizar mi ubicación' : 'Obtener mi ubicación (obligatoria)'}
                  </button>
                  {location && <span role="status"> Ubicación obtenida (precisión ±{Math.round(location.accuracy ?? 0)} m).</span>}
                </div>
                {locationError && (
                  <p className={styles.fieldError} role="alert">
                    {locationError}
                  </p>
                )}
                {submitted && !location && !locationError && (
                  <p className={styles.fieldError} role="alert">
                    Obtén tu ubicación antes de marcar.
                  </p>
                )}
                {location && verdict && verdict.kind !== 'NO_GEOFENCE' && (
                  <p
                    className={verdict.kind === 'INSIDE' ? styles.notice : styles.banner}
                    role="status"
                    data-testid="geofence-indicator"
                    data-verdict={verdict.kind}
                  >
                    {verdict.kind === 'INSIDE'
                      ? `Estás dentro de la sede (a ${verdict.distanceMeters} m del centro; radio ${verdict.radiusMeters} m).`
                      : `Estás fuera de la geocerca de la sede (a ${verdict.distanceMeters} m; radio ${verdict.radiusMeters} m). Puedes marcar igual: quedará pendiente de revisión.`}
                  </p>
                )}

                {type === 'CHECK_IN' && (
                  <>
                    <label className={styles.fieldLabel} htmlFor="my-att-photo">
                      Foto de tu entrada (obligatoria; JPG, PNG o WEBP, máx. 12 MB)
                    </label>
                    <input
                      id="my-att-photo"
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
                      aria-invalid={!!photoError || (submitted && !photo)}
                    />
                    {photoError && (
                      <p className={styles.fieldError} role="alert">
                        {photoError}
                      </p>
                    )}
                    {submitted && !photo && (
                      <p className={styles.fieldError} role="alert">
                        La foto es obligatoria para marcar la entrada.
                      </p>
                    )}
                    <label className={styles.checkLabel}>
                      <input type="checkbox" checked={late} onChange={(e) => setLate(e.target.checked)} /> Llegué tarde
                    </label>
                    {late && (
                      <>
                        <label className={styles.fieldLabel} htmlFor="my-att-late">
                          Minutos de tardanza
                        </label>
                        <input
                          id="my-att-late"
                          type="number"
                          min={1}
                          className={styles.input}
                          value={minutesLate}
                          onChange={(e) => setMinutesLate(e.target.value)}
                          aria-invalid={submitted && lateInvalid}
                        />
                        {submitted && lateInvalid && (
                          <p className={styles.fieldError} role="alert">
                            Indica cuántos minutos llegaste tarde.
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
                <label className={styles.fieldLabel} htmlFor="my-att-notes">
                  Nota (opcional)
                </label>
                <textarea id="my-att-notes" className={styles.input} rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
                <div className={styles.rowActions}>
                  <button type="button" className={styles.primaryButton} onClick={() => void mark()} disabled={command.saving || !online}>
                    {command.saving ? 'Enviando…' : type === 'CHECK_IN' ? 'Marcar entrada' : 'Marcar salida'}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className={styles.card} aria-labelledby="mi-mes">
            <h2 id="mi-mes" className={styles.sectionTitle}>
              Mis marcas de este mes
            </h2>
            {items.length === 0 ? (
              <p className={styles.hint}>Todavía no tienes marcas este mes.</p>
            ) : (
              <ul className={styles.plainList}>
                {items.map((r) => (
                  <li key={r.id} className={styles.listItem}>
                    {formatDate(r.date)} · {ATTENDANCE_STATUS_LABEL[r.status]} · Entrada {formatTime(r.checkInTime)} · Salida {formatTime(r.checkOutTime)}
                    <AttendanceMarkInfo record={r} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </HrFrame>
  );
}
