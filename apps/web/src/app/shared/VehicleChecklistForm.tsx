import { FIV_ITEMS, FCKE_ITEMS, type ChecklistItemStatus } from './vehicle-checklist-items';
import styles from './VehicleChecklistForm.module.css';

export interface VehicleChecklistValues {
  [key: string]: unknown;
}

interface VehicleChecklistFormProps {
  values: VehicleChecklistValues;
  onChange: (key: string, value: string | number | boolean) => void;
  disabled?: boolean;
}

export function VehicleChecklistForm({ values, onChange, disabled = false }: VehicleChecklistFormProps) {
  const fuelLines = typeof values['rnc_nivel_combustible_lineas'] === 'number' ? Number(values['rnc_nivel_combustible_lineas']) : 8;
  const odometer = typeof values['rnc_kilometraje'] === 'number' ? Number(values['rnc_kilometraje']) : '';

  function setStatus(key: string, status: ChecklistItemStatus) {
    if (disabled) return;
    onChange(key, status);
  }

  return (
    <div className={styles.container}>
      {/* RNC - Registro de Nivel de Combustible (Formato 06) */}
      <fieldset className={styles.section}>
        <legend className={styles.legend}>Registro de Combustible y Kilometraje (RNC - Formato 06)</legend>
        <p className={styles.hint}>
          Registra el nivel de combustible en líneas enteras y el kilometraje exacto del odómetro (Formato 06 RNC).
        </p>
        <div className={styles.rncGrid}>
          <div className={styles.field}>
            <label htmlFor="rnc-fuel-lines" className={styles.label}>
              Nivel de combustible (Líneas): <strong>{fuelLines} líneas</strong>
            </label>
            <div className={styles.fuelInputGroup}>
              <input
                id="rnc-fuel-lines"
                type="number"
                min="0"
                max="32"
                step="1"
                value={fuelLines}
                disabled={disabled}
                placeholder="Número de líneas"
                className={styles.textInput}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChange('rnc_nivel_combustible_lineas', isNaN(val) ? 0 : Math.max(0, val));
                }}
              />
              <div className={styles.fuelQuickBtns} role="group" aria-label="Nivel rápido de combustible">
                <button
                  type="button"
                  disabled={disabled}
                  className={fuelLines === 0 ? `${styles.fuelBtn} ${styles.fuelBtnActive}` : styles.fuelBtn}
                  onClick={() => onChange('rnc_nivel_combustible_lineas', 0)}
                >
                  Vacío (0)
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  className={fuelLines === 4 ? `${styles.fuelBtn} ${styles.fuelBtnActive}` : styles.fuelBtn}
                  onClick={() => onChange('rnc_nivel_combustible_lineas', 4)}
                >
                  1/4 (4)
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  className={fuelLines === 8 ? `${styles.fuelBtn} ${styles.fuelBtnActive}` : styles.fuelBtn}
                  onClick={() => onChange('rnc_nivel_combustible_lineas', 8)}
                >
                  1/2 (8)
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  className={fuelLines === 12 ? `${styles.fuelBtn} ${styles.fuelBtnActive}` : styles.fuelBtn}
                  onClick={() => onChange('rnc_nivel_combustible_lineas', 12)}
                >
                  3/4 (12)
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  className={fuelLines === 16 ? `${styles.fuelBtn} ${styles.fuelBtnActive}` : styles.fuelBtn}
                  onClick={() => onChange('rnc_nivel_combustible_lineas', 16)}
                >
                  Lleno (16)
                </button>
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="rnc-odometer" className={styles.label}>
              Kilometraje actual (km)
            </label>
            <input
              id="rnc-odometer"
              type="number"
              min="0"
              value={odometer}
              disabled={disabled}
              placeholder="Ej. 45210"
              className={styles.textInput}
              onChange={(e) => onChange('rnc_kilometraje', Number(e.target.value))}
            />
          </div>

          <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="rnc-sugerencia" className={styles.label}>
              Sugerencia / Observación de combustible (RNC)
            </label>
            <input
              id="rnc-sugerencia"
              type="text"
              value={typeof values['rnc_sugerencia'] === 'string' ? (values['rnc_sugerencia'] as string) : ''}
              disabled={disabled}
              placeholder="Ej. Tanque lleno confirmado en grifo autorizado"
              className={styles.textInput}
              onChange={(e) => onChange('rnc_sugerencia', e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {/* FCKE - Control de Kit de Emergencia (Formato 08 - BR-INS-005) */}
      <fieldset className={styles.section}>
        <legend className={styles.legend}>Control de Kit de Emergencia (FCKE - Formato 08: presencia, estado y vigencia)</legend>
        <p className={styles.hint}>
          Verifica la presencia, estado físico y fechas de vigencia (extintor y botiquín) de cada implemento.
        </p>
        <div className={styles.itemList}>
          {FCKE_ITEMS.map((item) => {
            const currentStatus = (values[item.key] as ChecklistItemStatus) || 'B';
            return (
              <div key={item.key} className={styles.itemRow}>
                <span className={styles.itemLabel}>{item.label}</span>
                <div className={styles.btnGroup} role="radiogroup" aria-label={item.label}>
                  <button
                    type="button"
                    disabled={disabled}
                    className={currentStatus === 'B' ? styles.btnBActive : styles.btn}
                    onClick={() => setStatus(item.key, 'B')}
                    title="Buen Estado"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    className={currentStatus === 'M' ? styles.btnMActive : styles.btn}
                    onClick={() => setStatus(item.key, 'M')}
                    title="Mal Estado"
                  >
                    M
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    className={currentStatus === 'NA' ? styles.btnNaActive : styles.btn}
                    onClick={() => setStatus(item.key, 'NA')}
                    title="No Aplica"
                  >
                    N/A
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* FIV - Formato de Inspección Vehicular (Formato 02) */}
      <fieldset className={styles.section}>
        <legend className={styles.legend}>Inspección Vehicular Completa (FIV - Formato 02)</legend>
        <p className={styles.hint}>
          Evalúa cada sistema del vehículo (B: Buen Estado, M: Mal Estado, N/A: No Aplica).
        </p>
        <div className={styles.itemList}>
          {FIV_ITEMS.map((item) => {
            const currentStatus = (values[item.key] as ChecklistItemStatus) || 'B';
            return (
              <div key={item.key} className={styles.itemRow}>
                <div className={styles.itemMeta}>
                  <span className={styles.itemCategory}>{item.category}</span>
                  <span className={styles.itemLabel}>{item.label}</span>
                </div>
                <div className={styles.btnGroup} role="radiogroup" aria-label={item.label}>
                  <button
                    type="button"
                    disabled={disabled}
                    className={currentStatus === 'B' ? styles.btnBActive : styles.btn}
                    onClick={() => setStatus(item.key, 'B')}
                    title="Buen Estado"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    className={currentStatus === 'M' ? styles.btnMActive : styles.btn}
                    onClick={() => setStatus(item.key, 'M')}
                    title="Mal Estado"
                  >
                    M
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    className={currentStatus === 'NA' ? styles.btnNaActive : styles.btn}
                    onClick={() => setStatus(item.key, 'NA')}
                    title="No Aplica"
                  >
                    N/A
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
