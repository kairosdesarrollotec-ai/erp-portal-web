import { useState, type FormEvent } from 'react';
import { HrDialog } from './HrDialog';
import { getFirebaseAuth } from '../providers/firebase';
import { updateEmployee, type EmployeeDetail, type UpdateEmployeeInput, type UpdateEmployeeResult } from './hr-client';
import { OTHER_AREA } from './hr-domain';
import { useHrPermissions } from './hr-permissions';
import { useHrAreaCatalog } from './useHrAreaCatalog';
import { describeHrError, hrErrorCode, isVersionConflict } from './hr-errors';
import styles from './HrDialog.module.css';

interface Props {
  employee: EmployeeDetail;
  /** Refresca la ficha desde el servidor (tras un 412). Debe actualizar `employee`. */
  onReload: () => Promise<void>;
  onSaved: (result: UpdateEmployeeResult) => void;
  onCancel: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initialValues(e: EmployeeDetail) {
  return {
    fullName: e.fullName,
    email: e.email ?? '',
    phone: e.phone ?? '',
    jobTitle: e.jobTitle,
    areaName: e.areaName,
    baseSalary: e.baseSalary === null || e.baseSalary === undefined ? '' : String(e.baseSalary),
  };
}

/**
 * ADP-01 (ficha) - edicion de datos de contacto y laborales (nombre, correo, telefono, cargo, sueldo base). Contrato
 * hr-administration 0.6.0: PATCH con `If-Match` (version leida); 412 = otra persona edito la ficha; 409
 * EMPLOYEE_ACCOUNT_ALREADY_LINKED = la cuenta del correo nuevo ya pertenece a otra ficha (no se aplica nada). Cambiar el correo
 * de una ficha vinculada la re-vincula a la cuenta del correo nuevo (DEC-ADP-RELINK-001): se avisa ANTES de guardar.
 * Area (H-02): se elige del catalogo de la empresa (`areaCode`); «Otra (texto libre)» se mantiene por compatibilidad y el
 * servidor la guarda como area del catalogo si coincide con una (sin mayusculas ni tildes). Sede, estado y periodo de prueba no
 * se editan aqui (el termino tiene su propia pantalla, ADP-09).
 */
export function EditEmployeeDialog({ employee, onReload, onSaved, onCancel }: Props) {
  const [values, setValues] = useState(() => initialValues(employee));
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [reloadError, setReloadError] = useState(false);
  const [reloadedNotice, setReloadedNotice] = useState(false);
  const baseVersion = employee.version;
  const catalog = useHrAreaCatalog(employee.companyId, employee.branchId);
  // Respuestas de negocio #19: el sueldo base solo lo cambia Gerencia (HR_ADMINISTRATION.MANAGE_SALARY).
  const canEditSalary = useHrPermissions().can('MANAGE_SALARY');
  const catalogCodes = new Set(catalog.areas.map((a) => a.code));
  const currentAreaCode = employee.areaCode || employee.areaId;
  const initialAreaChoice = catalogCodes.has(currentAreaCode) ? currentAreaCode : OTHER_AREA;
  // Eleccion explicita de la persona; mientras no elija, se muestra el area actual de la ficha.
  const [areaChoiceState, setAreaChoice] = useState<string | null>(null);
  const areaChoice = areaChoiceState ?? initialAreaChoice;

  // Tras recargar (version nueva) el formulario vuelve a los datos actuales del servidor (ajuste de estado durante el render).
  const [seenVersion, setSeenVersion] = useState(baseVersion);
  if (seenVersion !== baseVersion) {
    setSeenVersion(baseVersion);
    setValues(initialValues(employee));
    setAreaChoice(null);
    setSubmitted(false);
    setError(null);
    setReloadedNotice(conflict);
    setConflict(false);
  }

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const salary = values.baseSalary.trim() === '' ? null : Number(values.baseSalary);
  const invalid = {
    fullName: !values.fullName.trim(),
    email: values.email.trim() !== '' && !EMAIL_PATTERN.test(values.email.trim()),
    jobTitle: !values.jobTitle.trim(),
    areaName: catalog.state === 'READY' && areaChoice === OTHER_AREA && !values.areaName.trim(),
    baseSalary: canEditSalary && salary !== null && (!Number.isFinite(salary) || salary < 0),
  };

  const initial = initialValues(employee);
  const payload: UpdateEmployeeInput = {};
  if (values.fullName.trim() !== initial.fullName) payload.fullName = values.fullName.trim();
  if (values.email.trim().toLowerCase() !== initial.email.trim().toLowerCase()) payload.email = values.email.trim() === '' ? null : values.email.trim();
  if (values.phone.trim() !== initial.phone) payload.phone = values.phone.trim() === '' ? null : values.phone.trim();
  if (values.jobTitle.trim() !== initial.jobTitle) payload.jobTitle = values.jobTitle.trim();
  if (canEditSalary && values.baseSalary.trim() !== initial.baseSalary) payload.baseSalary = salary;
  // H-02: el area solo se envia si el catalogo cargo y la persona la cambio (una carga fallida no toca el area).
  if (catalog.state === 'READY' && catalog.areas.length > 0) {
    if (areaChoice !== OTHER_AREA) {
      if (areaChoice !== currentAreaCode) payload.areaCode = areaChoice;
    } else if (values.areaName.trim() !== employee.areaName || catalogCodes.has(currentAreaCode)) {
      payload.areaName = values.areaName.trim();
    }
  } else if (catalog.state === 'READY' && values.areaName.trim() !== employee.areaName && values.areaName.trim() !== '') {
    payload.areaName = values.areaName.trim();
  }
  const changed = Object.keys(payload).length > 0;
  const emailWillChange = payload.email !== undefined;
  const linked = employee.accountLinked;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setReloadedNotice(false);
    if (Object.values(invalid).some(Boolean) || !changed) return;
    setBusy(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible');
      const idToken = await user.getIdToken();
      const result = await updateEmployee(idToken, employee.id, payload, baseVersion);
      onSaved(result);
    } catch (err) {
      if (isVersionConflict(err)) {
        setConflict(true);
        setError(null);
      } else if (hrErrorCode(err) === 'EMPLOYEE_ACCOUNT_ALREADY_LINKED') {
        setError('Esa cuenta ya está vinculada a otra ficha de personal. No se aplicó ningún cambio: la ficha conserva su correo y su cuenta actuales.');
      } else {
        setError(describeHrError(err, 'No pudimos guardar los cambios. Intenta de nuevo.'));
      }
      setBusy(false);
    }
  }

  async function reload() {
    setReloadError(false);
    setBusy(true);
    try {
      await onReload();
    } catch {
      setReloadError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <HrDialog
      titleId="edit-employee-title"
      title={`Editar ficha — ${employee.fullName}`}
      description="Actualiza los datos de contacto y laborales. El documento y la relación laboral no se editan aquí."
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      {conflict && (
        <div className={styles.error} role="alert" data-testid="version-conflict">
          <p>Otra persona modificó esta ficha mientras la editabas. No se guardó ningún cambio.</p>
          <button type="button" className={styles.secondaryButton} onClick={() => void reload()} disabled={busy}>
            Recargar ficha
          </button>
          {reloadError && <p>No pudimos recargar la ficha. Intenta de nuevo.</p>}
        </div>
      )}
      {reloadedNotice && (
        <p className={styles.description} role="status">
          Cargamos la versión actual de la ficha. Revisa los datos y vuelve a aplicar tus cambios.
        </p>
      )}
      <form onSubmit={(e) => void submit(e)} noValidate aria-label="Editar ficha de personal">
        <div className={styles.field}>
          <label htmlFor="edit-nombre">Nombre completo</label>
          <input id="edit-nombre" className={styles.inputLine} value={values.fullName} onChange={set('fullName')} aria-invalid={submitted && invalid.fullName} required />
          {submitted && invalid.fullName && (
            <span className={styles.error} role="alert">
              Indica el nombre completo.
            </span>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="edit-correo">Correo</label>
          <input id="edit-correo" type="email" className={styles.inputLine} value={values.email} onChange={set('email')} aria-invalid={submitted && invalid.email} aria-describedby="edit-correo-hint" />
          {submitted && invalid.email && (
            <span className={styles.error} role="alert">
              Indica un correo válido.
            </span>
          )}
          <span id="edit-correo-hint" className={styles.description}>
            {linked
              ? 'La ficha está vinculada a una cuenta de acceso por este correo.'
              : 'Si es el correo con el que la persona ingresa al sistema, la ficha se vincula a su cuenta.'}
          </span>
        </div>
        {linked && emailWillChange && (
          <p className={styles.description} role="status" data-testid="relink-warning">
            Al guardar, la ficha se re-vinculará a la cuenta del correo nuevo
            {payload.email ? '' : ' (sin correo, la ficha quedará sin vincular)'}. Si no existe una cuenta con ese correo, quedará sin vincular
            hasta que exista. El cambio queda registrado en auditoría.
          </p>
        )}
        <div className={styles.field}>
          <label htmlFor="edit-telefono">Teléfono</label>
          <input id="edit-telefono" type="tel" className={styles.inputLine} value={values.phone} onChange={set('phone')} />
        </div>
        <div className={styles.field}>
          <label htmlFor="edit-cargo">Cargo</label>
          <input id="edit-cargo" className={styles.inputLine} value={values.jobTitle} onChange={set('jobTitle')} aria-invalid={submitted && invalid.jobTitle} required />
          {submitted && invalid.jobTitle && (
            <span className={styles.error} role="alert">
              Indica el cargo.
            </span>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="edit-area">Área</label>
          {catalog.state === 'READY' && catalog.areas.length > 0 ? (
            <>
              <select
                id="edit-area"
                className={styles.inputLine}
                value={areaChoice}
                onChange={(e) => {
                  setAreaChoice(e.target.value);
                  if (e.target.value === OTHER_AREA && catalogCodes.has(currentAreaCode)) setValues((v) => ({ ...v, areaName: '' }));
                }}
                aria-describedby="edit-area-hint"
              >
                {catalog.areas.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
                <option value={OTHER_AREA}>Otra (texto libre)</option>
              </select>
              {areaChoice === OTHER_AREA && (
                <>
                  <label htmlFor="edit-area-otra">Nombre del área (texto libre)</label>
                  <input id="edit-area-otra" className={styles.inputLine} value={values.areaName} onChange={set('areaName')} aria-invalid={submitted && invalid.areaName} />
                  {submitted && invalid.areaName && (
                    <span className={styles.error} role="alert">
                      Indica el nombre del área.
                    </span>
                  )}
                </>
              )}
              <span id="edit-area-hint" className={styles.description}>
                El área define el cupo de vacaciones: solo 1 persona del área puede estar de vacaciones a la vez.
              </span>
            </>
          ) : catalog.state === 'READY' ? (
            <input id="edit-area" className={styles.inputLine} value={values.areaName} onChange={set('areaName')} />
          ) : (
            <>
              <input id="edit-area" className={styles.inputLine} value={employee.areaName} readOnly aria-describedby="edit-area-hint" />
              <span id="edit-area-hint" className={styles.description}>
                {catalog.state === 'LOADING' ? 'Cargando las áreas…' : 'No pudimos cargar el catálogo de áreas; el área no se modifica en esta edición.'}
              </span>
            </>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="edit-sueldo">Sueldo base</label>
          <input
            id="edit-sueldo"
            inputMode="decimal"
            className={styles.inputLine}
            value={values.baseSalary}
            onChange={set('baseSalary')}
            disabled={!canEditSalary}
            aria-invalid={submitted && invalid.baseSalary}
            aria-describedby={canEditSalary ? undefined : 'edit-sueldo-hint'}
          />
          {!canEditSalary && (
            <span id="edit-sueldo-hint" className={styles.description}>
              El sueldo base solo lo modifica Gerencia.
            </span>
          )}
          {submitted && invalid.baseSalary && (
            <span className={styles.error} role="alert">
              El sueldo debe ser un número mayor o igual a 0.
            </span>
          )}
        </div>
        {submitted && !changed && (
          <p className={styles.description} role="status">
            No hay cambios para guardar.
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert" data-testid="edit-error">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className={styles.primaryButton} disabled={busy || conflict}>
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </HrDialog>
  );
}
