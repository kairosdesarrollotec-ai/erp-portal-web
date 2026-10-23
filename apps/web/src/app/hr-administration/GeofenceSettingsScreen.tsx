import { useState, type FormEvent } from 'react';
import { HrFrame } from './HrFrame';
import { captureAttendanceLocation } from './attendance-location';
import { deleteBranchGeofence, getBranchGeofence, setBranchGeofence, type BranchGeofence } from './hr-client';
import { mapLink } from './geofence';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';

/** Configuracion de la geocerca de la sede (22-oct #9): centro + radio de 10 a 5000 m. Permiso MANAGE_GEOFENCE. */
export function GeofenceSettingsScreen() {
  const { state, data, context, reload } = useHrResource<BranchGeofence>((token, scope) => getBranchGeofence(token, scope), 'geofence');
  const command = useHrCommand({ context, reload });
  const [draft, setDraft] = useState<{ lat: string; lng: string; radius: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const form = draft ?? {
    lat: data?.latitude != null ? String(data.latitude) : '',
    lng: data?.longitude != null ? String(data.longitude) : '',
    radius: data?.radiusMeters != null ? String(data.radiusMeters) : '150',
  };
  const lat = Number(form.lat);
  const lng = Number(form.lng);
  const radius = Number(form.radius);
  const latBad = form.lat.trim() === '' || !Number.isFinite(lat) || lat < -90 || lat > 90;
  const lngBad = form.lng.trim() === '' || !Number.isFinite(lng) || lng < -180 || lng > 180;
  const radiusBad = form.radius.trim() === '' || !Number.isInteger(radius) || radius < 10 || radius > 5000;

  // Es un manejador de evento, no un hook de React. El prefijo `use` hace que
  // eslint aplique erróneamente las reglas de hooks cuando se invoca al hacer clic.
  async function handleUseMyLocation() {
    setLocating(true);
    setLocError(null);
    const here = await captureAttendanceLocation(10_000);
    setLocating(false);
    if (!here) {
      setLocError('No pudimos obtener tu ubicación. Escribe las coordenadas a mano.');
      return;
    }
    setDraft({ ...form, lat: String(here.latitude), lng: String(here.longitude) });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (latBad || lngBad || radiusBad) return;
    const res = await command.run((token, scope) => setBranchGeofence(token, scope, { latitude: lat, longitude: lng, radiusMeters: radius }), 'No pudimos guardar la geocerca. Intenta de nuevo.');
    if (res.ok) {
      command.setNotice('Geocerca guardada.');
      setDraft(null);
      setSubmitted(false);
      await reload();
    }
  }

  async function remove() {
    const res = await command.run((token, scope) => deleteBranchGeofence(token, scope), 'No pudimos quitar la geocerca. Intenta de nuevo.');
    setConfirmRemove(false);
    if (res.ok) {
      command.setNotice('Geocerca quitada: ninguna marca se comparará contra la sede.');
      setDraft(null);
      await reload();
    }
  }

  return (
    <HrFrame
      pageTitle={data ? `Geocerca — ${data.branchName}` : 'Geocerca de la sede'}
      back={{ label: 'Volver a la asistencia', to: '/personal/asistencia' }}
      context={context}
      state={state}
      hasData={!!data}
      subject="la geocerca"
      busy={command.saving}
    >
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
          <p className={styles.hint} data-testid="geofence-current">
            {data.configured
              ? `Configurada: centro ${data.latitude}, ${data.longitude} · radio ${data.radiusMeters} m.`
              : 'Esta sede todavía no tiene geocerca: las marcas no se comparan contra la sede.'}{' '}
            {data.configured && data.latitude != null && data.longitude != null && (
              <a href={mapLink(data.latitude, data.longitude)} target="_blank" rel="noopener noreferrer">
                Ver en el mapa
              </a>
            )}
          </p>
          <form className={styles.card} onSubmit={(e) => void save(e)} noValidate aria-labelledby="geo-form">
            <h2 id="geo-form" className={styles.sectionTitle}>
              Centro y radio
            </h2>
            <button type="button" className={styles.secondaryButton} onClick={() => void handleUseMyLocation()} disabled={locating}>
              {locating ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual como centro'}
            </button>
            {locError && (
              <p className={styles.fieldError} role="alert">
                {locError}
              </p>
            )}
            <label className={styles.fieldLabel} htmlFor="geo-lat">
              Latitud (-90 a 90)
            </label>
            <input id="geo-lat" inputMode="decimal" className={styles.input} value={form.lat} onChange={(e) => setDraft({ ...form, lat: e.target.value })} aria-invalid={submitted && latBad} />
            {submitted && latBad && (
              <p className={styles.fieldError} role="alert">
                Indica una latitud válida (entre -90 y 90).
              </p>
            )}
            <label className={styles.fieldLabel} htmlFor="geo-lng">
              Longitud (-180 a 180)
            </label>
            <input id="geo-lng" inputMode="decimal" className={styles.input} value={form.lng} onChange={(e) => setDraft({ ...form, lng: e.target.value })} aria-invalid={submitted && lngBad} />
            {submitted && lngBad && (
              <p className={styles.fieldError} role="alert">
                Indica una longitud válida (entre -180 y 180).
              </p>
            )}
            <label className={styles.fieldLabel} htmlFor="geo-radius">
              Radio permitido en metros (10 a 5000)
            </label>
            <input id="geo-radius" inputMode="numeric" className={styles.input} value={form.radius} onChange={(e) => setDraft({ ...form, radius: e.target.value })} aria-invalid={submitted && radiusBad} />
            {submitted && radiusBad && (
              <p className={styles.fieldError} role="alert">
                El radio debe ser un número entero entre 10 y 5000 metros.
              </p>
            )}
            <div className={styles.rowActions}>
              <button type="submit" className={styles.primaryButton} disabled={command.saving}>
                {command.saving ? 'Guardando…' : 'Guardar geocerca'}
              </button>
              {data.configured && !confirmRemove && (
                <button type="button" className={styles.secondaryButton} onClick={() => setConfirmRemove(true)} disabled={command.saving}>
                  Quitar geocerca
                </button>
              )}
            </div>
            {confirmRemove && (
              <p className={styles.banner} role="alertdialog" aria-label="Confirmar quitar la geocerca">
                Sin geocerca ninguna marca se considerará fuera de la sede ni pasará por revisión. ¿Quitarla?{' '}
                <button type="button" className={styles.smallButton} onClick={() => void remove()} disabled={command.saving}>
                  Sí, quitar
                </button>{' '}
                <button type="button" className={styles.smallButton} onClick={() => setConfirmRemove(false)}>
                  No
                </button>
              </p>
            )}
          </form>
        </>
      )}
    </HrFrame>
  );
}
