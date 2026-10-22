import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import { CancelRentalControl } from './CancelRentalControl';
import {
  registerAlcoholTest,
  requestEvidenceUploadSession,
  uploadEvidenceToGcs,
  recordEvidence,
  RentalCommandError,
  AlcoholTestResult,
  type RentalEvidenceContentType,
} from './rentals-client';
import { describeRentalError } from './rental-errors';
import styles from './RentalStageForms.module.css';

/** Mismo límite que la foto de DEV-03 (return-evidence.MAX_PHOTO_BYTES). */
const MAX_ALCOHOL_PHOTO_BYTES = 12 * 1024 * 1024;
const ALCOHOL_PHOTO_TYPES = ['image/jpeg', 'image/webp'];

/**
 * ENTREGA-02 / ALQ-04 - Validaciones y alcoholímetro
 * (mapea a POST .../commands/register-alcohol-test).
 * Respuestas 2026-10-20 #10 (rentals.yaml 1.12.0): igual que DEV-03, con resultado DESFAVORABLE o RECHAZADO la FOTO de la prueba es
 * obligatoria (zona ALCOHOL_TEST, sin hora, no cuenta para las 35 fotos) y el alquiler queda cancelado.
 * RENIEC y MTC se muestran como verificados estáticamente; la integración
 * con proveedores externos no está incluida en esta versión del MVP.
 */
export function Stage2ValidationsScreen() {
  const { id, state, rental, context, getIdToken, setRental } = useRentalWizard();
  const navigate = useNavigate();

  const [result, setResult] = useState<AlcoholTestResult | null>(null);
  const [testDateTime, setTestDateTime] = useState('');
  const [notes, setNotes] = useState('');
  const [reniecConfirmed, setReniecConfirmed] = useState(false);
  const [mtcConfirmed, setMtcConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUploaded, setPhotoUploaded] = useState(false);

  const unfavorable = result === 'DESFAVORABLE' || result === 'RECHAZADO';
  const canContinue =
    (result === 'FAVORABLE' && !!testDateTime) || (unfavorable && (photoUploaded || photo !== null));

  async function handleContinue() {
    if (!rental || !context || result === null) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      if (unfavorable && !photoUploaded) {
        if (!photo) {
          setError('Adjunta la foto de la prueba del alcoholímetro (obligatoria).');
          return;
        }
        if (!ALCOHOL_PHOTO_TYPES.includes(photo.type)) {
          setError('Solo se admiten imágenes JPEG o WebP.');
          return;
        }
        if (photo.size > MAX_ALCOHOL_PHOTO_BYTES) {
          setError('La foto supera el tamaño máximo de 12 MB.');
          return;
        }
        const session = await requestEvidenceUploadSession(
          idToken, id, context.companyId, context.branchId, 'PHOTO', 'ALCOHOL_TEST',
          photo.type as RentalEvidenceContentType, photo.size,
        );
        await uploadEvidenceToGcs(session.uploadUrl, photo);
        await recordEvidence(idToken, id, context.companyId, context.branchId, 'PHOTO', 'ALCOHOL_TEST', session.objectUrl);
        setPhotoUploaded(true);
      }
      const updated = await registerAlcoholTest(
        idToken,
        id,
        context.companyId,
        context.branchId,
        rental.version,
        result,
        unfavorable
          ? notes.trim() || undefined
          : notes ? `${notes} (fecha/hora: ${testDateTime})` : `fecha/hora: ${testDateTime}`,
      );
      setRental(updated);
      if (unfavorable) navigate('/alquileres', { state: context });
      else navigate(`/alquileres/${id}/entrega-03`, { state: context });
    } catch (err) {
      if (err instanceof RentalCommandError) setError(describeRentalError(err, err.message));
      else setError('No pudimos registrar la validación. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'LOADING') return <p className={styles.statusText}>Cargando expediente…</p>;
  if (state === 'RECOVERABLE_ERROR' || state === 'NOT_FOUND' || !rental) {
    return <p className={styles.statusText}>No pudimos cargar el expediente. Intenta de nuevo.</p>;
  }

  return (
    <RentalWizardShell
      stage={2}
      cancelControl={<CancelRentalControl rental={rental} context={context} getIdToken={getIdToken} />}
      title="Validaciones y alcoholímetro"
      onContinue={handleContinue}
      continueLabel={unfavorable ? 'Registrar y cancelar el alquiler' : 'Continuar'}
      continueDisabled={!canContinue}
      continueBusy={busy}
      errorMessage={error}
    >
      <div className={styles.statusCards}>
        <div className={styles.statusCard}>
          <p className={styles.statusCardTitle}>RENIEC</p>
          <span className={`${styles.statusBadge} ${reniecConfirmed ? styles.statusBadge_verified : styles.statusBadge_pending}`}>
            {reniecConfirmed ? 'Verificado' : 'Pendiente de verificación'}
          </span>
          <label className={styles.checkboxRow} style={{ marginTop: '0.5rem', fontSize: '12px' }}>
            <input type="checkbox" checked={reniecConfirmed} onChange={(e) => setReniecConfirmed(e.target.checked)} />
            Confirmar verificación manual
          </label>
        </div>

        <div className={styles.statusCard}>
          <p className={styles.statusCardTitle}>MTC</p>
          <span className={`${styles.statusBadge} ${mtcConfirmed ? styles.statusBadge_verified : styles.statusBadge_pending}`}>
            {mtcConfirmed ? 'Verificado' : 'Pendiente de verificación'}
          </span>
          <label className={styles.checkboxRow} style={{ marginTop: '0.5rem', fontSize: '12px' }}>
            <input type="checkbox" checked={mtcConfirmed} onChange={(e) => setMtcConfirmed(e.target.checked)} />
            Confirmar verificación manual
          </label>
        </div>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>Resultado del alcoholímetro (tolerancia cero)</legend>
        <div className={styles.radioRow}>
          {(['FAVORABLE', 'DESFAVORABLE', 'RECHAZADO'] as AlcoholTestResult[]).map((option) => (
            <label key={option} className={styles.radioOption}>
              <input
                type="radio"
                name="alcohol-result"
                checked={result === option}
                onChange={() => setResult(option)}
              />
              {option === 'FAVORABLE' ? 'Favorable' : option === 'DESFAVORABLE' ? 'Desfavorable' : 'Se negó'}
            </label>
          ))}
        </div>
        {!unfavorable && (
          <label className={styles.fieldLabel}>
            Fecha y hora de la prueba
            <input type="datetime-local" className={styles.input} value={testDateTime} onChange={(e) => setTestDateTime(e.target.value)} />
          </label>
        )}
        {unfavorable && (
          <label className={styles.fieldLabel}>
            Foto de la prueba del alcoholímetro (obligatoria)
            <input
              type="file"
              accept="image/jpeg,image/webp"
              capture="environment"
              onChange={(e) => {
                setPhoto(e.target.files?.[0] ?? null);
                setPhotoUploaded(false);
              }}
            />
            {photo && <span className={styles.fieldHint}>{photo.name}</span>}
            <span className={styles.fieldHint}>No se registra hora ni otros datos; la foto queda como evidencia de la prueba.</span>
          </label>
        )}
        <label className={styles.fieldLabel}>
          Evidencia / notas
          <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </label>
        {unfavorable && (
          <p className={styles.blockedNotice} role="status">
            Con este resultado el alquiler no puede continuar: al registrarlo con la foto, el alquiler queda cancelado.
          </p>
        )}
      </fieldset>
    </RentalWizardShell>
  );
}
