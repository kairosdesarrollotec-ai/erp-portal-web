import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { useRentalWizard } from './useRentalWizard';
import { RentalWizardShell } from './RentalWizardShell';
import {
  validateDocuments,
  RentalCommandError,
  requestRentalDocumentUploadSession,
  uploadFileToGcs,
  recordRentalDocument,
  registerAuthorizedDriver,
  RentalDocumentType,
  ContractHolderType,
} from './rentals-client';
import { describeRentalError } from './rental-errors';
import { useInquiryCustomerSearch } from '../inquiries/useInquiryCustomerSearch';
import type { Customer } from '../customers/customers-client';
import styles from './RentalStageForms.module.css';

type DriverType = 'TITULAR' | 'ACOMPANANTE' | 'JURIDICA';
type IdDocType = 'DNI' | 'PASAPORTE_CE';

/**
 * El expediente no expone el tipo de persona del titular. Se infiere del documento: un RUC de 11
 * digitos que empieza con 20 es persona juridica; el resto se trata como natural. El backend es la
 * autoridad (NATURAL_PERSON_OWN_DRIVER_NOT_ALLOWED / HOLDER_TYPE_MISMATCH) y su mensaje se muestra.
 */
export function inferHolderType(docNumber: string | undefined | null): ContractHolderType {
  return /^20\d{9}$/.test((docNumber ?? '').trim()) ? 'LEGAL' : 'NATURAL';
}

/**
 * ENTREGA-01 / ALQ-03 - Cliente y documentos (mapea a POST .../commands/validate-documents).
 * Cliente y vehiculo ya vienen heredados de Consulta/Reserva - no se vuelven
 * a pedir aqui, solo se muestran de forma informativa.
 *
 * Correccion (oct 2026): los items de documentos requeridos (licencia e
 * identificacion) se marcan solo cuando el archivo se sube realmente, no
 * mediante checkbox manual. Los booleanos que recibe validateDocuments se
 * derivan de los uploads realizados en esta sesion.
 */
export function Stage1DocumentsScreen() {
  const { id, state, rental, context, getIdToken, setRental } = useRentalWizard();
  const navigate = useNavigate();

  const [driverType, setDriverType] = useState<DriverType>('TITULAR');
  const [idDocType, setIdDocType] = useState<IdDocType>('DNI');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks which document types have been successfully uploaded this session.
  const [uploadedTypes, setUploadedTypes] = useState<Set<RentalDocumentType>>(new Set());
  // Per-type upload state: which type is currently uploading.
  const [uploadingType, setUploadingType] = useState<RentalDocumentType | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Conductor propio de persona juridica (DEC-ALQ-OWN-DRIVER-005): cliente-conductor + adenda.
  const [driverCustomer, setDriverCustomer] = useState<Customer | null>(null);
  const [addendumRef, setAddendumRef] = useState('');
  const driverSearch = useInquiryCustomerSearch(context, (c) => setDriverCustomer(c));

  const licenseFileRef = useRef<HTMLInputElement>(null);
  const idDocFileRef = useRef<HTMLInputElement>(null);
  const addressFileRef = useRef<HTMLInputElement>(null);

  const licenseUploaded = uploadedTypes.has('LICENSE');
  const idDocUploaded = uploadedTypes.has('ID_DOCUMENT');
  const addressUploaded = uploadedTypes.has('PROOF_OF_ADDRESS');
  const holderType = inferHolderType(rental?.customerDocNumber);
  const isNaturalHolder = holderType === 'NATURAL';
  const registeredDriver = rental?.parties?.find((p) => p.role === 'DRIVER') ?? null;
  const needsOwnDriver = driverType === 'JURIDICA' && !registeredDriver;
  const ownDriverReady = !needsOwnDriver || (!!driverCustomer && addendumRef.trim().length > 0);
  const canContinue = licenseUploaded && idDocUploaded && ownDriverReady;

  async function handleFileUpload(file: File, docType: RentalDocumentType) {
    if (!rental || !context) return;
    const contentType = file.type as 'image/jpeg' | 'image/webp' | 'image/png' | 'application/pdf';
    setUploadingType(docType);
    setUploadError(null);
    try {
      const idToken = await getIdToken();
      const session = await requestRentalDocumentUploadSession(
        idToken, id, context.companyId, context.branchId,
        docType, contentType, file.size,
      );
      await uploadFileToGcs(session.uploadUrl, file);
      await recordRentalDocument(idToken, id, context.companyId, context.branchId, docType, session.objectUrl);
      setUploadedTypes((prev) => new Set([...prev, docType]));
    } catch {
      setUploadError('No pudimos subir el documento. Intenta de nuevo.');
    } finally {
      setUploadingType(null);
    }
  }

  async function handleContinue() {
    if (!rental || !context) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      let current = rental;
      if (needsOwnDriver && driverCustomer) {
        current = await registerAuthorizedDriver(
          idToken, id, context.companyId, context.branchId, rental.version,
          driverCustomer.id, addendumRef.trim(), holderType,
        );
        setRental(current);
      }
      const updated = await validateDocuments(idToken, id, context.companyId, context.branchId, current.version, {
        identityDocumentValid: idDocUploaded,
        driverLicenseValid: licenseUploaded,
        addressOrStayProofValid: addressUploaded,
        notes: notes || undefined,
      });
      setRental(updated);
      navigate(`/alquileres/${id}/entrega-02`, { state: context });
    } catch (err) {
      if (err instanceof RentalCommandError) setError(describeRentalError(err, err.message));
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
              aria-pressed={driverType === option}
              disabled={option === 'JURIDICA' && isNaturalHolder}
              className={`${styles.chip} ${driverType === option ? styles.chipActive : ''}`}
              onClick={() => setDriverType(option)}
            >
              {option === 'TITULAR' ? 'Titular' : option === 'ACOMPANANTE' ? 'Acompañante' : 'Persona jurídica'}
            </button>
          ))}
        </div>
        {isNaturalHolder && (
          <p className={styles.fieldHint} data-testid="natural-no-own-driver">
            Titular persona natural: conduce el titular o se asigna conductor de la empresa. No se registra un conductor propio distinto.
          </p>
        )}
        {registeredDriver && (
          <p className={styles.summaryLine} data-testid="registered-driver">
            Conductor autorizado registrado. Adenda: {registeredDriver.addendumDocumentRef ?? 'sin referencia'}
          </p>
        )}
        {driverType === 'JURIDICA' && !isNaturalHolder && !registeredDriver && (
          <div data-testid="own-driver-form">
            {driverCustomer ? (
              <p className={styles.summaryLine}>
                <strong>Cliente-conductor:</strong> {driverCustomer.fullName} ({driverCustomer.documentNumber}){' '}
                <button type="button" className={styles.retryButton} onClick={() => setDriverCustomer(null)}>
                  Cambiar
                </button>
              </p>
            ) : (
              <label className={styles.fieldLabel}>
                Buscar cliente-conductor (nombre o documento)
                <input
                  className={styles.input}
                  type="search"
                  value={driverSearch.customerSearchQuery}
                  onChange={(e) => driverSearch.setCustomerSearchQuery(e.target.value)}
                />
                {driverSearch.searchingCustomers && <span className={styles.fieldHint}>Buscando…</span>}
                {driverSearch.customerSearchResults.length > 0 && (
                  <ul role="listbox" aria-label="Conductores encontrados">
                    {driverSearch.customerSearchResults.map((c) => (
                      <li key={c.id} role="option" aria-selected={false}>
                        <button type="button" className={styles.chip} onClick={() => driverSearch.selectCustomer(c)}>
                          {c.fullName} - {c.documentNumber}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </label>
            )}
            <label className={styles.fieldLabel}>
              Referencia de la adenda del conductor
              <input
                className={styles.input}
                value={addendumRef}
                onChange={(e) => setAddendumRef(e.target.value)}
              />
              <span className={styles.fieldHint}>La adenda firmada por el conductor es obligatoria.</span>
            </label>
          </div>
        )}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Documentos requeridos</legend>

        {uploadError && <p className={styles.evidenceError}>{uploadError}</p>}

        <DocumentUploadItem
          label="Licencia de conducir"
          done={licenseUploaded}
          saving={uploadingType === 'LICENSE'}
          onUpload={() => licenseFileRef.current?.click()}
        />
        <input
          ref={licenseFileRef}
          type="file"
          accept="image/jpeg,image/webp,image/png,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileUpload(file, 'LICENSE');
            e.target.value = '';
          }}
        />

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
        <DocumentUploadItem
          label={idDocType === 'DNI' ? 'DNI' : 'Pasaporte / Carné de extranjería'}
          done={idDocUploaded}
          saving={uploadingType === 'ID_DOCUMENT'}
          onUpload={() => idDocFileRef.current?.click()}
        />
        <input
          ref={idDocFileRef}
          type="file"
          accept="image/jpeg,image/webp,image/png,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileUpload(file, 'ID_DOCUMENT');
            e.target.value = '';
          }}
        />

        <DocumentUploadItem
          label="Comprobante de domicilio / estadía (opcional)"
          done={addressUploaded}
          saving={uploadingType === 'PROOF_OF_ADDRESS'}
          onUpload={() => addressFileRef.current?.click()}
        />
        <input
          ref={addressFileRef}
          type="file"
          accept="image/jpeg,image/webp,image/png,application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileUpload(file, 'PROOF_OF_ADDRESS');
            e.target.value = '';
          }}
        />
      </fieldset>

      <label className={styles.fieldLabel}>
        Notas
        <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>
    </RentalWizardShell>
  );
}

function DocumentUploadItem({
  label,
  done,
  saving,
  onUpload,
}: {
  label: string;
  done: boolean;
  saving: boolean;
  onUpload: () => void;
}) {
  return (
    <div className={styles.documentItem}>
      {done ? (
        <CheckCircle2 size={18} className={styles.checkDone} />
      ) : (
        <Circle size={18} className={styles.checkPending} />
      )}
      <span className={styles.documentLabel}>{label}</span>
      {!done && (
        <button
          type="button"
          className={styles.retryButton}
          disabled={saving}
          onClick={onUpload}
        >
          {saving ? 'Subiendo…' : 'Subir'}
        </button>
      )}
    </div>
  );
}
