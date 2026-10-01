import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import { registerAlcoholTest, RentalCommandError, AlcoholTestResult } from './rentals-client';
import styles from './RentalStageForms.module.css';

/**
 * ENTREGA-02 / ALQ-04 - Validaciones y alcoholímetro
 * (mapea a POST .../commands/register-alcohol-test).
 * RENIEC y MTC se muestran como verificados estáticamente; la integración
 * con proveedores externos no está incluida en esta versión del MVP.
 */
export function Stage2ValidationsScreen() {
  const { id, state, rental, context, getIdToken, setRental } = useRentalWizard();
  const navigate = useNavigate();

  const [result, setResult] = useState<AlcoholTestResult | null>(null);
  const [testTime, setTestTime] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = result === 'FAVORABLE' && !!testTime;

  async function handleContinue() {
    if (!rental || !context || result !== 'FAVORABLE') return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await registerAlcoholTest(
        idToken,
        id,
        context.companyId,
        context.branchId,
        rental.version,
        result,
        notes ? `${notes} (hora: ${testTime})` : `hora: ${testTime}`,
      );
      setRental(updated);
      navigate(`/alquileres/${id}/entrega-03`, { state: context });
    } catch (err) {
      if (err instanceof RentalCommandError) setError(err.message);
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
      title="Validaciones y alcoholímetro"
      onContinue={handleContinue}
      continueDisabled={!canContinue}
      continueBusy={busy}
      errorMessage={error}
    >
      <div className={styles.statusCards}>
        <div className={styles.statusCard}>
          <p className={styles.statusCardTitle}>RENIEC</p>
          <span className={`${styles.statusBadge} ${styles.statusBadge_verified}`}>Verificado</span>
        </div>

        <div className={styles.statusCard}>
          <p className={styles.statusCardTitle}>MTC</p>
          <span className={`${styles.statusBadge} ${styles.statusBadge_verified}`}>Verificado</span>
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
        <label className={styles.fieldLabel}>
          Hora de la prueba
          <input type="time" className={styles.input} value={testTime} onChange={(e) => setTestTime(e.target.value)} />
        </label>
        <label className={styles.fieldLabel}>
          Evidencia / notas
          <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </label>
        {result && result !== 'FAVORABLE' && (
          <p className={styles.blockedNotice}>Solo se puede continuar con resultado Favorable.</p>
        )}
      </fieldset>
    </RentalWizardShell>
  );
}
