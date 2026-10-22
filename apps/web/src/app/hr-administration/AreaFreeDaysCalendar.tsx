import { useState } from 'react';
import { daysInMonth, limaToday, monthKey, monthLabel, rangeHasOccupied, shiftMonth } from './hr-domain';
import styles from './HrFlow.module.css';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  /** Dias ocupados del area (solo fechas, nunca quien las ocupa). */
  occupied: ReadonlySet<string>;
  startDate: string;
  endDate: string;
  /** Se invoca con el rango elegido (1.er clic = inicio, 2.o clic = fin). */
  onChange: (range: { startDate: string; endDate: string }) => void;
}

/**
 * Calendario de DIAS LIBRES del area para elegir otra fecha de vacaciones cuando hay conflicto (BR-ADP-002, sin lista de
 * espera). Los dias ocupados se marcan con TEXTO («Ocupado») ademas del color y no se pueden elegir; tampoco los pasados.
 */
export function AreaFreeDaysCalendar({ occupied, startDate, endDate, onChange }: Props) {
  const today = limaToday();
  const [month, setMonth] = useState(() => (startDate ? startDate.slice(0, 7) : monthKey(new Date(`${today}T12:00:00`))));
  const [note, setNote] = useState<string | null>(null);
  const [y, m] = month.split('-').map(Number);
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const total = daysInMonth(month);
  const picking = startDate !== '' && (endDate === '' || endDate === startDate);

  function pick(date: string) {
    setNote(null);
    if (!picking || date < startDate) {
      onChange({ startDate: date, endDate: date });
      return;
    }
    if (rangeHasOccupied({ startDate, endDate: date }, occupied)) {
      setNote('Ese rango incluye días ocupados del área. Elige otro final o empieza en otro día.');
      onChange({ startDate: date, endDate: date });
      return;
    }
    onChange({ startDate, endDate: date });
  }

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  return (
    <div className={styles.freeCal} role="group" aria-label="Días libres del área">
      <div className={styles.freeCalHeader}>
        <button type="button" className={styles.smallButton} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">
          ‹
        </button>
        <span className={styles.freeCalTitle}>{monthLabel(month)}</span>
        <button type="button" className={styles.smallButton} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente">
          ›
        </button>
      </div>
      <div className={styles.freeCalGrid}>
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.freeCalHead}>
            {d}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`b${index}`} />;
          const date = `${month}-${pad(day)}`;
          const busy = occupied.has(date);
          const past = date < today;
          const selected = date === startDate || date === endDate;
          const inRange = startDate !== '' && endDate !== '' && date > startDate && date < endDate;
          const state = busy ? 'ocupado' : past ? 'pasado' : selected ? 'elegido' : 'libre';
          return (
            <button
              key={date}
              type="button"
              disabled={busy || past}
              aria-pressed={selected}
              aria-label={`${day} de ${monthLabel(month)}: ${state}`}
              className={`${styles.freeCalDay} ${busy ? styles.freeCalBusy : ''} ${past ? styles.freeCalPast : ''} ${selected ? styles.freeCalSelected : ''} ${inRange ? styles.freeCalInRange : ''}`}
              onClick={() => pick(date)}
            >
              <span>{day}</span>
              {busy && <span className={styles.freeCalTag}>Ocupado</span>}
            </button>
          );
        })}
      </div>
      <p className={styles.freeCalLegend}>
        Elige el primer día y luego el último. Los días «Ocupado» ya tienen a otra persona del área de vacaciones.
      </p>
      {note && (
        <p className={styles.hint} role="status">
          {note}
        </p>
      )}
    </div>
  );
}
