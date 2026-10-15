import { useEffect, useState, type FormEvent } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listRentals, type RentalResponse } from '../rentals/rentals-client';
import { listReturns, type ReturnResponse } from '../returns/returns-client';
import { IncidentDialog } from './IncidentDialog';
import {
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_TYPES,
  INCIDENT_TYPE_LABELS,
  MAX_TEXT_LENGTH,
  type IncidentSeverity,
  type IncidentType,
} from './incident-domain';
import { createIncident, type IncidentResponse } from './incidents-client';
import { describeIncidentError } from './incident-errors';
import type { IncidentsWorkContext } from './useWorkContextForIncidents';
import styles from './IncidentDialog.module.css';
import { formatLimaDate } from '../shared/lima-time';

interface Props {
  context: IncidentsWorkContext;
  /** Alquiler/devolucion preseleccionados (entrada desde ALQ-10 / Devolucion). */
  initialRentalId?: string;
  initialReturnId?: string;
  onCreated: (incident: IncidentResponse) => void;
  onCancel: () => void;
}

/** INC-01 - "Registrar incidencia": alquiler, devolucion opcional, tipo, severidad, descripcion, sugerencia opcional. */
export function RegisterIncidentDialog({ context, initialRentalId, initialReturnId, onCreated, onCancel }: Props) {
  const [rentals, setRentals] = useState<RentalResponse[]>([]);
  const [returns, setReturns] = useState<ReturnResponse[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [rentalId, setRentalId] = useState(initialRentalId ?? '');
  const [returnId, setReturnId] = useState(initialReturnId ?? '');
  const [type, setType] = useState<IncidentType | ''>('');
  const [severity, setSeverity] = useState<IncidentSeverity | ''>('');
  const [description, setDescription] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();
        const [rentalList, returnList] = await Promise.all([
          listRentals(idToken, context.companyId, context.branchId).catch(() => [] as RentalResponse[]),
          listReturns(idToken, context.companyId, context.branchId, { limit: 100 }).catch(() => [] as ReturnResponse[]),
        ]);
        if (cancelled) return;
        setRentals(rentalList.filter((r) => r.branchId === context.branchId || !r.branchId));
        setReturns(returnList.filter((r) => r.branchId === context.branchId));
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context.companyId, context.branchId]);

  const rentalReturns = returns.filter((r) => r.rentalId === rentalId && r.status !== 'CANCELADA');
  const descriptionTrimmed = description.trim();
  const missing = {
    rental: !rentalId,
    type: !type,
    severity: !severity,
    description: !descriptionTrimmed,
  };
  const invalid = Object.values(missing).some(Boolean);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (invalid || busy || !type || !severity) return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const created = await createIncident(idToken, context.companyId, context.branchId, {
        rentalId,
        returnId: returnId || undefined,
        type,
        severity,
        description: descriptionTrimmed,
        suggestion: suggestion.trim() || undefined,
      });
      onCreated(created);
    } catch (err) {
      setError(describeIncidentError(err, 'No pudimos registrar la incidencia. Intenta de nuevo.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <IncidentDialog titleId="register-incident-title" title="Registrar incidencia" onClose={onCancel}>
      <form onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor="inc-rental">Alquiler</label>
          <select
            id="inc-rental"
            className={styles.input}
            value={rentalId}
            onChange={(e) => {
              setRentalId(e.target.value);
              setReturnId('');
            }}
            aria-required="true"
            aria-invalid={submitted && missing.rental}
          >
            <option value="">{loadingCatalog ? 'Cargando alquileres…' : 'Selecciona un alquiler'}</option>
            {rentals.map((rental) => (
              <option key={rental.id} value={rental.id}>
                {rental.vehiclePlate} — {rental.customerName}
              </option>
            ))}
            {rentalId && !rentals.some((r) => r.id === rentalId) && !loadingCatalog && (
              <option value={rentalId}>Alquiler {rentalId.slice(0, 8)}</option>
            )}
          </select>
          {submitted && missing.rental && <span className={styles.error}>Selecciona el alquiler relacionado.</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="inc-return">Devolución <span className={styles.hint}>(opcional)</span></label>
          <select
            id="inc-return"
            className={styles.input}
            value={returnId}
            onChange={(e) => setReturnId(e.target.value)}
            disabled={!rentalId}
          >
            <option value="">Sin devolución asociada</option>
            {rentalReturns.map((ret) => (
              <option key={ret.id} value={ret.id}>
                Devolución del {formatLimaDate(ret.scheduledAt)} — {ret.vehiclePlate ?? ret.id.slice(0, 8)}
              </option>
            ))}
            {returnId && !rentalReturns.some((r) => r.id === returnId) && (
              <option value={returnId}>Devolución {returnId.slice(0, 8)}</option>
            )}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="inc-type">Tipo</label>
          <select
            id="inc-type"
            className={styles.input}
            value={type}
            onChange={(e) => setType(e.target.value as IncidentType | '')}
            aria-required="true"
            aria-invalid={submitted && missing.type}
          >
            <option value="">Selecciona un tipo</option>
            {INCIDENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {INCIDENT_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
          {submitted && missing.type && <span className={styles.error}>Selecciona el tipo de incidencia.</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="inc-severity">Severidad</label>
          <select
            id="inc-severity"
            className={styles.input}
            value={severity}
            onChange={(e) => setSeverity(e.target.value as IncidentSeverity | '')}
            aria-required="true"
            aria-invalid={submitted && missing.severity}
          >
            <option value="">Selecciona la severidad</option>
            {INCIDENT_SEVERITIES.map((value) => (
              <option key={value} value={value}>
                {INCIDENT_SEVERITY_LABELS[value]}
              </option>
            ))}
          </select>
          {submitted && missing.severity && <span className={styles.error}>Selecciona la severidad.</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="inc-description">Descripción de la observación</label>
          <textarea
            id="inc-description"
            className={styles.input}
            value={description}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(e) => setDescription(e.target.value)}
            aria-required="true"
            aria-invalid={submitted && missing.description}
          />
          {submitted && missing.description && <span className={styles.error}>Describe lo ocurrido.</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="inc-suggestion">Sugerencia <span className={styles.hint}>(opcional)</span></label>
          <textarea
            id="inc-suggestion"
            className={styles.input}
            value={suggestion}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(e) => setSuggestion(e.target.value)}
          />
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className={styles.accentButton} disabled={busy}>
            {busy ? 'Guardando…' : 'Registrar incidencia'}
          </button>
        </div>
      </form>
    </IncidentDialog>
  );
}
