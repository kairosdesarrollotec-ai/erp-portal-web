import { useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { RegisterCandidateInput } from './recruitment-client';
import styles from './RecruitmentDialog.module.css';

interface Props {
  busy: boolean;
  error: string | null;
  onSubmit: (input: RegisterCandidateInput) => void;
  onCancel: () => void;
}

/** REC-03 "Crear candidato". El CV se referencia por el codigo de un documento ya cargado. */
export function NewCandidateDialog({ busy, error, onSubmit, onCancel }: Props) {
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState('DNI');
  const [documentNumber, setDocumentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [cvDocumentId, setCvDocumentId] = useState('');
  const [touched, setTouched] = useState(false);

  const salaryNumber = salary.trim() === '' ? undefined : Number(salary);
  const salaryInvalid = salaryNumber !== undefined && (!Number.isFinite(salaryNumber) || salaryNumber < 0);
  const missing = !fullName.trim() || !documentNumber.trim() || !cvDocumentId.trim() || salaryInvalid;

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (missing || busy) return;
    onSubmit({
      fullName: fullName.trim(),
      documentType,
      documentNumber: documentNumber.trim(),
      cvDocumentId: cvDocumentId.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(salaryNumber !== undefined ? { salaryExpectation: salaryNumber } : {}),
    });
  }

  const req = (value: string) => touched && !value.trim();

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.card} aria-labelledby="new-candidate-title" aria-describedby={undefined}>
          <Dialog.Title id="new-candidate-title" className={styles.title}>Crear candidato</Dialog.Title>
          <form onSubmit={submit} noValidate>
            <div className={styles.field}>
              <label htmlFor="nc-name">Nombre completo</label>
              <input id="nc-name" className={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)}
                aria-required="true" aria-invalid={req(fullName)} />
              {req(fullName) && <span className={styles.error}>Indica el nombre completo.</span>}
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="nc-doctype">Tipo de documento</label>
                <select id="nc-doctype" className={styles.input} value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  <option value="DNI">DNI</option>
                  <option value="CE">Carné de extranjería</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="nc-docnum">Número de documento</label>
                <input id="nc-docnum" className={styles.input} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)}
                  aria-required="true" aria-invalid={req(documentNumber)} />
                {req(documentNumber) && <span className={styles.error}>Indica el número de documento.</span>}
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="nc-email">Correo (opcional)</label>
              <input id="nc-email" type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="nc-phone">Teléfono (opcional)</label>
              <input id="nc-phone" type="tel" className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="nc-salary">Pretensión salarial (opcional)</label>
              <input id="nc-salary" type="number" min="0" step="any" className={styles.input} value={salary}
                onChange={(e) => setSalary(e.target.value)} aria-invalid={touched && salaryInvalid} />
              {touched && salaryInvalid && <span className={styles.error}>Indica un monto válido.</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="nc-cv">Código del documento del CV</label>
              <input id="nc-cv" className={styles.input} value={cvDocumentId} onChange={(e) => setCvDocumentId(e.target.value)}
                aria-required="true" aria-invalid={req(cvDocumentId)} aria-describedby="nc-cv-hint" />
              <span id="nc-cv-hint" className={styles.hint}>Pega el código del documento cargado.</span>
              {req(cvDocumentId) && <span className={styles.error}>Indica el código del documento del CV.</span>}
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>Cancelar</button>
              <button type="submit" className={styles.primaryButton} disabled={busy}>{busy ? 'Guardando…' : 'Crear candidato'}</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
