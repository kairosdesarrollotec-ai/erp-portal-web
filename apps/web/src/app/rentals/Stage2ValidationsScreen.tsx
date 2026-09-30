import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import { registerAlcoholTest, RentalCommandError, AlcoholTestResult } from './rentals-client';
import { useWorkSession } from '../shared/useWorkSession';
import styles from './RentalStageForms.module.css';

type ExternalCheckStatus = 'verified' | 'pending' | 'down';

/**
 * ENTREGA-02 - Validaciones externas y alcoholímetro
 * (mapea a POST .../commands/register-alcohol-test). RENIEC/MTC no tienen
 * endpoint propio en el backend actual (fuera del alcance de rentals.module);
 * se simulan como verificados por defecto con un boton de reintento, tal
 * como pide el prototipo. Si MTC cae: bloqueo total, solo "Reintentar". Si
 * RENIEC cae: "Solicitar excepcion RENIEC" solo habilitado para Gerencia
 * (mismo gating de rol que EVALUATE_NOTARY/APPROVE_NOTARY_EXCEPTION en el
 * backend, application/policies/rental-role-policy.ts).
 */
export function Stage2ValidationsScreen() {
  const { id, state, rental, context, getIdToken, setRental } = useRentalWizard();
  const navigate = useNavigate();
  const role = useWorkSession((s) => s.role);

  const [reniecStatus, setReniecStatus] = useState<ExternalCheckStatus>('verified');
  const [mtcStatus, setMtcStatus] = useState<ExternalCheckStatus>('verified');
  const [result, setResult] = useState<AlcoholTestResult | null>(null);
  const [testTime, setTestTime] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGerencia = role === 'GERENCIA' || role === 'PLATFORM_ADMIN';
  const canContinue = mtcStatus === 'verified' && reniecStatus !== 'down' && result === 'FAVORABLE' && !!testTime;

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
          <span className={`${styles.statusBadge} ${styles[`statusBadge_${reniecStatus}`]}`}>
            {reniecStatus === 'verified' ? 'Verificado' : reniecStatus === 'pending' ? 'Pendiente' : 'Caído'}
          </span>
          {reniecStatus === 'down' && (
            <div>
              <p className={styles.blockedNotice}>
                RENIEC no responde. {isGerencia ? '' : 'Solo Gerencia puede solicitar excepción.'}
              </p>
              <button type="button" className={styles.retryButton} disabled={!isGerencia}>
                Solicitar excepción RENIEC
              </button>
            </div>
          )}
          <button type="button" className={styles.retryButton} onClick={() => setReniecStatus('verified')}>
            Reintentar
          </button>
        </div>

        <div className={styles.statusCard}>
          <p className={styles.statusCardTitle}>MTC</p>
          <span className={`${styles.statusBadge} ${styles[`statusBadge_${mtcStatus}`]}`}>
            {mtcStatus === 'verified' ? 'Verificado' : mtcStatus === 'pending' ? 'Pendiente' : 'Caído'}
          </span>
          {mtcStatus === 'down' && <p className={styles.blockedNotice}>MTC caído: no es posible continuar.</p>}
          <button type="button" className={styles.retryButton} onClick={() => setMtcStatus('verified')}>
            Reintentar
          </button>
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
