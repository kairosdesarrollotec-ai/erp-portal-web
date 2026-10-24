import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ReturnFlowShell } from './ReturnFlowShell';
import { returnFlowGuard } from './ReturnGuards';
import { useReturnFlow } from './useReturnFlow';
import { ZoneComparator } from './ZoneComparator';
import {
  completeInspection,
  getReturnZoneMarks,
  listReturnEvidence,
  recordReturnZoneMarks,
  ReturnCommandError,
  ReturnEvidenceResponse,
  ReturnZoneMarkItem,
} from './returns-client';
import { listRentalEvidence, RentalEvidenceResponse } from '../rentals/rentals-client';
import { describeReturnError, isStaleReturnError } from './return-errors';
import { RETURN_ZONES, zoneLabel } from './return-evidence';
import {
  isResponsibilityDocumentComplete,
  loadReturnChecklist,
  loadZoneMarks,
  saveReturnChecklist,
  saveZoneMarks,
  EMPTY_RESPONSIBILITY_DOCUMENT,
  ZoneMark,
  ZoneMarks,
} from './return-session-draft';
import { useReturnPermissions } from './return-permissions';
import { useIncidentPermissions } from '../incidents/incident-permissions';
import styles from './ReturnForms.module.css';

/**
 * DEV-05 - Resultado: hub de revelado progresivo. Compara entrega vs
 * devolucion por zona (5 zonas) y actua desde el mismo lugar:
 *  - las 5 zonas "Sin dano"  -> aparece "Liberar garantia" (directo a DEV-09,
 *    sin pasar por DEV-06/07/08). Nunca se asume "sin dano" por defecto.
 *  - al menos 1 zona con dano -> "Continuar a evaluacion de dano" (DEV-06).
 * El backend registra la categoria con complete-inspection (SIN_DANOS /
 * CON_DANOS); las marcas por zona se persisten en el servidor (PD-07:
 * GET/POST /returns/{id}/zone-marks) y se resumen en `damagesDescription`. complete-inspection
 * exige el documento de responsabilidad firmado en DEV-04 (BR-DEV-009): se
 * toma del borrador del checklist; si falta se devuelve al checklist.
 *
 * Prototipo(s) aprobado(s): SIN PROTO DEV-05 propio en el manifiesto: referencia visual (registrados como ALQ-09) PROTO-ALQ-09-RESULTADO-ZONA-1-EXTERIOR, PROTO-ALQ-09-RESULTADO-DANO-ZONA-3, PROTO-ALQ-10-RESULTADO-TRAS-CHECKLIST.
 */
export function ResultScreen() {
  const { id, state, ret, context, getIdToken, setRet, reload } = useReturnFlow();
  const navigate = useNavigate();
  const { can } = useReturnPermissions();
  const { can: canIncident } = useIncidentPermissions();
  const [marks, setMarks] = useState<ZoneMarks>(() => loadZoneMarks(id));
  const [currentZone, setCurrentZone] = useState(RETURN_ZONES[0].value);
  const [delivery, setDelivery] = useState<RentalEvidenceResponse[]>([]);
  const [returned, setReturned] = useState<ReturnEvidenceResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rentalId = ret?.rentalId;
  useEffect(() => {
    if (!context || !rentalId) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await getIdToken();
        const [d, r] = await Promise.all([
          listRentalEvidence(idToken, rentalId, context.companyId, context.branchId).catch(() => []),
          listReturnEvidence(idToken, id, context.companyId, context.branchId).catch(() => []),
        ]);
        if (!cancelled) {
          setDelivery(d);
          setReturned(r);
        }
      } catch {
        // la comparacion visual es de apoyo; un fallo no bloquea marcar zonas
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context, rentalId, id, getIdToken]);

  useEffect(() => {
    if (!context || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await getIdToken();
        const serverMarks = await getReturnZoneMarks(idToken, id, context.companyId, context.branchId);
        if (!cancelled && serverMarks?.marks && serverMarks.marks.length > 0) {
          const mapped: ZoneMarks = {};
          serverMarks.marks.forEach((m) => {
            mapped[m.zone] = m.mark === 'NO_DAMAGE' ? 'OK' : 'DAMAGED';
          });
          setMarks((prev) => {
            const next = { ...mapped, ...prev };
            saveZoneMarks(id, next);
            return next;
          });
        }
      } catch {
        // el borrador local sirve de respaldo
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context, id, getIdToken]);

  const guard = returnFlowGuard({ state, hasReturn: Boolean(ret) });
  if (guard || !ret) return guard;

  const resolved = ret.status === 'SIN_DANOS' || ret.status === 'CON_DANOS';
  const wrongState = ret.status !== 'INSPECCION' && !resolved;
  const evaluated = RETURN_ZONES.filter((z) => marks[z.value] !== undefined).length;
  const allMarked = evaluated === RETURN_ZONES.length;
  const damagedZones = RETURN_ZONES.filter((z) => marks[z.value] === 'DAMAGED');
  const noDamage = resolved ? ret.status === 'SIN_DANOS' : allMarked && damagedZones.length === 0;
  const withDamage = resolved ? ret.status === 'CON_DANOS' : allMarked && damagedZones.length > 0;

  function mark(zone: string, value: ZoneMark) {
    const next = { ...marks, [zone]: value };
    setMarks(next);
    saveZoneMarks(id, next);
    const following = RETURN_ZONES.find((z) => next[z.value] === undefined);
    if (following) setCurrentZone(following.value);

    if (context) {
      getIdToken()
        .then((idToken) => {
          const apiMark = value === 'OK' ? 'NO_DAMAGE' : 'DAMAGE';
          return recordReturnZoneMarks(idToken, id, context.companyId, context.branchId, [
            { zone: zone as ReturnZoneMarkItem['zone'], mark: apiMark },
          ]);
        })
        .catch(() => {
          // El estado local ya se guardó como respaldo
        });
    }
  }

  async function runInspection(hasDamages: boolean) {
    if (!context || !ret) return;
    setBusy(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const checklist = loadReturnChecklist(id);
      const doc = checklist.responsibilityDocument;
      if (!isResponsibilityDocumentComplete(doc)) {
        setError(describeReturnError(new ReturnCommandError(422, { code: 'MISSING_RESPONSIBILITY_DOCUMENT' }), ''));
        return;
      }
      const updated = await completeInspection(idToken, id, context.companyId, context.branchId, ret.version, {
        hasDamages,
        damagesDescription: hasDamages ? `Daño en: ${damagedZones.map((z) => z.label).join(', ')}` : undefined,
        notes: checklist.notes.trim() || undefined,
        responsibilityDocument: {
          signerName: doc.signerName.trim(),
          signerIsHolder: doc.signerIsHolder === true,
          signerRelationToHolder: doc.signerRelationToHolder.trim() || undefined,
          signatureData: doc.signatureData,
        },
      });
      // La firma ya quedo en el expediente: no se conserva en el navegador.
      saveReturnChecklist(id, { ...checklist, responsibilityDocument: { ...EMPTY_RESPONSIBILITY_DOCUMENT } });
      setRet(updated);
      navigate(hasDamages ? `/devoluciones/${id}/dano` : `/devoluciones/${id}/garantia`, { state: context });
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos registrar el resultado. Intenta de nuevo.'));
      if (isStaleReturnError(err)) await reload();
    } finally {
      setBusy(false);
    }
  }

  function goNext(hasDamages: boolean) {
    navigate(hasDamages ? `/devoluciones/${id}/dano` : `/devoluciones/${id}/garantia`, { state: context });
  }

  const canInspect = can('COMPLETE_INSPECTION');
  const draftDoc = loadReturnChecklist(id).responsibilityDocument;
  const docReady = isResponsibilityDocumentComplete(draftDoc);
  const signedDoc = ret.responsibilityDocument;
  const inspectionBlocked = !resolved && (!canInspect || !docReady);

  return (
    <ReturnFlowShell step={4} title="Resultado" errorMessage={error} alerts={ret.alerts} lateness={ret.lateness} latenessCharge={ret.latenessCharge}>
      <h1 className={styles.pageHeading}>Resultado — {ret.vehiclePlate ?? 'Vehículo'}</h1>

      {wrongState && (
        <p className={`${styles.banner} ${styles.banner_info}`}>
          El resultado se evalúa después de completar la recepción y el checklist.{' '}
          <button type="button" className={styles.textLink} onClick={() => navigate(`/devoluciones/${id}/checklist`, { state: context })}>
            Ir al checklist
          </button>
        </p>
      )}

      {!wrongState && !resolved && (
        <>
          <p className={styles.pageSubtitle}>
            Zona {RETURN_ZONES.findIndex((z) => z.value === currentZone) + 1} de {RETURN_ZONES.length}:{' '}
            {zoneLabel(currentZone)}. Cada zona exige una decisión: nunca se asume “sin daño” por defecto.
          </p>

          <ol className={styles.zoneBar} aria-label="Progreso de zonas">
            {RETURN_ZONES.map((z, index) => {
              const m = marks[z.value];
              return (
                <li key={z.value} style={{ flex: 1, display: 'flex' }}>
                  <button
                    type="button"
                    className={`${styles.zoneSegment} ${m ? styles[`zoneSegment_${m}`] : ''} ${
                      currentZone === z.value ? styles.zoneSegment_active : ''
                    }`}
                    style={{ width: '100%' }}
                    aria-current={currentZone === z.value ? 'step' : undefined}
                    aria-label={`Zona ${index + 1}: ${z.label}${m === 'OK' ? ', sin daño' : m === 'DAMAGED' ? ', con daño' : ', pendiente'}`}
                    onClick={() => setCurrentZone(z.value)}
                  >
                    {z.label}
                  </button>
                </li>
              );
            })}
          </ol>

          <ZoneComparator zone={currentZone} delivery={delivery} returned={returned} />

          <div className={styles.actionRow}>
            <button type="button" className={styles.secondaryButton} onClick={() => mark(currentZone, 'OK')}>
              Sin daño
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => mark(currentZone, 'DAMAGED')}>
              Marcar con daño en esta zona
            </button>
          </div>
        </>
      )}

      {noDamage && (
        <section aria-live="polite">
          <p className={`${styles.banner} ${styles.banner_success}`}>Sin daños encontrados en ninguna zona</p>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy || inspectionBlocked}
              onClick={() => (resolved ? goNext(false) : void runInspection(false))}
            >
              {busy ? 'Guardando…' : ret?.depositRequired === false ? 'Continuar (sin garantía)' : 'Liberar garantía'}
            </button>
            {canIncident('CREATE') && ret && (
              <Link
                to={`/incidencias?rentalId=${ret.rentalId}&returnId=${ret.id}&registrar=1`}
                state={context ?? undefined}
                className={styles.textLink}
              >
                Registrar incidencia de todas formas
              </Link>
            )}
          </div>
        </section>
      )}

      {withDamage && (
        <section aria-live="polite">
          <p className={`${styles.banner} ${styles.banner_warning}`}>
            {resolved
              ? 'La inspección registró daños en este vehículo.'
              : `Daño encontrado en ${damagedZones.length} de ${RETURN_ZONES.length} zonas`}
          </p>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.accentButton}
              disabled={busy || inspectionBlocked}
              onClick={() => (resolved ? goNext(true) : void runInspection(true))}
            >
              {busy ? 'Guardando…' : 'Continuar a evaluación de daño'}
            </button>
            {canIncident('CREATE') && ret && (
              <Link
                to={`/incidencias?rentalId=${ret.rentalId}&returnId=${ret.id}&registrar=1`}
                state={context ?? undefined}
                className={styles.textLink}
              >
                Registrar incidencia
              </Link>
            )}
          </div>
        </section>
      )}

      {signedDoc && (
        <p className={styles.summaryLine}>
          Documento de responsabilidad firmado por {signedDoc.signerName} (
          {signedDoc.signerIsHolder
            ? 'titular'
            : `no es el titular${signedDoc.signerRelationToHolder ? ` — ${signedDoc.signerRelationToHolder}` : ''}`}
          ).
        </p>
      )}

      {!wrongState && !resolved && !canInspect && (
        <p className={styles.blockedNotice}>Tu rol no puede cerrar la inspección. Pide apoyo a Front-office, Campo o Gerencia.</p>
      )}

      {!wrongState && !resolved && canInspect && !docReady && allMarked && (
        <p className={`${styles.banner} ${styles.banner_warning}`} role="status">
          Falta el documento de responsabilidad firmado.{' '}
          <button type="button" className={styles.textLink} onClick={() => navigate(`/devoluciones/${id}/checklist`, { state: context })}>
            Completarlo en el checklist
          </button>
        </p>
      )}
    </ReturnFlowShell>
  );
}
