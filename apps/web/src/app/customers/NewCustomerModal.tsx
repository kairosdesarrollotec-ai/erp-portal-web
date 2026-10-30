import { useEffect, useState } from 'react';
import { X, UserCheck } from 'lucide-react';
import type { Customer } from './customers-client';
import type { CustomerFormData } from './useCustomersList';
import { validateDocumentNumber, validatePhone, validatePersonName } from '../shared/identity-validation';
import styles from './NewCustomerModal.module.css';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  mode?: 'create' | 'edit';
  initialData?: CustomerFormData;
  duplicateCustomer?: Customer | null;
  onViewExistingCustomer?: (customerId: string) => void;
  onClearDuplicate?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'DNI', label: 'DNI (Doc. Nacional de Identidad)' },
  { value: 'RUC', label: 'RUC (Registro Único de Contribuyentes)' },
  { value: 'CE', label: 'Carné de Extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

export function NewCustomerModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
  error,
  mode = 'create',
  initialData,
  duplicateCustomer,
  onViewExistingCustomer,
  onClearDuplicate,
}: NewCustomerModalProps) {
  const [fullName, setFullName] = useState(initialData?.fullName ?? '');
  const [documentType, setDocumentType] = useState(initialData?.documentType ?? 'DNI');
  const [documentNumber, setDocumentNumber] = useState(initialData?.documentNumber ?? '');
  const [nationality, setNationality] = useState<'PERUANO' | 'EXTRANJERO'>(
    initialData?.nationality ?? 'PERUANO',
  );
  const [countryEntryDate, setCountryEntryDate] = useState(initialData?.countryEntryDate ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [phone, setPhone] = useState(initialData?.phone ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setFullName(initialData?.fullName ?? '');
    setDocumentType(initialData?.documentType ?? 'DNI');
    setDocumentNumber(initialData?.documentNumber ?? '');
    setNationality(initialData?.nationality ?? 'PERUANO');
    setCountryEntryDate(initialData?.countryEntryDate ?? '');
    setEmail(initialData?.email ?? '');
    setPhone(initialData?.phone ?? '');
    setAddress(initialData?.address ?? '');
    setValidationError(null);
    onClearDuplicate?.();
    /* eslint-enable react-hooks/set-state-in-effect */
  // onClearDuplicate is intentionally excluded: it changes on every render and the effect only needs to fire on open/initialData change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Panel de coincidencia de documento (SC-CLI-002 / PROTO-CLI-01-COINCIDENCIA-DNI)
  if (duplicateCustomer) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div
          className={styles.modal}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="coincidencia-title"
        >
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>

          <div className={styles.coincidenciaHeader}>
            <UserCheck size={22} className={styles.coincidenciaIcon} aria-hidden="true" />
            <h2 id="coincidencia-title" className={styles.title}>
              Cliente ya registrado
            </h2>
          </div>
          <p className={styles.description}>
            Ya existe un cliente con el mismo tipo y número de documento en esta empresa.
          </p>

          <div className={styles.coincidenciaCard} role="region" aria-label="Datos del cliente existente">
            <p className={styles.coincidenciaName}>{duplicateCustomer.fullName}</p>
            <p className={styles.coincidenciaMeta}>
              {duplicateCustomer.documentType} {duplicateCustomer.documentNumber}
            </p>
            {duplicateCustomer.phone && (
              <p className={styles.coincidenciaMeta}>{duplicateCustomer.phone}</p>
            )}
            {duplicateCustomer.email && (
              <p className={styles.coincidenciaMeta}>{duplicateCustomer.email}</p>
            )}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
            >
              Cancelar
            </button>
            {onViewExistingCustomer && (
              <button
                type="button"
                className={styles.submitButton}
                onClick={() => onViewExistingCustomer(duplicateCustomer.id)}
              >
                Ver ficha del cliente
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!fullName.trim()) {
      setValidationError('El nombre completo o razón social es obligatorio.');
      return;
    }
    const nameError = validatePersonName(fullName);
    if (nameError) {
      setValidationError(nameError);
      return;
    }
    const documentError = validateDocumentNumber(documentType, documentNumber);
    if (documentError) {
      setValidationError(documentError);
      return;
    }
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setValidationError(phoneError);
      return;
    }

    const success = await onSubmit({
      fullName: fullName.trim(),
      documentType,
      documentNumber: documentNumber.trim(),
      nationality,
      countryEntryDate: nationality === 'EXTRANJERO' && countryEntryDate ? countryEntryDate : undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
    });

    if (success) {
      if (mode === 'create') {
        setFullName('');
        setDocumentType('DNI');
        setDocumentNumber('');
        setNationality('PERUANO');
        setCountryEntryDate('');
        setEmail('');
        setPhone('');
        setAddress('');
      }
      onClose();
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-customer-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        <h2 id="new-customer-title" className={styles.title}>
          {mode === 'edit' ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>
        <p className={styles.description}>
          {mode === 'edit'
            ? 'Actualiza los datos del cliente registrado.'
            : 'Registra los datos del cliente para asociarlo a cotizaciones, consultas y reservas.'}
        </p>

        {(validationError || error) && (
          <p className={styles.errorText} role="alert">
            {validationError || error}
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.gridTwo}>
            <label className={styles.field}>
              <span>Tipo de documento *</span>
              <select
                className={styles.select}
                value={documentType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setDocumentType(newType);
                  if (newType === 'PASAPORTE' || newType === 'CE') {
                    setNationality('EXTRANJERO');
                  } else if (newType === 'DNI') {
                    setNationality('PERUANO');
                  }
                }}
              >
                {DOCUMENT_TYPES.map((doc) => (
                  <option key={doc.value} value={doc.value}>
                    {doc.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Número de documento *</span>
              <input
                type="text"
                className={styles.input}
                placeholder="Ej. 12345678"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                required
              />
            </label>
          </div>

          <label className={styles.field}>
            <span>Nombre completo / Razón social *</span>
            <input
              type="text"
              className={styles.input}
              placeholder="Ej. Juan Pérez o Inversiones SAC"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>

          <div className={styles.gridTwo}>
            <label className={styles.field}>
              <span>Nacionalidad</span>
              <select
                className={styles.select}
                value={nationality}
                onChange={(e) => setNationality(e.target.value as 'PERUANO' | 'EXTRANJERO')}
              >
                <option value="PERUANO">Peruano</option>
                <option value="EXTRANJERO">Extranjero</option>
              </select>
            </label>

            {nationality === 'EXTRANJERO' ? (
              <label className={styles.field}>
                <span>Fecha ingreso al país</span>
                <input
                  type="date"
                  className={styles.input}
                  value={countryEntryDate}
                  onChange={(e) => setCountryEntryDate(e.target.value)}
                />
              </label>
            ) : (
              <label className={styles.field}>
                <span>Teléfono</span>
                <input
                  type="tel"
                  className={styles.input}
                  placeholder="Ej. 999 888 777"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            )}
          </div>

          {nationality === 'EXTRANJERO' && (
            <div className={styles.gridTwo}>
              <label className={styles.field}>
                <span>Teléfono</span>
                <input
                  type="tel"
                  className={styles.input}
                  placeholder="Ej. 999 888 777"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Correo electrónico</span>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="cliente@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>
          )}

          {nationality !== 'EXTRANJERO' && (
            <label className={styles.field}>
              <span>Correo electrónico</span>
              <input
                type="email"
                className={styles.input}
                placeholder="cliente@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}

          <label className={styles.field}>
            <span>Dirección de contacto</span>
            <input
              type="text"
              className={styles.input}
              placeholder="Ej. Av. El Sol 123, Cusco"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading
                ? 'Guardando…'
                : mode === 'edit'
                  ? 'Guardar cambios'
                  : 'Registrar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
