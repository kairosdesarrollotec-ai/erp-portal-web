import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { HrFrame } from './HrFrame';
import { TerminationConfirmDialog } from './TerminationConfirmDialog';
import { getEmployee, terminateEmployment, type EmployeeDetail, type TerminationResult } from './hr-client';
import { TERMINATION_REASON_LABEL, formatSoles, noticeDaysBetween, type TerminationReason } from './hr-domain';
import { formatDate } from './hr-format';
import { useHrPermissions } from './hr-permissions';
import { useHrCommand, useUnsavedWarning } from './useHrCommand';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';

const REASONS: readonly TerminationReason[] = ['RENUNCIA', 'DESPIDO'];

/**
 * ADP-09 - Renuncia / despido (BR-ADP-006). Son DOS formularios distintos segun el tipo:
 * renuncia (fecha de aviso, ultimo dia trabajado) y despido (motivo, sanciones previas, aviso de 15 dias).
 * Confirmar es irreversible (modal reforzado) y genera una vacante en Reclutamiento.
 */
function Termination() {
  const { id } = useParams();
  const { state, data: employee, context, reload } = useHrResource<EmployeeDetail>(id ? (token) => getEmployee(token, id) : null, id ?? '');
  const command = useHrCommand({ context, reload });

  const [reason, setReason] = useState<TerminationReason | ''>('');
  // Renuncia
  const [noticeDate, setNoticeDate] = useState('');
  const [lastDay, setLastDay] = useState('');
  // Despido
  const [dismissalReason, setDismissalReason] = useState('');
  const [withNotice, setWithNotice] = useState(false);
  // Comunes
  const [settlementPaid, setSettlementPaid] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<TerminationResult | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (employee && employee.status !== 'TERMINADO') firstRef.current?.focus();
  }, [employee]);
  useUnsavedWarning(!result && (dismissalReason.trim().length > 0 || lastDay.length > 0));

  const amount = settlementAmount.trim() === '' ? 0 : Number(settlementAmount);
  const amountInvalid = Number.isNaN(amount) || amount < 0;
  const noticeDays = reason === 'RENUNCIA' ? noticeDaysBetween(noticeDate, lastDay) : reason === 'DESPIDO' && withNotice ? 15 : 0;

  const missing =
    reason === ''
      ? 'type'
      : reason === 'RENUNCIA' && !lastDay
        ? 'lastDay'
        : reason === 'DESPIDO' && dismissalReason.trim().length < 5
          ? 'dismissal'
          : reason === 'RENUNCIA' && !settlementPaid
            ? 'settlement'
            : amountInvalid
            ? 'amount'
            : null;

  function review(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (missing) return;
    command.clearError();
    setConfirming(true);
  }

  async function confirm() {
    if (!id || reason === '') return;
    const notes =
      reason === 'RENUNCIA'
        ? [noticeDate ? `Fecha de aviso: ${formatDate(noticeDate)}.` : 'Sin previo aviso.', `Último día trabajado: ${formatDate(lastDay)}.`].join(' ')
        : `Motivo del despido: ${dismissalReason.trim()}`;
    const res = await command.run(
      (token) => terminateEmployment(token, id, { reason, noticeDays, finalSettlementPaid: settlementPaid, settlementAmount: amount, notes }),
      'No pudimos registrar el término. Intenta de nuevo.',
    );
    if (res.ok) {
      setConfirming(false);
      setResult(res.value);
    } else if (res.stale) {
      setConfirming(false);
    }
  }

  const terminated = employee?.status === 'TERMINADO';

  return (
    <HrFrame
      pageTitle={employee ? `Registrar término — ${employee.fullName}` : 'Registrar término'}
      back={{ label: 'Volver a la ficha', to: `/personal/${id}` }}
      context={context}
      state={state}
      hasData={!!employee}
      subject="la ficha"
      busy={command.saving}
    >
      {employee && result && (
        <section className={styles.card} aria-labelledby="termino-resultado">
          <h2 id="termino-resultado" className={styles.sectionTitle}>
            Término registrado
          </h2>
          <p className={styles.notice} role="status">
            Se registró la {TERMINATION_REASON_LABEL[result.reason].toLowerCase()} de {employee.fullName} el {formatDate(result.terminatedAt)}.
          </p>
          <p className={styles.entryText}>
            Reclutamiento recibirá el aviso y creará la necesidad de cubrir este puesto con una nueva vacante; puede tardar unos instantes en aparecer.
          </p>
          <div className={styles.rowActions}>
            <Link className={styles.secondaryButton} to={`/personal/${employee.id}`} state={context ?? undefined}>
              Volver a la ficha
            </Link>
          </div>
        </section>
      )}

      {employee && !result && terminated && (
        <p className={styles.warning} role="status">
          La relación laboral de {employee.fullName} ya terminó
          {employee.terminatedAt ? ` el ${formatDate(employee.terminatedAt)}` : ''}. No se puede registrar de nuevo.
        </p>
      )}

      {employee && !result && !terminated && (
        <form className={styles.card} onSubmit={review} noValidate aria-labelledby="termino-form">
          <h2 id="termino-form" className={styles.sectionTitle}>
            Tipo de término
          </h2>
          <fieldset className={styles.fieldset}>
            <legend className={styles.srOnly}>Tipo</legend>
            <div className={styles.chips}>
              {REASONS.map((value, index) => (
                <label key={value} className={styles.chip}>
                  <input
                    ref={index === 0 ? firstRef : undefined}
                    type="radio"
                    name="termino-tipo"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                  />
                  {TERMINATION_REASON_LABEL[value]}
                </label>
              ))}
            </div>
            {submitted && reason === '' && (
              <p className={styles.fieldError} role="alert">
                Elige si es una renuncia o un despido.
              </p>
            )}
          </fieldset>

          {reason === 'RENUNCIA' && (
            <div data-testid="form-renuncia">
              <label className={styles.fieldLabel} htmlFor="renuncia-aviso">
                Fecha de aviso (déjala vacía si fue sin previo aviso)
              </label>
              <input id="renuncia-aviso" type="date" className={styles.input} value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} />
              <label className={styles.fieldLabel} htmlFor="renuncia-ultimo">
                Último día trabajado
              </label>
              <input id="renuncia-ultimo" type="date" className={styles.input} value={lastDay} onChange={(e) => setLastDay(e.target.value)} aria-invalid={submitted && !lastDay} required />
              {submitted && !lastDay && (
                <p className={styles.fieldError} role="alert">
                  Indica el último día trabajado.
                </p>
              )}
              <p className={styles.hint}>
                {noticeDays > 0 ? `Aviso: ${noticeDays} días.` : 'Sin previo aviso: la relación laboral termina de inmediato y se paga la quincena pendiente.'}
              </p>
            </div>
          )}

          {reason === 'DESPIDO' && (
            <div data-testid="form-despido">
              <label className={styles.fieldLabel} htmlFor="despido-motivo">
                Motivo del despido
              </label>
              <textarea id="despido-motivo" className={styles.input} value={dismissalReason} onChange={(e) => setDismissalReason(e.target.value)} aria-invalid={submitted && dismissalReason.trim().length < 5} required />
              {submitted && dismissalReason.trim().length < 5 && (
                <p className={styles.fieldError} role="alert">
                  Indica el motivo del despido (al menos 5 letras).
                </p>
              )}
              <h3 className={styles.subTitle}>Sanciones previas registradas</h3>
              <ul className={styles.plainList}>
                <li className={styles.listItem}>Tardanzas en salidas a campo: {employee.fieldTripLateCount}{employee.isFieldTripObserved ? ' (persona observada)' : ''}</li>
                <li className={styles.listItem}>Tardanzas de asistencia: {employee.attendanceSummary?.totalLate ?? 0}</li>
                <li className={styles.listItem}>Faltas injustificadas: {employee.attendanceSummary?.totalUnjustifiedAbsences ?? 0}</li>
              </ul>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={withNotice} onChange={(e) => setWithNotice(e.target.checked)} />
                Con aviso de 15 días (por reincidencia)
              </label>
            </div>
          )}

          {reason !== '' && (
            <div>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={settlementPaid} onChange={(e) => setSettlementPaid(e.target.checked)} />
                Se pagó la quincena pendiente{reason === 'RENUNCIA' ? ' (obligatorio en una renuncia)' : ''}
              </label>
              {submitted && missing === 'settlement' && (
                <p className={styles.fieldError} role="alert">
                  Para registrar una renuncia debe estar pagada la quincena pendiente.
                </p>
              )}
              <label className={styles.fieldLabel} htmlFor="termino-monto">
                Pago pendiente (S/, opcional)
              </label>
              <input id="termino-monto" type="number" min="0" step="0.01" inputMode="decimal" className={styles.input} value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value)} aria-invalid={amountInvalid} />
              {amountInvalid && (
                <p className={styles.fieldError} role="alert">
                  El monto debe ser un número mayor o igual a cero.
                </p>
              )}
              {amount > 0 && <p className={styles.hint}>Pago pendiente: {formatSoles(amount)}</p>}
            </div>
          )}

          <div className={styles.rowActions}>
            <button type="submit" className={styles.terminateButton} disabled={command.saving}>
              Confirmar término
            </button>
          </div>
        </form>
      )}

      {confirming && employee && reason !== '' && (
        <TerminationConfirmDialog
          employeeName={employee.fullName}
          reason={reason}
          noticeDays={noticeDays}
          settlementPaid={settlementPaid}
          settlementAmount={amount}
          busy={command.saving}
          error={command.error}
          onConfirm={() => void confirm()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </HrFrame>
  );
}

export function TerminationScreen() {
  const { can } = useHrPermissions();
  if (!can('TERMINATE_EMPLOYMENT')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Personal" />
        <div className={styles.content}>
          <p className={styles.statusText} role="alert">
            No tienes permiso para registrar el término de una relación laboral.
          </p>
        </div>
      </main>
    );
  }
  return <Termination />;
}
