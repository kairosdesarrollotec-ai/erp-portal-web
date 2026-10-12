import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../shared/AppHeader';
import { HrFrame } from './HrFrame';
import { createEmployee, listEmployees } from './hr-client';
import { areaIdFromName, toIsoDate } from './hr-domain';
import { useHrPermissions } from './hr-permissions';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import styles from './HrFlow.module.css';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Alta de una persona en Personal (ADP-01 -> ficha). Registro propio de Empleado: no se fusiona con Candidato ni
 * Cliente. Si llega `?candidateId=` (persona contratada en Reclutamiento) el alta queda enlazada a ese candidato como
 * referencia; el servidor rechaza un candidato que ya fue registrado como personal.
 */
function NewEmployee() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const candidateParam = params.get('candidateId');
  const candidateId = candidateParam && UUID_PATTERN.test(candidateParam) ? candidateParam : null;
  const { state, data, context, reload } = useHrResource<Record<string, string>>(async (token, scope) => {
    const { items } = await listEmployees(token, scope, { limit: 200 });
    return Object.fromEntries(items.map((e) => [e.areaId, e.areaName]));
  }, 'nuevo-colaborador');
  const command = useHrCommand({ context, reload });
  const nameRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [areaName, setAreaName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [hireDate, setHireDate] = useState(toIsoDate(new Date()));
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (state === 'READY') nameRef.current?.focus();
  }, [state]);

  const areas = data ?? {};
  const matchedAreaId = Object.entries(areas).find(([, name]) => name.toLowerCase() === areaName.trim().toLowerCase())?.[0];
  const areaId = matchedAreaId ?? areaIdFromName(areaName);
  const salary = baseSalary.trim() === '' ? null : Number(baseSalary);
  const invalid = {
    fullName: !fullName.trim(),
    documentNumber: !documentNumber.trim(),
    areaName: !areaId,
    jobTitle: !jobTitle.trim(),
    hireDate: !hireDate,
    baseSalary: salary !== null && (!Number.isFinite(salary) || salary < 0),
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!context || Object.values(invalid).some(Boolean)) return;
    const res = await command.run(
      (token, scope) =>
        createEmployee(token, {
          ...scope,
          fullName: fullName.trim(),
          documentType: documentType.trim() || 'DNI',
          documentNumber: documentNumber.trim(),
          areaId,
          areaName: areaName.trim(),
          jobTitle: jobTitle.trim(),
          hireDate,
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(salary !== null ? { baseSalary: salary } : {}),
          ...(candidateId ? { candidateId } : {}),
        }),
      'No pudimos registrar a la persona. Intenta de nuevo.',
    );
    if (res.ok) navigate(`/personal/${res.value.id}`, { state: context });
  }

  return (
    <HrFrame pageTitle="Nueva persona" back={{ label: 'Volver a Personal', to: '/personal' }} context={context} state={state} hasData={state === 'READY'} subject="el formulario" busy={command.saving}>
      <form onSubmit={(e) => void submit(e)} noValidate className={styles.form} aria-label="Alta de personal">
        {candidateId && <p className={styles.hint}>Esta alta queda enlazada a la persona contratada en Reclutamiento. Su ficha de personal es un registro aparte.</p>}
        {command.error && (
          <p className={styles.errorBanner} role="alert">
            {command.error}
          </p>
        )}

        <label className={styles.fieldLabel} htmlFor="emp-nombre">
          Nombre completo
        </label>
        <input id="emp-nombre" ref={nameRef} className={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={submitted && invalid.fullName} required />
        {submitted && invalid.fullName && (
          <p className={styles.fieldError} role="alert">
            Indica el nombre completo.
          </p>
        )}

        <label className={styles.fieldLabel} htmlFor="emp-tipo-doc">
          Tipo de documento
        </label>
        <input id="emp-tipo-doc" className={styles.input} value={documentType} onChange={(e) => setDocumentType(e.target.value)} />

        <label className={styles.fieldLabel} htmlFor="emp-documento">
          Número de documento
        </label>
        <input id="emp-documento" className={styles.input} inputMode="numeric" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} aria-invalid={submitted && invalid.documentNumber} required />
        {submitted && invalid.documentNumber && (
          <p className={styles.fieldError} role="alert">
            Indica el número de documento.
          </p>
        )}

        <label className={styles.fieldLabel} htmlFor="emp-area">
          Área
        </label>
        <input id="emp-area" className={styles.input} list="emp-areas" value={areaName} onChange={(e) => setAreaName(e.target.value)} aria-invalid={submitted && invalid.areaName} required />
        <datalist id="emp-areas">
          {Object.entries(areas).map(([id, name]) => (
            <option key={id} value={name} />
          ))}
        </datalist>
        {submitted && invalid.areaName && (
          <p className={styles.fieldError} role="alert">
            Indica el área.
          </p>
        )}

        <label className={styles.fieldLabel} htmlFor="emp-cargo">
          Cargo
        </label>
        <input id="emp-cargo" className={styles.input} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} aria-invalid={submitted && invalid.jobTitle} required />
        {submitted && invalid.jobTitle && (
          <p className={styles.fieldError} role="alert">
            Indica el cargo.
          </p>
        )}

        <label className={styles.fieldLabel} htmlFor="emp-ingreso">
          Fecha de ingreso
        </label>
        <input id="emp-ingreso" type="date" className={styles.input} value={hireDate} onChange={(e) => setHireDate(e.target.value)} aria-invalid={submitted && invalid.hireDate} required />

        <label className={styles.fieldLabel} htmlFor="emp-correo">
          Correo (opcional)
        </label>
        <input id="emp-correo" type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className={styles.hint}>Si es el mismo correo con el que la persona ingresa al sistema, su usuario queda vinculado a esta ficha.</p>

        <label className={styles.fieldLabel} htmlFor="emp-telefono">
          Teléfono (opcional)
        </label>
        <input id="emp-telefono" type="tel" className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label className={styles.fieldLabel} htmlFor="emp-sueldo">
          Sueldo base (opcional)
        </label>
        <input id="emp-sueldo" inputMode="decimal" className={styles.input} value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} aria-invalid={submitted && invalid.baseSalary} />
        {submitted && invalid.baseSalary && (
          <p className={styles.fieldError} role="alert">
            El sueldo debe ser un número mayor o igual a 0.
          </p>
        )}

        <div className={styles.stickyActions}>
          <button type="submit" className={styles.primaryButton} disabled={command.saving}>
            {command.saving ? 'Guardando…' : 'Registrar persona'}
          </button>
        </div>
      </form>
    </HrFrame>
  );
}

export function NewEmployeeScreen() {
  const { can } = useHrPermissions();
  if (!can('MANAGE_EMPLOYEES')) {
    return (
      <main className={styles.wrapper}>
        <AppHeader pageTitle="Personal" />
        <div className={styles.content}>
          <p className={styles.statusText} role="alert">
            No tienes permiso para registrar personal.
          </p>
        </div>
      </main>
    );
  }
  return <NewEmployee />;
}
