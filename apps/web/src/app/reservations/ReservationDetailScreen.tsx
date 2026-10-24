import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { useReservationDetail } from './useReservationDetail';
import { RESERVATION_STATUS_LABELS } from './reservation-status';
import { AppHeader } from '../shared/AppHeader';
import { useRolePermissions } from '../shared/useRolePermissions';
import {
  requestReservationDocumentUploadSession,
  uploadReservationFileToGcs,
  recordReservationDocument,
} from './reservations-client';
import { getFirebaseAuth } from '../providers/firebase';
import styles from './ReservationDetailScreen.module.css';
import { formatLimaDate, formatLimaDayMonth, limaToday, toLimaDateOnly } from '../shared/lima-time';
import { PaymentProofForm } from '../shared/PaymentProofForm';
import { toReservationPaymentBody, type PaymentProofDraft } from '../shared/payment-proof';
import { VehicleDataWarnings } from '../shared/VehicleDataWarnings';

/**
 * RES-04/RES-05 consolidadas en una sola pantalla (misma URL, el
 * contenido cambia segun el estado de la reserva) - PANTALLAS-V3-B-RESERVA.md.
 * Prototipos aprobados: PROTO-RES-04-BORRADOR-NO-CONFIRMADA-RES-2291,
 * PROTO-RES-04-REQUISITOS-CONFIRMACION(-MOVIL), PROTO-RES-05-DETALLE-CONFIRMADA-*.
 *
 * Simplificacion respecto al prototipo original (documentada, no
 * inventada): el backend de este primer corte (HU-27, ver PROP-005 en
 * docs/decision-log.md) modela 2 requisitos consolidados
 * (payment_validated_at, documents_completed_at). Ambos requieren carga
 * de archivo fisico: pago usa documentType PAYMENT_VOUCHER, contrato usa
 * OTHER (no existe tipo CONTRACT en la API todavia).
 * "Continuar con alquiler" (RES-05) navega a /alquileres/nuevo (ALQ-02)
 * pasando cliente, vehiculo y periodo heredados de la reserva confirmada
 * via location.state (ver NewRentalScreen.tsx).
 */
export function ReservationDetailScreen() {
  const { state, reservation, context, savingRequirement, actionError, vehicleUnavailable, uploadPaymentVoucher, uploadDocuments, confirm, cancel, reload } =
    useReservationDetail();
  const navigate = useNavigate();
  const { can } = useRolePermissions();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [uploadingVoucher, setUploadingVoucher] = useState(false);
  const [voucherUploadError, setVoucherUploadError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [contractUploadError, setContractUploadError] = useState<string | null>(null);
  const contractFileRef = useRef<HTMLInputElement>(null);
  const [uploadingVideo360, setUploadingVideo360] = useState(false);
  const [video360UploadError, setVideo360UploadError] = useState<string | null>(null);
  const video360FileRef = useRef<HTMLInputElement>(null);
  const [uploadingSignedAcceptance, setUploadingSignedAcceptance] = useState(false);
  const [signedAcceptanceUploadError, setSignedAcceptanceUploadError] = useState<string | null>(null);
  const signedAcceptanceFileRef = useRef<HTMLInputElement>(null);

  /** Decision 22-oct #8: sube el comprobante y envia metodo, nº de operacion y pagador junto con el registro del pago. */
  async function handlePaymentProof(draft: PaymentProofDraft) {
    if (!reservation || !context || !draft.file) return;
    const file = draft.file;
    let voucherDocumentId: string | undefined;
    setUploadingVoucher(true);
    setVoucherUploadError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const session = await requestReservationDocumentUploadSession(
        idToken,
        reservation.id,
        context.companyId,
        context.branchId,
        'PAYMENT_VOUCHER',
        file.type as 'image/jpeg' | 'image/webp' | 'image/png' | 'application/pdf',
        file.size,
      );
      await uploadReservationFileToGcs(session.uploadUrl, file);
      const recorded = await recordReservationDocument(
        idToken,
        reservation.id,
        context.companyId,
        context.branchId,
        'PAYMENT_VOUCHER',
        session.objectUrl,
      );
      voucherDocumentId = recorded?.id;
    } catch {
      setVoucherUploadError('No pudimos subir el comprobante. Intenta de nuevo.');
      setUploadingVoucher(false);
      return;
    }
    setUploadingVoucher(false);
    const updated = await uploadPaymentVoucher(
      toReservationPaymentBody(draft, reservation.customer.name, voucherDocumentId),
    );
    if (updated) setShowPaymentForm(false);
  }

  async function handleContractFile(file: File) {
    if (!reservation || !context) return;
    setUploadingContract(true);
    setContractUploadError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const session = await requestReservationDocumentUploadSession(
        idToken,
        reservation.id,
        context.companyId,
        context.branchId,
        'OTHER',
        file.type as 'image/jpeg' | 'image/webp' | 'image/png' | 'application/pdf',
        file.size,
      );
      await uploadReservationFileToGcs(session.uploadUrl, file);
      await recordReservationDocument(
        idToken,
        reservation.id,
        context.companyId,
        context.branchId,
        'OTHER',
        session.objectUrl,
      );
      await uploadDocuments();
    } catch {
      setContractUploadError('No pudimos subir el documento. Intenta de nuevo.');
    } finally {
      setUploadingContract(false);
    }
  }

  async function handleVideo360File(file: File) {
    if (!reservation || !context) return;
    setUploadingVideo360(true);
    setVideo360UploadError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const session = await requestReservationDocumentUploadSession(
        idToken,
        reservation.id,
        context.companyId,
        context.branchId,
        'VIDEO_360',
        file.type as 'image/jpeg' | 'image/webp' | 'image/png' | 'application/pdf',
        file.size,
      );
      await uploadReservationFileToGcs(session.uploadUrl, file);
      await recordReservationDocument(
        idToken,
        reservation.id,
        context.companyId,
        context.branchId,
        'VIDEO_360',
        session.objectUrl,
      );
      await reload();
    } catch {
      setVideo360UploadError('No pudimos subir el video 360°. Intenta de nuevo.');
    } finally {
      setUploadingVideo360(false);
    }
  }

  async function handleSignedAcceptanceFile(file: File) {
    if (!reservation || !context) return;
    setUploadingSignedAcceptance(true);
    setSignedAcceptanceUploadError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const session = await requestReservationDocumentUploadSession(
        idToken,
        reservation.id,
        context.companyId,
        context.branchId,
        'SIGNED_ACCEPTANCE',
        file.type as 'image/jpeg' | 'image/webp' | 'image/png' | 'application/pdf',
        file.size,
      );
      await uploadReservationFileToGcs(session.uploadUrl, file);
      await recordReservationDocument(
        idToken,
        reservation.id,
        context.companyId,
        context.branchId,
        'SIGNED_ACCEPTANCE',
        session.objectUrl,
      );
      await reload();
    } catch {
      setSignedAcceptanceUploadError('No pudimos subir el documento de aceptación firmado. Intenta de nuevo.');
    } finally {
      setUploadingSignedAcceptance(false);
    }
  }

  if (state === 'LOADING') {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>Cargando reserva…</p>
      </main>
    );
  }

  if (state === 'RECOVERABLE_ERROR' || !reservation) {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>No pudimos cargar esta reserva. Vuelve a la bandeja e intenta de nuevo.</p>
        <button type="button" className={styles.linkButton} onClick={() => navigate('/reservas')}>
          Volver a la bandeja
        </button>
      </main>
    );
  }

  const isConfirmed = reservation.status === 'CONFIRMED';
  const isRemote = Boolean(
    reservation.requirements?.isRemote ||
      reservation.channelMode === 'VIRTUAL' ||
      reservation.customerLocation === 'FUERA_DE_AYACUCHO' ||
      reservation.canComeToOffice === false,
  );
  const paymentDone = Boolean(reservation.requirements.paymentValidatedAt);
  const documentsDone = Boolean(reservation.requirements.documentsCompletedAt);
  const video360Done = Boolean(reservation.requirements?.video360Uploaded);
  const signedAcceptanceDone = Boolean(reservation.requirements?.signedAcceptanceUploaded);
  const allRequirementsMet = isRemote
    ? paymentDone && documentsDone && video360Done && signedAcceptanceDone
    : paymentDone && documentsDone;
  // Decision 22-oct #3: Reserva -> Alquiler solo desde la fecha pactada (dia calendario en hora de Lima).
  const beforeAgreedDate = limaToday() < toLimaDateOnly(reservation.startAt);

  return (
    <main className={styles.wrapper}>
      <AppHeader
        actions={
          <button type="button" className={styles.linkButton} onClick={() => navigate('/reservas')}>
            Volver a la bandeja
          </button>
        }
      />

      <div className={styles.content}>
        {state === 'SYNC_CONFLICT' && (
          <div className={styles.conflictBanner}>
            Esta reserva cambió por otra operación mientras la veías.{' '}
            <button type="button" className={styles.linkButton} onClick={() => void reload()}>
              Recargar
            </button>
          </div>
        )}

        <div className={styles.summaryPanel}>
          <p className={styles.vehicleLabel}>{reservation.vehicle.label}</p>
          <VehicleDataWarnings warnings={reservation.vehicleWarnings} vehicleId={reservation.vehicle.id} context={context} />
          <dl className={styles.summaryList}>
            <div>
              <dt>Cliente</dt>
              <dd>{reservation.customer.name}</dd>
            </div>
            <div>
              <dt>Fechas</dt>
              <dd>
                {formatLimaDate(reservation.startAt)} –{' '}
                {formatLimaDate(reservation.endAt)}
              </dd>
            </div>
            <div>
              <dt>Modalidad</dt>
              <dd>
                {isRemote ? (
                  <>
                    <span>Remota </span>
                    <span className={styles.badgeRemote}>Modalidad Remota (BR-RES-005)</span>
                  </>
                ) : (
                  'Presencial'
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className={styles.mainPanel}>
          <span className={`${styles.badge} ${isConfirmed ? styles.badgeConfirmed : styles.badgeDraft}`}>
            {RESERVATION_STATUS_LABELS[reservation.status]}
          </span>

          {isRemote && !isConfirmed && reservation.status === 'DRAFT' && (
            <div className={styles.remoteNotice}>
              El vehículo permanece disponible para otros clientes hasta completar el pago y la aceptación firmada (SC-RES-004).
            </div>
          )}

          {actionError && <p className={styles.errorText}>{actionError}</p>}
          {vehicleUnavailable && (
            <>
              <p id="vehicle-unavailable-alert" role="alert" className={styles.unavailableAlert}>
                {vehicleUnavailable}
              </p>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() =>
                  navigate(`/reservas/${reservation.id}/conflicto`, {
                    state: { ...context, conflictDetail: vehicleUnavailable },
                  })
                }
              >
                Ver alternativas
              </button>
            </>
          )}

          {reservation.status === 'PENDING_SALE_RESOLUTION' && (
            <>
              <p className={styles.helperText}>
                El vehículo fue vendido y la reserva está pendiente de resolver con el cliente.
              </p>
              {can('RESERVATION', 'RESOLVE_SALE') && (
                <button
                  type="button"
                  className={styles.confirmButton}
                  onClick={() => navigate(`/reservas/${reservation.id}/venta`, { state: context })}
                >
                  Resolver venta
                </button>
              )}
            </>
          )}

          {reservation.status === 'CANCELLED' && reservation.saleResolution?.refundStatus === 'PENDING_TRANSFER' && (
            <p className={styles.helperText}>
              Reembolso pendiente de transferencia: Gerencia debe devolver S/ {reservation.requiredPayment.amount} al cliente.
            </p>
          )}

          {!isConfirmed && reservation.status === 'DRAFT' && (
            <>
              <ul className={styles.checklist}>
                <ChecklistItem
                  label="Pago del monto de reserva vigente"
                  detail={`S/ ${reservation.requiredPayment.amount}`}
                  done={paymentDone}
                  saving={uploadingVoucher || savingRequirement === 'PAYMENT_VALIDATION'}
                  onUpload={() => setShowPaymentForm(true)}
                  uploadLabel="Registrar pago"
                />
                {isRemote && (
                  <>
                    <ChecklistItem
                      label="Video 360° del vehículo"
                      detail="Video en 360° para validación del estado del vehículo (SC-RES-007)"
                      done={video360Done}
                      saving={uploadingVideo360}
                      onUpload={() => video360FileRef.current?.click()}
                      uploadLabel="Subir video"
                    />
                    <ChecklistItem
                      label="Documento de aceptación firmado"
                      detail="Documento de aceptación y términos firmado por el cliente (SC-RES-007)"
                      done={signedAcceptanceDone}
                      saving={uploadingSignedAcceptance}
                      onUpload={() => signedAcceptanceFileRef.current?.click()}
                      uploadLabel="Subir documento"
                    />
                  </>
                )}
                <ChecklistItem
                  label="Documentos / contrato"
                  detail={
                    isRemote
                      ? 'Documento de identidad / licencia de conducir'
                      : undefined
                  }
                  done={documentsDone}
                  saving={uploadingContract || savingRequirement === 'DOCUMENTS_COMPLETE'}
                  onUpload={() => contractFileRef.current?.click()}
                />
              </ul>
              {showPaymentForm && !paymentDone && (
                <PaymentProofForm
                  submitLabel="Enviar comprobante"
                  requireAmount
                  initialAmount={reservation.requiredPayment.amount}
                  hint={`Monto de reserva vigente: S/ ${reservation.requiredPayment.amount} (lo fija el sistema; no hay saldo a favor).`}
                  busy={uploadingVoucher || savingRequirement === 'PAYMENT_VALIDATION'}
                  error={actionError}
                  onSubmit={handlePaymentProof}
                  onCancel={() => setShowPaymentForm(false)}
                />
              )}
              <input
                ref={contractFileRef}
                type="file"
                accept="image/jpeg,image/webp,image/png,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleContractFile(file);
                  e.target.value = '';
                }}
              />
              <input
                ref={video360FileRef}
                type="file"
                accept="video/mp4,video/webm,image/jpeg,image/png"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleVideo360File(file);
                  e.target.value = '';
                }}
              />
              <input
                ref={signedAcceptanceFileRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleSignedAcceptanceFile(file);
                  e.target.value = '';
                }}
              />
              {voucherUploadError && <p className={styles.errorText}>{voucherUploadError}</p>}
              {contractUploadError && <p className={styles.errorText}>{contractUploadError}</p>}
              {video360UploadError && <p className={styles.errorText}>{video360UploadError}</p>}
              {signedAcceptanceUploadError && <p className={styles.errorText}>{signedAcceptanceUploadError}</p>}

              {allRequirementsMet && can('RESERVATION', 'CONFIRM') ? (
                <button
                  type="button"
                  className={styles.confirmButton}
                  disabled={savingRequirement === 'CONFIRM' || Boolean(vehicleUnavailable)}
                  aria-describedby={vehicleUnavailable ? 'vehicle-unavailable-alert' : undefined}
                  onClick={() => void confirm()}
                >
                  {savingRequirement === 'CONFIRM' ? 'Confirmando…' : 'Confirmar reserva'}
                </button>
              ) : (
                <p className={styles.helperText}>
                  {isRemote
                    ? 'Para confirmar una reserva remota se requiere completar el pago, documentos, video 360° y documento de aceptación firmado (BR-RES-005).'
                    : 'La reserva se confirma automáticamente al completar los 2 requisitos.'}
                </p>
              )}
            </>
          )}

          {isConfirmed && (
            <>
              <p className={styles.confirmedMessage}>
                Vehículo seleccionado para esta reserva. La disponibilidad se revalidará antes de confirmar el
                alquiler o la entrega.
              </p>

              <button
                type="button"
                className={styles.confirmButton}
                disabled={beforeAgreedDate}
                aria-describedby={beforeAgreedDate ? 'agreed-date-hint' : undefined}
                onClick={() =>
                  navigate('/alquileres/nuevo', {
                    state: {
                      ...context,
                      reservationId: reservation.id,
                      customerId: reservation.customer.id,
                      customerName: reservation.customer.name,
                      vehicleId: reservation.vehicle.id,
                      vehicleLabel: reservation.vehicle.label,
                      startAt: reservation.startAt,
                      expectedEndAt: reservation.endAt,
                    },
                  })
                }
              >
                Continuar con alquiler
              </button>
              {beforeAgreedDate && (
                <p id="agreed-date-hint" className={styles.helperText} role="status">
                  Disponible el día pactado: {formatLimaDayMonth(reservation.startAt)}. La reserva solo pasa a alquiler
                  en la fecha pactada (hora de Lima).
                </p>
              )}

              {reservation.startDatePassed && (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => navigate(`/reservas/${reservation.id}/no-show`, { state: context })}
                >
                  Protocolo de no-show
                </button>
              )}
              {can('RESERVATION', 'FLAG_SALE') && (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => navigate(`/reservas/${reservation.id}/venta`, { state: context })}
                >
                  Registrar venta del vehículo
                </button>
              )}

              {!showCancelForm && can('RESERVATION', 'CANCEL_CUSTOMER_REQUESTED_CHANGE') ? (
                <button type="button" className={styles.dangerLink} onClick={() => setShowCancelForm(true)}>
                  Cancelar por cambio solicitado
                </button>
              ) : showCancelForm ? (
                <div className={styles.cancelForm}>
                  <p className={styles.cancelWarning}>
                    Esto se procesará como cancelación — se pierde el monto de reserva (BR-RES-003).
                  </p>
                  <textarea
                    className={styles.cancelNote}
                    placeholder="Motivo del cambio solicitado"
                    value={cancelNote}
                    onChange={(event) => setCancelNote(event.target.value)}
                  />
                  <div className={styles.cancelActions}>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      disabled={savingRequirement === 'CANCEL'}
                      onClick={() => void cancel('CUSTOMER_REQUESTED_CHANGE', cancelNote || undefined)}
                    >
                      {savingRequirement === 'CANCEL' ? 'Cancelando…' : 'Confirmar cancelación'}
                    </button>
                    <button type="button" className={styles.linkButton} onClick={() => setShowCancelForm(false)}>
                      Volver
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function ChecklistItem({
  label,
  detail,
  done,
  saving,
  onUpload,
  uploadLabel = 'Subir',
}: {
  label: string;
  detail?: string;
  done: boolean;
  saving: boolean;
  onUpload: () => void;
  uploadLabel?: string;
}) {
  return (
    <li className={styles.checklistItem}>
      {done ? <CheckCircle2 size={20} className={styles.checkDone} /> : <Circle size={20} className={styles.checkPending} />}
      <div className={styles.checklistText}>
        <span>{label}</span>
        {detail && <span className={styles.checklistDetail}>{detail}</span>}
      </div>
      {!done && (
        <button type="button" className={styles.uploadButton} disabled={saving} onClick={onUpload}>
          {saving ? 'Subiendo…' : uploadLabel}
        </button>
      )}
    </li>
  );
}
