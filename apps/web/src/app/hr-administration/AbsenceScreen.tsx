import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { DeductionConfirmDialog } from './DeductionConfirmDialog';
import { HrFrame } from './HrFrame';
import {
  applyMonthDeductions,
  getAttendanceSummary,
  getEmployee,
  getEmployeeAttendance,
  logAttendance,
  type AttendanceRecord,
  type AttendanceSummary,
  type EmployeeDetail,
} from './hr-client';
import {
  ATTENDANCE_STATUS_LABEL,
  absenceNumberInMonth,
  formatSoles,
  isMonthClosing,
  monthEndLabel,
  monthLabel,
  ordinal,
} from './hr-domain';
import { formatDate } from './hr-format';
import { useHrPermissions } from './hr-permissions';
import { useHrCommand, useUnsavedWarning } from './useHrCommand';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Loaded {
  employee: EmployeeDetail;
  records: AttendanceRecord[];
  summaryItem: AttendanceSummary['items'][number] | null;
}

type Classification = 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA';

/**
 * ADP-03 - Falta, advertencia y descuento (BR-ADP-001). Se justifica o se deja injustificada; el
 * monto del descuento NO se ingresa: lo calcula el sistema y aqui se muestra de solo lectura.
 * El descuento se aplica al cerrar el mes (no en la quincena donde ocurrio la falta), con
 * confirmacion del monto exacto.
 */
export function AbsenceScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const dateParam = params.get('fecha');
  const date = dateParam && DATE_RE.test(dateParam) ? dateParam : null;
  const month = date ? date.slice(0, 7) : '';
  const { can } = useHrPermissions();

  const { state, data, context, reload } = useHrResource<Loaded>(
    id && date
      ? async (token, scope) => {
          const [employee, records, summary] = await Promise.all([
            getEmployee(token, id),
            getEmployeeAttendance(token, id, month),
            getAttendanceSummary(token, scope.companyId, month).catch(() => null),
          ]);
          return { employee, records, summaryItem: summary?.items.find((i) => i.employeeId === id) ?? null };
        }
      : null,
    `${id}:${date}`,
  );
  const command = useHrCommand({ context, reload });

  const [classification, setClassification] = useState<Classification | ''>('');
  const [justification, setJustification] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const record = data?.records.find((r) => r.date.slice(0, 10) === date) ?? null;
  const showForm = !!data && !record && can('LOG_ATTENDANCE') && data.employee.status !== 'TERMINADO';

  useEffect(() => {
    if (showForm) textRef.current?.focus();
  }, [showForm]);
  useUnsavedWarning(showForm && justification.trim().length > 0);

  if (!date) {
    return (
      <HrFrame pageTitle="Falta" back={{ label: 'Volver a Personal', to: '/personal' }} context={context} state="NOT_FOUND" hasData={false} subject="la falta">
        {null}
      </HrFrame>
    );
  }

  const employee = data?.employee;
  const records = data?.records ?? [];
  const absenceNumber = absenceNumberInMonth(records, date);
  const needsText = classification === 'FALTA_JUSTIFICADA';
  const textInvalid = submitted && needsText && !justification.trim();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!id || !date || !classification || (needsText && !justification.trim())) return;
    const res = await command.run(
      (token) => logAttendance(token, id, { date, status: classification, notes: justification.trim() || undefined }),
      'No pudimos registrar la falta. Intenta de nuevo.',
    );
    if (res.ok) {
      command.setNotice(
        classification === 'FALTA_JUSTIFICADA' ? 'Falta justificada registrada.' : 'Falta injustificada registrada. El descuento se aplicará a fin de mes.',
      );
      setJustification('');
      setSubmitted(false);
      await reload();
    }
  }

  async function applyDeduction() {
    if (!id) return;
    const res = await command.run((token, scope) => applyMonthDeductions(token, scope.companyId, month, [id]), 'No pudimos aplicar el descuento. Intenta de nuevo.');
    if (res.ok) {
      setConfirming(false);
      command.setNotice(`Descuento de ${formatSoles(res.value.totalDeductionsApplied)} aplicado.`);
      await reload();
    } else if (res.stale) setConfirming(false);
  }

  const item = data?.summaryItem ?? null;
  const closing = isMonthClosing(month);
  const canApply = can('MANAGE_EMPLOYEES') && !!item && item.calculatedDeduction > 0 && !item.isApplied && closing;

  return (
    <HrFrame
      pageTitle={employee ? `Falta — ${employee.fullName}, ${formatDate(date)}` : 'Falta'}
      back={{ label: 'Volver a la asistencia', to: `/personal/${id}/asistencia?mes=${month}` }}
      context={context}
      state={state}
      hasData={!!data}
      subject="la falta"
      busy={command.saving}
    >
      {data && employee && (
        <>
          <div aria-live="polite">
            {command.notice && (
              <p className={styles.notice} role="status">
                {command.notice}
              </p>
            )}
          </div>
          {command.error && !confirming && (
            <p className={styles.errorBanner} role="alert">
              {command.error}
            </p>
          )}

          <section className={styles.card} aria-labelledby="falta-historial">
            <h2 id="falta-historial" className={styles.sectionTitle}>
              Historial de faltas y tardanzas de {monthLabel(month)}
            </h2>
            {records.filter((r) => r.status !== 'PRESENTE' && r.status !== 'PERMISO').length === 0 ? (
              <p className={styles.hint}>No hay faltas ni tardanzas registradas este mes.</p>
            ) : (
              <ul className={styles.plainList}>
                {records
                  .filter((r) => r.status !== 'PRESENTE' && r.status !== 'PERMISO')
                  .map((r) => (
                    <li key={r.id} className={styles.listItem}>
                      {formatDate(r.date)} · {ATTENDANCE_STATUS_LABEL[r.status]}
                      {r.notes ? ` · ${r.notes}` : ''}
                      {r.deductionAmount > 0 ? ` · descuento ${formatSoles(r.deductionAmount)}` : ''}
                    </li>
                  ))}
              </ul>
            )}
          </section>

          {record && (
            <section className={styles.card} aria-labelledby="falta-registro">
              <h2 id="falta-registro" className={styles.sectionTitle}>
                Registro del {formatDate(date)}
              </h2>
              <p className={styles.entryText}>Resultado: {ATTENDANCE_STATUS_LABEL[record.status]}</p>
              {record.notes && <p className={styles.entryText}>Justificación: {record.notes}</p>}
              {record.deductionAmount > 0 && (
                <p className={styles.entryText}>
                  {record.isDeductionApplied
                    ? `Se descontó ${formatSoles(record.deductionAmount)} en el pago de fin de mes.`
                    : `Se descuenta ${formatSoles(record.deductionAmount)} de la quincena, aplicado en el pago de fin de mes.`}
                </p>
              )}
              {record.status === 'FALTA_INJUSTIFICADA' && (
                <p className={styles.hint}>Esta falta ya quedó registrada como injustificada. Por ahora su clasificación no se puede cambiar desde el sistema.</p>
              )}
            </section>
          )}

          {showForm && (
            <form className={styles.card} onSubmit={(e) => void submit(e)} noValidate aria-labelledby="falta-form">
              <h2 id="falta-form" className={styles.sectionTitle}>
                Registrar la falta del {formatDate(date)}
              </h2>
              {absenceNumber >= 2 && (
                <p className={styles.banner} role="status">
                  <AlertTriangle size={16} aria-hidden="true" /> Esta es la {ordinal(absenceNumber)} falta del mes — corresponde un memo de advertencia.
                </p>
              )}
              <label className={styles.fieldLabel} htmlFor="falta-justificacion">
                Justificación{needsText ? ' (obligatoria)' : ' (opcional si no se justifica)'}
              </label>
              <textarea
                id="falta-justificacion"
                ref={textRef}
                className={styles.input}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                aria-invalid={textInvalid}
                aria-describedby={textInvalid ? 'falta-justificacion-error' : undefined}
                disabled={command.saving}
              />
              {textInvalid && (
                <p id="falta-justificacion-error" className={styles.fieldError} role="alert">
                  Escribe la justificación para registrar la falta como justificada.
                </p>
              )}
              <fieldset className={styles.fieldset}>
                <legend>¿Se justifica la falta?</legend>
                <label className={styles.radioRow}>
                  <input type="radio" name="falta-clasificacion" checked={classification === 'FALTA_JUSTIFICADA'} onChange={() => setClassification('FALTA_JUSTIFICADA')} />
                  Justificada (sin descuento)
                </label>
                <label className={styles.radioRow}>
                  <input type="radio" name="falta-clasificacion" checked={classification === 'FALTA_INJUSTIFICADA'} onChange={() => setClassification('FALTA_INJUSTIFICADA')} />
                  Injustificada (con descuento)
                </label>
                {submitted && !classification && (
                  <p className={styles.fieldError} role="alert">
                    Elige si la falta se justifica o no.
                  </p>
                )}
              </fieldset>
              <p className={styles.hint} data-testid="descuento-solo-lectura">
                {classification === 'FALTA_INJUSTIFICADA'
                  ? 'El monto del descuento lo calcula el sistema al registrar la falta y se aplica en el pago de fin de mes. No se ingresa manualmente.'
                  : 'Una falta injustificada genera un descuento calculado por el sistema, aplicado en el pago de fin de mes. No se ingresa manualmente.'}
              </p>
              <div className={styles.rowActions}>
                <button type="submit" className={styles.primaryButton} disabled={command.saving}>
                  {command.saving ? 'Guardando…' : 'Confirmar'}
                </button>
              </div>
            </form>
          )}

          {!record && !can('LOG_ATTENDANCE') && <p className={styles.hint}>Esta falta todavía no está registrada. No tienes permiso para registrarla.</p>}

          {can('MANAGE_EMPLOYEES') && (
            <section className={styles.card} aria-labelledby="falta-descuento">
              <h2 id="falta-descuento" className={styles.sectionTitle}>
                Descuento de fin de mes
              </h2>
              {item ? (
                <p className={styles.entryText}>
                  {item.isApplied
                    ? `El descuento de ${monthLabel(month)} (${formatSoles(item.calculatedDeduction)}) ya fue aplicado.`
                    : `Se descuenta ${formatSoles(item.calculatedDeduction)} en el pago de fin de mes (${item.totalLates} tardanza(s) y ${item.totalUnjustified} falta(s) injustificada(s)).`}
                </p>
              ) : (
                <p className={styles.hint}>No se pudo calcular el descuento del mes.</p>
              )}
              {!closing && <p className={styles.hint}>El descuento se aplica al cerrar el mes: podrás hacerlo desde el {monthEndLabel(month)}.</p>}
              <div className={styles.rowActions}>
                <button type="button" className={styles.accentButton} disabled={!canApply || command.saving} onClick={() => { command.clearError(); setConfirming(true); }}>
                  Aplicar descuento
                </button>
              </div>
            </section>
          )}

          <div className={styles.rowActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => navigate(`/personal/${id}/asistencia?mes=${month}`, { state: context ?? undefined })}>
              Volver a la asistencia
            </button>
          </div>
        </>
      )}

      {confirming && item && employee && (
        <DeductionConfirmDialog
          who={employee.fullName}
          monthText={monthLabel(month)}
          amount={item.calculatedDeduction}
          detail={`${item.totalLates} tardanza(s) y ${item.totalUnjustified} falta(s) injustificada(s) del mes.`}
          busy={command.saving}
          error={command.error}
          onConfirm={() => void applyDeduction()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </HrFrame>
  );
}
