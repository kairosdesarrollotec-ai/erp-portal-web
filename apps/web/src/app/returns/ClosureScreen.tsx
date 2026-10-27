import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ReturnFlowShell } from './ReturnFlowShell';
import { returnFlowGuard } from './ReturnGuards';
import { useReturnFlow } from './useReturnFlow';
import { DamageLog } from './DamageLog';
import { useCosmeticTariff } from './useCosmeticTariff';
import { formatPen } from './return-financial';
import { closeReturn, recordMechanicReport, escalateLegal, recordHolderNotification } from './returns-client';
import { describeReturnError, isIncidentOpenError, isStaleReturnError } from './return-errors';
import { clearReturnDrafts } from './return-session-draft';
import { ALCOHOL_RESULT_LABELS, FUEL_LEVEL_LABELS, RETURN_STATUS_LABELS } from './return-status';
import { useReturnPermissions } from './return-permissions';
import styles from './ReturnForms.module.css';
import { formatLimaDateTime } from '../shared/lima-time';

/**
 * DEV-10 - Cierre y expediente. Resumen final del expediente de origen
 * (alquiler) y archivo definitivo (accion irreversible, UC-DEV-005). Acta de
 * devolucion de garantia opcional (BR-DEV-010, solo si el cliente la pide).
 * Una devolucion CERRADA se muestra en solo lectura.
 *
 * Prototipo(s) aprobado(s): PROTO-DEV-10-CIERRE-Y-EXPEDIENTE-DEV-0456.
 */
export function ClosureScreen() {
  const { id, state, ret, context, getIdToken, setRet, reload } = useReturnFlow();
  const navigate = useNavigate();
  const { can } = useReturnPermissions();
  const [wantsAct, setWantsAct] = useState(false);
  const [signature, setSignature] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalReason, setLegalReason] = useState('');
  const [legalCaseNumber, setLegalCaseNumber] = useState('');
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyChannel, setNotifyChannel] = useState('WHATSAPP');
  const [notifiedBy, setNotifiedBy] = useState('');
  const [notifyObs, setNotifyObs] = useState('');
  const tariff = useCosmeticTariff(
    context,
    getIdToken,
    Boolean(ret?.damages?.some((d) => d.origin === 'AESTHETIC')),
  );

  const guard = returnFlowGuard({ state, hasReturn: Boolean(ret) });
  if (guard || !ret) return guard;

  const doc = ret.responsibilityDocument;
  const closed = ret.status === 'CERRADA';
  const actionable = ret.status === 'CIERRE_FINANCIERO';
  const hasDamages = Boolean(ret.damages && ret.damages.length > 0);
  const mechanicReportGate = !hasDamages || ret.mechanicReportAccepted === true;
  const offlineGate = !ret.hasPendingOfflineChanges;
  const canSubmit = actionable && !blocked && offlineGate && mechanicReportGate && can('CLOSE') && (!wantsAct || signature.trim().length > 0);

  async function handleClose() {
    if (!context || !ret) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await closeReturn(idToken, id, context.companyId, context.branchId, ret.version, {
        signatureData: wantsAct ? signature.trim() : undefined,
        generateWarrantyAct: wantsAct,
        notes: notes.trim() || undefined,
      });
      setRet(updated);
      clearReturnDrafts(id);
      setConfirmOpen(false);
    } catch (err) {
      setConfirmOpen(false);
      if (isIncidentOpenError(err)) setBlocked(true);
      setError(describeReturnError(err, 'No pudimos cerrar la devolución. Intenta de nuevo.'));
      if (isStaleReturnError(err)) await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleRecordMechanicReport(accepted: boolean) {
    if (!context || !ret) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await recordMechanicReport(idToken, id, context.companyId, context.branchId, ret.version, {
        accepted,
        observation: accepted ? 'Aceptado por el cliente' : 'No aceptado por el cliente',
      });
      setRet(updated);
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos registrar la respuesta del informe mecánico.'));
      if (isStaleReturnError(err)) await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleEscalateLegal() {
    if (!context || !ret || !legalReason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await escalateLegal(idToken, id, context.companyId, context.branchId, ret.version, {
        reason: legalReason.trim(),
        legalCaseNumber: legalCaseNumber.trim() || undefined,
      });
      setRet(updated);
      setLegalModalOpen(false);
      setLegalReason('');
      setLegalCaseNumber('');
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos anotar la escalación legal.'));
      if (isStaleReturnError(err)) await reload();
    } finally {
      setBusy(false);
    }
  }

  async function handleRecordHolderNotification() {
    if (!context || !ret || !notifiedBy.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const updated = await recordHolderNotification(idToken, id, context.companyId, context.branchId, ret.version, {
        channel: notifyChannel,
        contactedAt: new Date().toISOString(),
        notifiedBy: notifiedBy.trim(),
        observations: notifyObs.trim() || undefined,
      });
      setRet(updated);
      setNotifyModalOpen(false);
      setNotifyObs('');
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos registrar la notificación formal al titular ausente.'));
      if (isStaleReturnError(err)) await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ReturnFlowShell
      step={6}
      title="Cierre y expediente"
      onContinue={actionable ? () => setConfirmOpen(true) : undefined}
      continueLabel="Cerrar y archivar expediente"
      continueDisabled={!canSubmit}
      continueBusy={busy}
      errorMessage={error}
      lateness={ret.lateness}
      latenessCharge={ret.latenessCharge}
    >
      <h1 className={styles.pageHeading}>Cierre y expediente — {ret.vehiclePlate ?? 'Vehículo'}</h1>

      {ret.hasPendingOfflineChanges && (
        <p className={`${styles.banner} ${styles.banner_error}`} role="alert" data-testid="offline-changes-banner">
          Hay cambios pendientes de sincronización local. Espera a que se sincronicen antes de cerrar el expediente.
        </p>
      )}

      {ret.legalEscalatedAt && (
        <p className={`${styles.banner} ${styles.banner_info}`} data-testid="legal-escalated-banner">
          Expediente escalado a Legal ({formatLimaDateTime(ret.legalEscalatedAt)})
          {ret.legalCaseNumber ? ` · Caso N° ${ret.legalCaseNumber}` : ''}
          {ret.legalEscalationReason ? ` · Motivo: ${ret.legalEscalationReason}` : ''}
        </p>
      )}

      {ret.holderNotification?.pending && (
        <div className={`${styles.banner} ${styles.banner_warning}`} role="alert" data-testid="holder-notification-pending-banner">
          <p>
            <strong>Aviso:</strong> Notificación formal al titular ausente pendiente de registro. El vehículo fue devuelto por un tercero y debe notificarse formalmente al titular.
          </p>
          {!closed && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setNotifyModalOpen(true)}
              data-testid="open-holder-notification-modal-btn"
              style={{ marginTop: '0.5rem' }}
            >
              Registrar notificación al titular
            </button>
          )}
        </div>
      )}

      {ret.holderNotification?.sent && (
        <p className={`${styles.banner} ${styles.banner_success}`} data-testid="holder-notification-sent-banner">
          ✓ Notificación formal al titular registrada el {formatLimaDateTime(ret.holderNotification.sentAt!)} vía {ret.holderNotification.channel} (por {ret.holderNotification.sentBy})
          {ret.holderNotification.observations ? ` · ${ret.holderNotification.observations}` : ''}
        </p>
      )}

      {blocked && (
        <p className={`${styles.banner} ${styles.banner_error}`} role="alert">
          Cierre bloqueado: hay una incidencia o evaluación de daño abierta vinculada a esta devolución. Resuélvela antes de
          cerrar el expediente.
        </p>
      )}

      {closed && (
        <p className={`${styles.banner} ${styles.banner_success}`} role="status">
          Expediente cerrado
          {ret.closedAt ? ` el ${formatLimaDateTime(ret.closedAt)}` : ''}. El alquiler pasó a cerrado y la flota
          se actualizó.
        </p>
      )}

      {!closed && !actionable && (
        <p className={`${styles.banner} ${styles.banner_info}`}>
          El expediente aún no llegó al cierre (estado: {RETURN_STATUS_LABELS[ret.status]}).{' '}
          <button
            type="button"
            className={styles.textLink}
            onClick={() => navigate('/devoluciones', { state: context })}
          >
            Volver a la bandeja
          </button>
        </p>
      )}

      <section className={styles.reviewSection}>
        <p className={styles.reviewSectionTitle}>Expediente de origen</p>
        <p className={styles.summaryLine}>
          Cliente: {ret.customerName ?? '—'} · Vehículo: {ret.vehiclePlate ?? '—'}
        </p>
        <p className={styles.summaryLine}>
          Alquiler de origen:{' '}
          <Link to="/alquileres" state={context ?? undefined}>
            ver en Alquileres
          </Link>
        </p>
      </section>

      {ret.identityVerification?.result === 'NO_CONFORME' && (
        <section className={`${styles.banner} ${styles.banner_warning}`} data-testid="identity-not-conforme-banner" role="alert">
          <p className={styles.reviewSectionTitle} style={{ color: '#8a4b00' }}>⚠️ Advertencia de Identidad: No Conforme</p>
          <p className={styles.summaryLine}>
            La persona que entregó el vehículo presentó un documento registrado como NO CONFORME ({ret.identityVerification.documentType ?? 'DOC'}: {ret.identityVerification.documentNumber ?? 'S/N'}).
            {ret.identityVerification.observation ? ` Detalle: ${ret.identityVerification.observation}` : ''}
          </p>
          <p className={styles.summaryLine}>
            Conforme a DEC-DEV-LEGAL-001, la recepción física no se bloqueó, pero el caso ha sido notificado a Gerencia para seguimiento legal/administrativo.
          </p>
        </section>
      )}

      <section className={styles.reviewSection}>
        <p className={styles.reviewSectionTitle}>Recepción</p>
        <p className={styles.summaryLine}>
          Recibido: {ret.receivedAt ? formatLimaDateTime(ret.receivedAt) : '—'} · Kilometraje:{' '}
          {ret.mileageAtReturn ?? '—'} · Combustible: {ret.fuelLevelAtReturn ? FUEL_LEVEL_LABELS[ret.fuelLevelAtReturn] : '—'}
        </p>
        <p className={styles.summaryLine}>
          Alcoholímetro: {ret.alcoholTestResult ? ALCOHOL_RESULT_LABELS[ret.alcoholTestResult] : 'sin registro'} · Cliente
          presente: {ret.customerPresent ? 'sí' : 'no (titular ausente)'}
        </p>
        {ret.identityVerification && (
          <p className={styles.summaryLine} data-testid="identity-verification-summary">
            Identificación de entrega: {ret.identityVerification.documentType} {ret.identityVerification.documentNumber} ({ret.identityVerification.matchesHolder ? 'titular' : 'tercero'}) — Resultado: <strong>{ret.identityVerification.result}</strong>
            {ret.identityVerification.observation ? ` (Obs: ${ret.identityVerification.observation})` : ''}
          </p>
        )}
      </section>

      <section className={styles.reviewSection}>
        <p className={styles.reviewSectionTitle}>Liquidación</p>
        <p className={styles.summaryLine}>
          Liquidación final:{' '}
          {ret.finalSettlementAmount != null ? formatPen(ret.finalSettlementAmount) : 'pendiente'}
        </p>
      </section>

      <section className={styles.reviewSection}>
        <p className={styles.reviewSectionTitle}>Documento de responsabilidad</p>
        <p className={styles.summaryLine}>
          {doc
            ? `Firmado por ${doc.signerName} (${doc.signerIsHolder ? 'titular' : `no es el titular${doc.signerRelationToHolder ? ` — ${doc.signerRelationToHolder}` : ''}`}). El cliente declara no haber incurrido en infracciones.`
            : 'Sin documento de responsabilidad registrado en el expediente.'}
        </p>
      </section>

      <DamageLog
        damages={ret.damages}
        charges={ret.immobilizationCharges}
        zoneNames={Object.fromEntries(tariff.items.map((t) => [t.code, t.name]))}
      />

      {hasDamages && (
        <section className={styles.reviewSection} data-testid="mechanic-report-section">
          <p className={styles.reviewSectionTitle}>Informe de Taller Mecánico / Motrix</p>
          {ret.mechanicReportAccepted === true ? (
            <p className={`${styles.banner} ${styles.banner_success}`} data-testid="mechanic-report-accepted">
              ✓ Informe mecánico aceptado por el cliente
              {ret.mechanicReportAcceptedAt ? ` (${formatLimaDateTime(ret.mechanicReportAcceptedAt)})` : ''}
              {ret.mechanicReportObservation ? ` · ${ret.mechanicReportObservation}` : ''}
            </p>
          ) : (
            <div data-testid="mechanic-report-pending">
              <p className={`${styles.banner} ${styles.banner_error}`} role="alert">
                Este vehículo presenta daños. Es requisito obligatorio que el cliente acepte el informe del taller mecánico/Motrix antes de archivar el expediente.
              </p>
              {actionable && (
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={busy}
                    onClick={() => handleRecordMechanicReport(false)}
                    data-testid="mechanic-report-reject-btn"
                  >
                    Registrar rechazo de cliente
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={busy}
                    onClick={() => handleRecordMechanicReport(true)}
                    data-testid="mechanic-report-accept-btn"
                  >
                    Registrar aceptación de cliente
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {!closed && (
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setLegalModalOpen(true)}
            data-testid="open-legal-escalation-modal-btn"
          >
            {ret.legalEscalatedAt ? 'Actualizar anotación legal' : 'Anotar escalación legal'}
          </button>
        </div>
      )}

      {actionable && (
        <>
          {ret.depositRequired === false && (
            <p className={`${styles.banner} ${styles.banner_info}`} role="status" data-testid="no-deposit-banner">
              Sin garantía (conductor de la empresa): no hay acta de devolución de garantía.
            </p>
          )}
          {ret.depositRequired !== false && (
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={wantsAct} onChange={(e) => setWantsAct(e.target.checked)} />
            El cliente solicita el acta de devolución de garantía
          </label>
          )}
          {wantsAct && ret.depositRequired !== false && (
            <label className={styles.fieldLabel}>
              Firma (nombre completo de quien firma el acta)
              <input className={styles.input} value={signature} onChange={(e) => setSignature(e.target.value)} />
            </label>
          )}
          <label className={styles.fieldLabel}>
            Observaciones finales
            <textarea className={styles.textarea} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {!can('CLOSE') && <p className={styles.blockedNotice}>Solo Administración o Gerencia pueden archivar el expediente.</p>}
        </>
      )}

      {closed && (
        <div className={styles.actionRow}>
          <button type="button" className={styles.primaryButton} onClick={() => navigate('/devoluciones', { state: context })}>
            Volver a la bandeja
          </button>
        </div>
      )}

      {confirmOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="close-confirm-title">
          <div className={styles.modalCard}>
            <p id="close-confirm-title" className={styles.modalTitle}>
              ¿Cerrar y archivar el expediente?
            </p>
            <p className={styles.summaryLine}>
              Esta acción es irreversible: cierra la devolución y el alquiler, y actualiza el estado del vehículo.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmOpen(false)}>
                Cancelar
              </button>
              <button type="button" className={styles.dangerButton} onClick={handleClose} disabled={busy}>
                Cerrar expediente
              </button>
            </div>
          </div>
        </div>
      )}

      {legalModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="legal-modal-title">
          <div className={styles.modalCard}>
            <p id="legal-modal-title" className={styles.modalTitle}>
              Anotar escalación legal
            </p>
            <p className={styles.summaryLine}>
              Registra el motivo del pase a legal y el número de caso judicial/policial si aplica.
            </p>
            <label className={styles.fieldLabel}>
              Motivo de escalación *
              <textarea
                className={styles.textarea}
                rows={3}
                value={legalReason}
                onChange={(e) => setLegalReason(e.target.value)}
                placeholder="Ej. Negativa de pago por daños mecánicos graves / apropiación ilícita..."
                data-testid="legal-reason-input"
              />
            </label>
            <label className={styles.fieldLabel}>
              Número de caso / expediente legal (opcional)
              <input
                className={styles.input}
                value={legalCaseNumber}
                onChange={(e) => setLegalCaseNumber(e.target.value)}
                placeholder="Ej. CASO-2026-0042"
                data-testid="legal-case-number-input"
              />
            </label>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setLegalModalOpen(false)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleEscalateLegal}
                disabled={busy || !legalReason.trim()}
                data-testid="submit-legal-escalation-btn"
              >
                Guardar escalación legal
              </button>
            </div>
          </div>
        </div>
      )}

      {notifyModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="notify-modal-title">
          <div className={styles.modalCard}>
            <p id="notify-modal-title" className={styles.modalTitle}>
              Registrar notificación formal al titular ausente
            </p>
            <p className={styles.summaryLine}>
              (SC-DEV-004.01, EX-DEV-001) El vehículo fue recibido por un tercero. Registra los datos de la comunicación formal realizada al titular.
            </p>
            <label className={styles.fieldLabel}>
              Canal de comunicación *
              <select
                className={styles.select}
                value={notifyChannel}
                onChange={(e) => setNotifyChannel(e.target.value)}
                data-testid="notify-channel-select"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="CORREO">Correo electrónico</option>
                <option value="TELEFONO">Llamada telefónica</option>
                <option value="CARTA_NOTARIAL">Carta notarial</option>
                <option value="PRESENCIAL">Presencial</option>
              </select>
            </label>
            <label className={styles.fieldLabel}>
              Persona que notificó (nombre o cargo) *
              <input
                className={styles.input}
                value={notifiedBy}
                onChange={(e) => setNotifiedBy(e.target.value)}
                placeholder="Ej. Asesor Front Office Juan Pérez"
                data-testid="notified-by-input"
              />
            </label>
            <label className={styles.fieldLabel}>
              Observaciones / detalle de la notificación (opcional)
              <textarea
                className={styles.textarea}
                rows={3}
                value={notifyObs}
                onChange={(e) => setNotifyObs(e.target.value)}
                placeholder="Ej. Se envió copia del acta de inspección, se confirmó recepción..."
                data-testid="notify-obs-input"
              />
            </label>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setNotifyModalOpen(false)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleRecordHolderNotification}
                disabled={busy || !notifiedBy.trim()}
                data-testid="submit-holder-notification-btn"
              >
                Guardar notificación
              </button>
            </div>
          </div>
        </div>
      )}
    </ReturnFlowShell>
  );
}
