import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { HrFrame } from './HrFrame';
import { evaluateFieldTripReturn, getEmployee, getFieldTrip, type EmployeeDetail, type FieldTrip, type HrMemo } from './hr-client';
import { FIELD_TRIP_STATUS_LABEL, ordinal, previewReturn } from './hr-domain';
import { formatDate, formatDateTime } from './hr-format';
import { useHrPermissions } from './hr-permissions';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import { limaDateTimeToInstant, limaNowInputValue } from '../shared/lima-time';
import styles from './HrFlow.module.css';

interface Loaded {
  trip: FieldTrip;
  employee: EmployeeDetail | null;
}

/**
 * ADP-08 - Seguimiento de regreso (BR-ADP-005). Antes de decidir se ve el contador de
 * incumplimientos previos. 1ª a 3ª tardanza = advertencia; la 4ª pasa a "observado". La clasificacion
 * final la hace el servidor; aqui solo se muestra una vista previa con la misma regla.
 */
function ReturnFollowUp() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { can } = useHrPermissions();
  const { state, data, context, reload } = useHrResource<Loaded>(
    tripId
      ? async (token, scope) => {
          const trip = await getFieldTrip(token, tripId);
          const employee = await getEmployee(token, trip.employeeId, scope).catch(() => null);
          return { trip, employee };
        }
      : null,
    tripId ?? '',
  );
  const command = useHrCommand({ context, reload });
  const [actual, setActual] = useState(() => limaNowInputValue());
  const [notes, setNotes] = useState('');
  const [newMemo, setNewMemo] = useState<HrMemo | null>(null);
  const actionRef = useRef<HTMLButtonElement>(null);

  const trip = data?.trip;
  const employee = data?.employee ?? null;
  const open = trip?.status === 'AUTORIZADA';
  const canEvaluate = can('EVALUATE_FIELD_TRIP_RETURN') && open;
  // El resumen del colaborador viene en la propia salida: quien solo evalua retornos no necesita VIEW_EMPLOYEES.
  const summary = employee ?? trip?.employee ?? null;
  const counterKnown = summary !== null;
  const previous = summary?.fieldTripLateCount ?? 0;
  const actualIso = actual ? (limaDateTimeToInstant(actual) ?? '') : '';
  const preview = trip && actualIso ? previewReturn(previous, trip.estimatedReturn, actualIso) : null;

  useEffect(() => {
    if (canEvaluate && counterKnown) actionRef.current?.focus();
  }, [canEvaluate, counterKnown]);

  const counterText = !counterKnown
    ? 'No pudimos obtener el contador de incumplimientos de esta persona, por eso no se puede decidir ahora.'
    : previous === 0
      ? 'Esta persona no tiene tardanzas previas en salidas a campo — hasta la 3ª es advertencia, la 4ª pasa a observado.'
      : summary?.isFieldTripObserved || previous >= 4
        ? `Esta persona tiene ${previous} tardanzas previas y ya está observada — cualquier nueva tardanza se registra con observación.`
        : `Esta persona tiene ${previous} tardanza${previous === 1 ? '' : 's'} previa${previous === 1 ? '' : 's'} en salidas a campo — hasta la 3ª es advertencia, la 4ª pasa a observado.`;

  const buttonLabel = !preview
    ? 'Cerrar'
    : !preview.isLate
      ? 'Cerrar'
      : preview.willBeObserved
        ? `Registrar tardanza (${ordinal(preview.lateNumber)}) y marcar como observado`
        : `Registrar esta tardanza como advertencia (${ordinal(preview.lateNumber)})`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!tripId || !actualIso || !counterKnown) return;
    const res = await command.run((token) => evaluateFieldTripReturn(token, tripId, actualIso, notes.trim() || undefined), 'No pudimos registrar el regreso. Intenta de nuevo.');
    if (res.ok) {
      const t = res.value;
      command.setNotice(
        t.status === 'OBSERVADA'
          ? `Regreso registrado con ${t.lateMinutes} min de retraso. La persona queda observada.`
          : t.lateMinutes > 0
            ? `Regreso registrado con ${t.lateMinutes} min de retraso: queda como advertencia.`
            : 'Regreso registrado a tiempo. La salida quedó cerrada.',
      );
      setNotes('');
      setNewMemo(t.memo ?? null);
      await reload();
    }
  }

  return (
    <HrFrame
      pageTitle={trip ? `Seguimiento de regreso — ${trip.employeeName ?? 'colaborador'}` : 'Seguimiento de regreso'}
      back={{ label: 'Volver a las salidas a campo', to: '/personal/campo' }}
      context={context}
      state={state}
      hasData={!!trip}
      subject="la salida"
      busy={command.saving}
    >
      {trip && (
        <>
          <div aria-live="polite">
            {command.notice && (
              <p className={styles.notice} role="status">
                {command.notice}
              </p>
            )}
          </div>
          {command.error && (
            <p className={styles.errorBanner} role="alert">
              {command.error}
            </p>
          )}

          <section className={styles.card} aria-labelledby="regreso-datos">
            <h2 id="regreso-datos" className={styles.sectionTitle}>
              {trip.destination}
            </h2>
            <dl className={styles.dataGrid}>
              <div>
                <dt>Hora prevista de regreso</dt>
                <dd>{formatDateTime(trip.estimatedReturn)}</dd>
              </div>
              <div>
                <dt>Hora real de regreso</dt>
                <dd>{trip.actualReturn ? formatDateTime(trip.actualReturn) : 'Todavía no registrada'}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{FIELD_TRIP_STATUS_LABEL[trip.status]}</dd>
              </div>
              {trip.lateMinutes > 0 && (
                <div>
                  <dt>Retraso</dt>
                  <dd>{trip.lateMinutes} min</dd>
                </div>
              )}
            </dl>
          </section>

          {open && (
            <p className={styles.hint} role="status">
              Esperando el regreso de {trip.employeeName ?? 'la persona'}.
            </p>
          )}
          {!open && pendingStatus(trip) && (
            <p className={styles.warning} role="status">
              Esta salida todavía no fue autorizada.{' '}
              <Link to={`/personal/campo/${trip.id}/autorizacion`} state={context ?? undefined}>
                Ver la autorización
              </Link>
            </p>
          )}
          {trip.status === 'NO_AUTORIZADA' && <p className={styles.warning}>Esta salida no fue autorizada: no hay regreso que registrar.</p>}

          {newMemo && (
            <section className={styles.bannerError} role="status" aria-labelledby="regreso-memo">
              <h2 id="regreso-memo" className={styles.sectionTitle}>
                Memo de advertencia generado
              </h2>
              <p>{newMemo.reason}</p>
              <p className={styles.hint}>Lo generó el sistema automáticamente por reincidencia y quedó en la ficha de la persona.</p>
            </section>
          )}

          {employee && employee.recentMemos && employee.recentMemos.length > 0 && (
            <section className={styles.card} aria-labelledby="regreso-memos">
              <h2 id="regreso-memos" className={styles.sectionTitle}>
                Memos de la persona
              </h2>
              <ul className={styles.plainList}>
                {employee.recentMemos.map((memo) => (
                  <li key={memo.id} className={styles.listItem}>
                    <span className={styles.entryMeta}>{formatDate(memo.issuedOn)}</span>
                    <span className={styles.entryText}>{memo.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.card} aria-labelledby="regreso-contador">
            <h2 id="regreso-contador" className={styles.sectionTitle}>
              Incumplimientos previos
            </h2>
            <p className={counterKnown ? styles.warning : styles.errorBanner} data-testid="contador-incumplimientos">
              {counterText}
            </p>
          </section>

          {canEvaluate && (
            <form className={styles.card} onSubmit={(e) => void submit(e)} aria-labelledby="regreso-form">
              <h2 id="regreso-form" className={styles.sectionTitle}>
                Registrar el regreso
              </h2>
              <label className={styles.fieldLabel} htmlFor="regreso-hora">
                Hora real de regreso
              </label>
              <input id="regreso-hora" type="datetime-local" className={styles.input} value={actual} onChange={(e) => setActual(e.target.value)} required />
              {preview?.isLate && (
                <p className={styles.hint} role="status">
                  Llegó {preview.lateMinutes} min tarde: sería la {ordinal(preview.lateNumber)} tardanza —{' '}
                  {preview.willBeObserved ? 'la persona pasa a observado.' : 'se registra como advertencia.'}
                </p>
              )}
              {preview && !preview.isLate && <p className={styles.hint}>Llegó a la hora prevista o antes: la salida se cierra sin advertencia.</p>}
              <label className={styles.fieldLabel} htmlFor="regreso-notas">
                Observaciones (opcional)
              </label>
              <textarea id="regreso-notas" className={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className={styles.rowActions}>
                <button ref={actionRef} type="submit" className={preview?.isLate ? styles.accentButton : styles.primaryButton} disabled={command.saving || !counterKnown || !actual}>
                  {command.saving ? 'Guardando…' : buttonLabel}
                </button>
              </div>
            </form>
          )}

          <div className={styles.rowActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => navigate(`/personal/${trip.employeeId}`, { state: context ?? undefined })}>
              Ir a la ficha de la persona
            </button>
          </div>
        </>
      )}
    </HrFrame>
  );
}

function pendingStatus(trip: FieldTrip): boolean {
  return trip.status === 'PENDIENTE_NIVEL_1' || trip.status === 'PENDIENTE_NIVEL_2' || trip.status === 'PENDIENTE_NIVEL_3';
}

export function ReturnFollowUpScreen() {
  const { can } = useHrPermissions();
  if (!can('EVALUATE_FIELD_TRIP_RETURN') && !can('REQUEST_FIELD_TRIP') && !can('AUTHORIZE_FIELD_TRIP')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Personal" />
        <div className={styles.content}>
          <p className={styles.statusText} role="alert">
            No tienes acceso al seguimiento de regreso.
          </p>
        </div>
      </main>
    );
  }
  return <ReturnFollowUp />;
}
