import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AttendanceCalendar } from './AttendanceCalendar';
import { HrFrame } from './HrFrame';
import { RegisterAttendanceDialog } from './RegisterAttendanceDialog';
import { getEmployee, getEmployeeAttendance, type AttendanceRecord, type EmployeeDetail } from './hr-client';
import { monthLabel, shiftMonth, limaToday } from './hr-domain';
import { useHrPermissions } from './hr-permissions';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

interface Loaded {
  employee: EmployeeDetail;
  records: AttendanceRecord[];
}

/**
 * ADP-02 - Asistencia de una persona. Calendario del mes con icono y texto por dia (presente,
 * tardanza, falta). "Registrar marcación" manual (registro AS-IS, sin biometria).
 * La asistencia no es biometrica: se corrobora con la foto del grupo de WhatsApp (evidencia opcional).
 */
export function PersonAttendanceScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { can } = useHrPermissions();
  const requested = params.get('mes');
  const month = requested && MONTH_RE.test(requested) ? requested : limaToday().slice(0, 7);
  const [registering, setRegistering] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { state, data, context, reload } = useHrResource<Loaded>(
    id
      ? async (token, scope) => {
          const [employee, records] = await Promise.all([getEmployee(token, id, scope), getEmployeeAttendance(token, id, month)]);
          return { employee, records };
        }
      : null,
    `${id}:${month}`,
  );
  const employee = data?.employee;

  function goMonth(delta: number) {
    setParams({ mes: shiftMonth(month, delta) }, { replace: true, state: context ?? undefined });
  }

  function openAbsence(date: string) {
    navigate(`/personal/${id}/asistencia/falta?fecha=${date}`, { state: context ?? undefined });
  }

  const faltas = (data?.records ?? []).filter((r) => r.status === 'FALTA_INJUSTIFICADA' || r.status === 'FALTA_JUSTIFICADA').length;
  const tardanzas = (data?.records ?? []).filter((r) => r.status === 'TARDANZA').length;

  return (
    <HrFrame
      pageTitle={employee ? `Asistencia — ${employee.fullName}` : 'Asistencia'}
      back={{ label: 'Volver a la ficha', to: `/personal/${id}` }}
      context={context}
      state={state}
      hasData={!!data}
      subject="la asistencia"
      wide
    >
      {data && employee && (
        <>
          <div aria-live="polite">
            {notice && (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            )}
          </div>
          <div className={styles.toolbar}>
            <div className={styles.monthNav}>
              <button type="button" className={styles.secondaryButton} onClick={() => goMonth(-1)} aria-label="Mes anterior">
                ←
              </button>
              <h2 className={styles.monthTitle}>{monthLabel(month)}</h2>
              <button type="button" className={styles.secondaryButton} onClick={() => goMonth(1)} aria-label="Mes siguiente">
                →
              </button>
            </div>
            {can('LOG_ATTENDANCE') && employee.status !== 'TERMINADO' && (
              <button type="button" className={styles.primaryButton} onClick={() => setRegistering('')}>
                Registrar marcación
              </button>
            )}
          </div>
          <p className={styles.hint}>
            {data.records.length === 0
              ? 'Todavía no hay marcaciones registradas este mes.'
              : `${tardanzas} tardanza(s) y ${faltas} falta(s) este mes.`}
          </p>
          <AttendanceCalendar
            month={month}
            records={data.records}
            canRegister={can('LOG_ATTENDANCE') && employee.status !== 'TERMINADO'}
            onRegister={(date) => setRegistering(date)}
            onOpenAbsence={openAbsence}
          />
        </>
      )}

      {registering !== null && employee && (
        <RegisterAttendanceDialog
          employeeId={employee.id}
          employeeName={employee.fullName}
          initialDate={registering || undefined}
          hireDate={employee.hireDate}
          onCancel={() => setRegistering(null)}
          onSaved={() => {
            setRegistering(null);
            // El back exige la foto en PRESENTE/TARDANZA (422 ATTENDANCE_EVIDENCE_REQUIRED) y los permisos no llevan foto: ya no
            // existe el caso «registrada sin evidencia fotográfica» al guardar desde aquí (aviso eliminado por ser código muerto).
            setNotice('Marcación registrada.');
            void reload();
          }}
          onAbsence={(date) => {
            setRegistering(null);
            openAbsence(date);
          }}
        />
      )}
    </HrFrame>
  );
}
