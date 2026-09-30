import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import { validateDocuments, RentalCommandError } from './rentals-client';
import styles from './RentalStageForms.module.css';

type DriverType = 'TITULAR' | 'ACOMPANANTE' | 'JURIDICA';
type IdDocType = 'DNI' | 'PASAPORTE_CE';

/**
 * ENTREGA-01 - Cliente y documentos (mapea a POST .../commands/validate-documents).
 * Cliente y vehiculo ya vienen heredados de Consulta/Reserva - no se vuelven
 * a pedir aqui, solo se muestran de forma informativa.
 */
export function Stage1DocumentsScreen() {
  const { id, state, rental, context, getIdToken, setRental } = useRentalWizard();
  const navigate = useNavigate();

  const [driverType, setDriverType] = useState<DriverType>('TITULAR');
  const [idDocType, setIdDocType] = useState<IdDocType>('DNI');
  const [licenseValid, setLicenseValid] = useState(false);
  const [idDocValid, setIdDocValid] = useState(false);
  const [addressValid, setAddressValid] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => licenseValid && idDocValid, [licenseValid, idDocValid]);

  async function handleContinue() {
    if (!rental || !context) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await validateDocuments(idToken, id, context.companyId, context.branchId, rental.version, {
        identityDocumentValid: idDocValid,
        driverLicenseValid: licenseValid,
        addressOrStayProofValid: addressValid,
        notes: notes || undefined,
      });
      setRental(updated);
      navigate(`/alquileres/${id}/entrega-02`, { state: context });
    } catch (err) {
      if (err instanceof RentalCommandError) setError(err.message);
      else setError('No pudimos guardar los documentos. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'LOADING') return <p className={styles.statusText}>Cargando expediente…</p>;
  if (state === 'NOT_FOUND') return <p className={styles.statusText}>El alquiler no existe.</p>;
  if (state === 'RECOVERABLE_ERROR' || !rental) {
    return <p className={styles.statusText}>No pudimos cargar el expediente. Intenta de nuevo.</p>;
  }

  return (
    <RentalWizardShell
      stage={1}
      title="Cliente y documentos"
      onContinue={handleContinue}
      continueDisabled={!canContinue}
      continueBusy={busy}
      errorMessage={error}
    >
      <section className={styles.summaryCard}>
        <p className={styles.summaryLine}>
          <strong>Cliente:</strong> {rental.customerName} ({rental.customerDocNumber})
        </p>
        <p className={styles.summaryLine}>
          <strong>Vehículo:</strong> {rental.vehicleBrand} {rental.vehicleModel} - {rental.vehiclePlate}
        </p>
      </section>

      <fieldset className={styles.fieldset}>
        <legend>Tipo de conductor</legend>
        <div className={styles.chipRow}>
          {(['TITULAR', 'ACOMPANANTE', 'JURIDICA'] as DriverType[]).map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.chip} ${driverType === option ? styles.chipActive : ''}`}
              onClick={() => setDriverType(option)}
            >
              {option === 'TITULAR' ? 'Titular' : option === 'ACOMPANANTE' ? 'Acompañante' : 'Persona jurídica'}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Documentos</legend>
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={licenseValid} onChange={(e) => setLicenseValid(e.target.checked)} />
          Licencia de conducir válida (obligatoria)
        </label>

        <div className={styles.chipRow}>
          <button
            type="button"
            className={`${styles.chip} ${idDocType === 'DNI' ? styles.chipActive : ''}`}
            onClick={() => setIdDocType('DNI')}
          >
            DNI
          </button>
          <button
            type="button"
            className={`${styles.chip} ${idDocType === 'PASAPORTE_CE' ? styles.chipActive : ''}`}
            onClick={() => setIdDocType('PASAPORTE_CE')}
          >
            Pasaporte / CE
          </button>
        </div>
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={idDocValid} onChange={(e) => setIdDocValid(e.target.checked)} />
          {idDocType === 'DNI' ? 'DNI válido' : 'Pasaporte/CE válido'}
        </label>

        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={addressValid} onChange={(e) => setAddressValid(e.target.checked)} />
          Comprobante de domicilio / estadía válido
        </label>
      </fieldset>

      <label className={styles.fieldLabel}>
        Notas
        <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>
    </RentalWizardShell>
  );
}
