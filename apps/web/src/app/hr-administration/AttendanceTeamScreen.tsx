import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { DeductionConfirmDialog } from './DeductionConfirmDialog';
import { HrFrame } from './HrFrame';
import { applyMonthDeductions, getAttendanceSummary, type AttendanceSummary } from './hr-client';
import { formatSoles, isMonthClosing, monthEndLabel, monthKey, monthLabel, shiftMonth } from './hr-domain';
import { useHrPermissions } from './hr-permissions';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * ADP-02 (resumen del equipo) - Tardanzas, faltas y descuento calculado por persona en el mes.
 * "Aplicar descuentos de fin de mes" (MANAGE_EMPLOYEES) solo desde el ultimo dia del mes (BR-ADP-001)
 * y con confirmacion del monto exacto.
 */
function AttendanceTeam() {
  const [params, setParams] = useSearchParams();
  const { can } = useHrPermissions();
  const requested = params.get('mes');
  const month = requested && MONTH_RE.test(requested) ? requested : monthKey(new Date());
  const [confirming, setConfirming] = useState(false);

  const { state, data, context, reload } = useHrResource<AttendanceSummary>(
    (token, scope) => getAttendanceSummary(token, scope.companyId, month),
    month,
  );
  const command = useHrCommand({ context, reload });

  const pending = (data?.items ?? []).filter((i) => !i.isApplied && i.calculatedDeduction > 0);
  const pendingTotal = pending.reduce((sum, i) => sum + i.calculatedDeduction, 0);
  const closing = isMonthClosing(month);

  async function apply() {
    const res = await command.run(
      (token, scope) =>
        applyMonthDeductions(token, scope.companyId, month, pending.map((p) => p.employeeId)),
      'No pudimos aplicar los descuentos. Intenta de nuevo.',
    );
    if (res.ok) {
      setConfirming(false);
      command.setNotice(`Descuentos aplicados: ${formatSoles(res.value.totalDeductionsApplied)} a ${res.value.affectedEmployeesCount} persona(s).`);
      await reload();
    } else if (res.stale) {
      setConfirming(false);
    }
  }

  return (
    <HrFrame
      pageTitle="Asistencia del mes"
      back={{ label: 'Volver a Personal', to: '/personal' }}
      context={context}
      state={state}
      hasData={!!data}
      subject="el resumen de asistencia"
      busy={command.saving}
      wide
    >
      {data && (
        <>
          <div aria-live="polite">
            {command.notice && (
              <p className={styles.notice} role="status">
                {command.notice}
              </p>
            )}
          </div>
          <div className={styles.toolbar}>
            <div className={styles.monthNav}>
              <button type="button" className={styles.secondaryButton} aria-label="Mes anterior" onClick={() => setParams({ mes: shiftMonth(month, -1) }, { replace: true, state: context ?? undefined })}>
                ←
              </button>
              <h2 className={styles.monthTitle}>{monthLabel(month)}</h2>
              <button type="button" className={styles.secondaryButton} aria-label="Mes siguiente" onClick={() => setParams({ mes: shiftMonth(month, 1) }, { replace: true, state: context ?? undefined })}>
                →
              </button>
            </div>
            {can('MANAGE_EMPLOYEES') && (
              <button type="button" className={styles.accentButton} disabled={!closing || pending.length === 0} onClick={() => { command.clearError(); setConfirming(true); }}>
                Aplicar descuentos de fin de mes
              </button>
            )}
          </div>
          {can('MANAGE_EMPLOYEES') && !closing && (
            <p className={styles.hint}>Los descuentos se aplican al cerrar el mes: podrás hacerlo desde el {monthEndLabel(month)}.</p>
          )}
          <p className={styles.hint}>Descuento total calculado del mes: {formatSoles(data.totalDeductionsAmount)}</p>

          {data.items.length === 0 ? (
            <p className={styles.statusText}>No hay asistencias registradas en este mes.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table} aria-label="Resumen de asistencia por persona">
                <thead>
                  <tr>
                    <th scope="col">Persona</th>
                    <th scope="col">Área</th>
                    <th scope="col">Tardanzas</th>
                    <th scope="col">Faltas injustificadas</th>
                    <th scope="col">Descuento</th>
                    <th scope="col">Estado</th>
                    <th scope="col">
                      <span className={styles.srOnly}>Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.employeeId} className={styles.row}>
                      <td data-label="Persona">{item.employeeName}</td>
                      <td data-label="Área">{item.areaName}</td>
                      <td data-label="Tardanzas">{item.totalLates}</td>
                      <td data-label="Faltas injustificadas">{item.totalUnjustified}</td>
                      <td data-label="Descuento">{formatSoles(item.calculatedDeduction)}</td>
                      <td data-label="Estado">{item.isApplied ? 'Aplicado' : item.calculatedDeduction > 0 ? 'Pendiente de fin de mes' : 'Sin descuento'}</td>
                      <td>
                        <Link className={styles.smallButton} to={`/personal/${item.employeeId}/asistencia?mes=${month}`} state={context ?? undefined} aria-label={`Ver asistencia de ${item.employeeName}`}>
                          Ver asistencia
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {confirming && (
        <DeductionConfirmDialog
          who={`${pending.length} persona(s)`}
          monthText={monthLabel(month)}
          amount={pendingTotal}
          busy={command.saving}
          error={command.error}
          onConfirm={() => void apply()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </HrFrame>
  );
}

export function AttendanceTeamScreen() {
  const { can } = useHrPermissions();
  if (!can('VIEW_EMPLOYEES')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Personal" />
        <div className={styles.content}>
          <p className={styles.statusText} role="alert">
            No tienes acceso a la asistencia del personal.
          </p>
        </div>
      </main>
    );
  }
  return <AttendanceTeam />;
}
