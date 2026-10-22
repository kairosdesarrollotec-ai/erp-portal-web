import { Check, Clock, X, CalendarCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AttendanceRecord } from './hr-client';
import { ATTENDANCE_STATUS_LABEL, daysInMonth, formatSoles, monthLabel, type AttendanceStatus, limaToday } from './hr-domain';
import { AttendanceMarkInfo } from './AttendanceMarkInfo';
import styles from './HrFlow.module.css';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Icono + texto: el color nunca es la unica senal. */
function StatusMark({ status }: { status: AttendanceStatus }) {
  const label = ATTENDANCE_STATUS_LABEL[status];
  const icon: ReactNode =
    status === 'PRESENTE' ? <Check size={14} aria-hidden="true" /> :
    status === 'TARDANZA' ? <Clock size={14} aria-hidden="true" /> :
    status === 'PERMISO' ? <CalendarCheck size={14} aria-hidden="true" /> :
    <X size={14} aria-hidden="true" />;
  return (
    <span className={styles.cellStatus}>
      {icon}
      {label}
    </span>
  );
}

const CELL_CLASS: Record<AttendanceStatus, string> = {
  PRESENTE: styles.cellPresent,
  TARDANZA: styles.cellLate,
  FALTA_JUSTIFICADA: styles.cellAbsent,
  FALTA_INJUSTIFICADA: styles.cellAbsent,
  PERMISO: styles.cellPermit,
};

interface Props {
  month: string;
  records: readonly AttendanceRecord[];
  canRegister: boolean;
  onRegister: (date: string) => void;
  onOpenAbsence: (date: string) => void;
}

/** Calendario mensual de una persona (ADP-02): una celda por dia con icono y texto del resultado. */
export function AttendanceCalendar({ month, records, canRegister, onRegister, onOpenAbsence }: Props) {
  const [y, m] = month.split('-').map(Number);
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lunes = 0
  const total = daysInMonth(month);
  const today = limaToday();
  const byDate = new Map(records.map((r) => [r.date.slice(0, 10), r]));

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <table className={styles.calendarTable} aria-label={`Asistencia de ${monthLabel(month)}`}>
      <thead>
        <tr>
          {WEEKDAYS.map((d) => (
            <th key={d} scope="col" className={styles.calHead}>
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, wi) => (
          <tr key={wi}>
            {week.map((day, di) => {
              if (day === null) return <td key={di} className={styles.cellBlank} />;
              const date = `${month}-${String(day).padStart(2, '0')}`;
              const rec = byDate.get(date);
              const isAbsence = rec?.status === 'FALTA_INJUSTIFICADA' || rec?.status === 'FALTA_JUSTIFICADA';
              return (
                <td key={di} className={`${styles.cell} ${rec ? CELL_CLASS[rec.status] : ''}`} data-date={date}>
                  <span className={styles.cellDay}>{day}</span>
                  {rec && <StatusMark status={rec.status} />}
                  {rec && !isAbsence && rec.evidenceMissing && <span title="Sin foto de evidencia">Sin evidencia</span>}
                  {rec && <AttendanceMarkInfo record={rec} />}
                  {rec && rec.deductionAmount > 0 && <span>{formatSoles(rec.deductionAmount)}</span>}
                  {isAbsence && (
                    <button type="button" className={styles.smallButton} aria-label={`Ver falta del ${day}`} onClick={() => onOpenAbsence(date)}>
                      Ver falta
                    </button>
                  )}
                  {!rec && canRegister && date <= today && (
                    <button type="button" className={styles.smallButton} aria-label={`Registrar marcación del ${day}`} onClick={() => onRegister(date)}>
                      Registrar
                    </button>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
