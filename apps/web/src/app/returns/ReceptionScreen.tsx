import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ReturnFlowShell } from './ReturnFlowShell';
import { useWorkContextForReturns } from './useWorkContextForReturns';
import { getFirebaseAuth } from '../providers/firebase';
import { getRental, RentalResponse } from '../rentals/rentals-client';
import { receiveProvisional, ReturnFuelLevel } from './returns-client';
import { describeReturnError } from './return-errors';
import { FUEL_LEVEL_LABELS } from './return-status';
import { useReturnPermissions } from './return-permissions';
import styles from './ReturnForms.module.css';

type Returner = 'TITULAR' | 'OTRA_PERSONA';
const FUEL_OPTIONS = Object.keys(FUEL_LEVEL_LABELS) as ReturnFuelLevel[];

/**
 * DEV-02 - Recordatorio y recepcion (Identificacion). Vehiculo, cliente y
 * contrato vienen heredados del alquiler activo y no se vuelven a pedir.
 * "Recibir vehiculo" toma custodia fisica preventiva (RECEPCION_PROVISIONAL,
 * DR-DEV-003) sin cerrar la devolucion contractual. Si devuelve otra persona
 * (EX-DEV-001) se exigen nombre, relacion y quien asume responsabilidad; el
 * contrato returns.yaml no tiene campos propios para ello, por lo que se
 * registran en `notes`.
 *
 * Prototipo(s) aprobado(s): PROTO-DEV-02-RECORDATORIO-Y-RECEPCION, PROTO-DEV-02-RECEPCION-POR-TERCERO.
 */
export function ReceptionScreen() {
  const { rentalId = '' } = useParams<{ rentalId: string }>();
  const { context, loading: contextLoading } = useWorkContextForReturns();
  const navigate = useNavigate();
  const { can } = useReturnPermissions();
  const [rental, setRental] = useState<RentalResponse | null>(null);
  const [loadState, setLoadState] = useState<'LOADING' | 'READY' | 'ERROR'>('LOADING');
  const [reminderCalled, setReminderCalled] = useState(false);
  const [returner, setReturner] = useState<Returner>('TITULAR');
  const [returnerName, setReturnerName] = useState('');
  const [relation, setRelation] = useState('');
  const [responsible, setResponsible] = useState('');
  const [mileage, setMileage] = useState('');
  const [fuel, setFuel] = useState<ReturnFuelLevel | ''>('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contextLoading) return;
    if (!context || !rentalId) {
      queueMicrotask(() => setLoadState('ERROR'));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('Sesión no disponible');
        const idToken = await user.getIdToken();
        const result = await getRental(idToken, rentalId, context.companyId, context.branchId);
        if (cancelled) return;
        if (result.branchId !== context.branchId) throw new Error('Alquiler de otra sede');
        setRental(result);
        setLoadState('READY');
      } catch {
        if (!cancelled) setLoadState('ERROR');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context, contextLoading, rentalId]);

  const thirdParty = returner === 'OTRA_PERSONA';
  const mileageValue = Number(mileage);
  const mileageValid = mileage.trim() !== '' && Number.isInteger(mileageValue) && mileageValue >= 0;
  const thirdPartyComplete = !thirdParty || (returnerName.trim() && relation.trim() && responsible.trim());
  const canSubmit = can('RECEIVE_PROVISIONAL') && mileageValid && fuel !== '' && Boolean(thirdPartyComplete);

  async function handleReceive() {
    if (!context || !rental || fuel === '') return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const noteParts = [
        reminderCalled ? 'Llamada de recordatorio realizada.' : '',
        thirdParty
          ? `Devuelve otra persona: ${returnerName.trim()} (relación con el titular: ${relation.trim()}). Asume responsabilidad: ${responsible.trim()}.`
          : '',
        notes.trim(),
      ].filter(Boolean);
      const created = await receiveProvisional(idToken, context.companyId, context.branchId, rental.id, {
        mileageAtReturn: mileageValue,
        fuelLevelAtReturn: fuel,
        customerPresent: !thirdParty,
        notes: noteParts.join(' ') || undefined,
      });
      navigate(`/devoluciones/${created.id}/alcoholimetro`, { state: context });
    } catch (err) {
      setError(describeReturnError(err, 'No pudimos registrar la recepción. Intenta de nuevo.'));
    } finally {
      setBusy(false);
    }
  }

  if (loadState === 'LOADING') return <p className={styles.statusText}>Cargando alquiler…</p>;
  if (loadState === 'ERROR' || !rental) {
    return <p className={styles.statusText}>No pudimos cargar el alquiler a devolver. Intenta de nuevo.</p>;
  }

  return (
    <ReturnFlowShell
      step={1}
      title="Recepción"
      onContinue={handleReceive}
      continueLabel="Recibir vehículo"
      continueDisabled={!canSubmit}
      continueBusy={busy}
      errorMessage={error}
    >
      <h1 className={styles.pageHeading}>Recepción — {rental.vehiclePlate}</h1>
      <p className={styles.pageSubtitle}>
        Datos heredados del alquiler activo: no hace falta volver a pedirlos.
      </p>

      <div className={styles.summaryCard}>
        <p className={styles.summaryLine}>Cliente titular: {rental.customerName} ({rental.customerDocNumber})</p>
        <p className={styles.summaryLine}>
          Vehículo: {rental.vehicleBrand} {rental.vehicleModel} - {rental.vehiclePlate}
        </p>
        <p className={styles.summaryLine}>
          Fin pactado: {rental.expectedEndAt ? new Date(rental.expectedEndAt).toLocaleString('es-PE') : '—'}
        </p>
      </div>

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={reminderCalled} onChange={(e) => setReminderCalled(e.target.checked)} />
        Llamada de recordatorio realizada
      </label>

      <fieldset className={styles.fieldset}>
        <legend>¿Quién devuelve el vehículo?</legend>
        <div className={styles.radioRow}>
          <label className={styles.radioOption}>
            <input type="radio" name="returner" checked={returner === 'TITULAR'} onChange={() => setReturner('TITULAR')} />
            El titular
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="returner"
              checked={returner === 'OTRA_PERSONA'}
              onChange={() => setReturner('OTRA_PERSONA')}
            />
            Otra persona
          </label>
        </div>
      </fieldset>

      {thirdParty && (
        <fieldset className={styles.fieldset}>
          <legend>Titular ausente — documento de responsabilidad</legend>
          <p className={styles.summaryLine}>
            Se documenta con fotos y video esa misma noche (en el checklist) y la notificación formal al titular se
            hace al día siguiente.
          </p>
          <label className={styles.fieldLabel}>
            Nombre de quien devuelve
            <input className={styles.input} value={returnerName} onChange={(e) => setReturnerName(e.target.value)} />
          </label>
          <label className={styles.fieldLabel}>
            Relación con el titular
            <input className={styles.input} value={relation} onChange={(e) => setRelation(e.target.value)} />
          </label>
          <label className={styles.fieldLabel}>
            ¿Quién asume la responsabilidad?
            <input className={styles.input} value={responsible} onChange={(e) => setResponsible(e.target.value)} />
          </label>
        </fieldset>
      )}

      <label className={styles.fieldLabel}>
        Kilometraje al recibir
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          className={styles.input}
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
        />
      </label>

      <label className={styles.fieldLabel}>
        Nivel de combustible
        <select className={styles.select} value={fuel} onChange={(e) => setFuel(e.target.value as ReturnFuelLevel | '')}>
          <option value="">Selecciona…</option>
          {FUEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {FUEL_LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.fieldLabel}>
        Observaciones
        <textarea className={styles.textarea} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {!can('RECEIVE_PROVISIONAL') && (
        <p className={styles.blockedNotice}>Tu rol no puede recibir vehículos. Pide apoyo a Front-office, Campo o Gerencia.</p>
      )}
    </ReturnFlowShell>
  );
}
