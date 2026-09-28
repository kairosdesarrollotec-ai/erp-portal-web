import { useState, type FormEvent, useEffect } from 'react';
import type { VehicleFormData } from './useFleetList';
import type { VehicleStatus } from './fleet-client';
import styles from './NewVehicleModal.module.css';

interface NewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VehicleFormData) => Promise<boolean>;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

const CATEGORIES = [
  { value: 'SEDAN', label: 'Sedán' },
  { value: 'SUV', label: 'SUV' },
  { value: 'PICKUP', label: 'Pick-up' },
  { value: 'HATCHBACK', label: 'Hatchback' },
  { value: 'VAN', label: 'Van' },
  { value: 'COMPACTO', label: 'Compacto' },
];

const STATUSES: { value: VehicleStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Disponible' },
  { value: 'RENTED', label: 'Alquilado' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'OUT_OF_SERVICE', label: 'Fuera de Servicio' },
];

export function NewVehicleModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
  onClearError,
}: NewVehicleModalProps) {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<string>('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState('SEDAN');
  const [status, setStatus] = useState<VehicleStatus>('AVAILABLE');
  const [dailyRate, setDailyRate] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPlate('');
      setBrand('');
      setModel('');
      setYear('');
      setColor('');
      setCategory('SEDAN');
      setStatus('AVAILABLE');
      setDailyRate('');
      setPhotoUrl('');
      setValidationError(null);
      onClearError();
    }
  }, [isOpen, onClearError]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const cleanPlate = plate.trim().toUpperCase();
    if (!cleanPlate) {
      setValidationError('La placa es obligatoria.');
      return;
    }

    if (!brand.trim()) {
      setValidationError('La marca es obligatoria.');
      return;
    }

    if (!model.trim()) {
      setValidationError('El modelo es obligatorio.');
      return;
    }

    const parsedYear = year ? parseInt(year, 10) : undefined;
    if (parsedYear !== undefined && (isNaN(parsedYear) || parsedYear < 1990 || parsedYear > 2035)) {
      setValidationError('Ingrese un año válido entre 1990 y 2035.');
      return;
    }

    const parsedRate = dailyRate ? parseFloat(dailyRate) : undefined;
    if (parsedRate !== undefined && (isNaN(parsedRate) || parsedRate <= 0)) {
      setValidationError('La tarifa diaria debe ser un monto mayor a 0.');
      return;
    }

    const success = await onSubmit({
      plate: cleanPlate,
      brand: brand.trim(),
      model: model.trim(),
      year: parsedYear,
      color: color.trim() || undefined,
      category,
      status,
      dailyRate: parsedRate,
      photoUrl: photoUrl.trim() || undefined,
    });

    if (success) {
      onClose();
    }
  }

  const activeError = validationError || errorMessage;

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-vehicle-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        <h2 id="new-vehicle-title" className={styles.title}>
          Registrar Vehículo
        </h2>
        <p className={styles.description}>
          Ingrese los datos del nuevo vehículo para agregarlo al catálogo de la sede actual.
        </p>

        {activeError && <div className={styles.errorText}>{activeError}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.gridTwo}>
            <label className={styles.field}>
              Placa *
              <input
                type="text"
                className={styles.input}
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="ABC-123"
                maxLength={10}
                required
                disabled={isSubmitting}
              />
            </label>

            <label className={styles.field}>
              Categoría
              <select
                className={styles.select}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.gridTwo}>
            <label className={styles.field}>
              Marca *
              <input
                type="text"
                className={styles.input}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Toyota, Hyundai, Nissan..."
                required
                disabled={isSubmitting}
              />
            </label>

            <label className={styles.field}>
              Modelo *
              <input
                type="text"
                className={styles.input}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Hilux, Tucson, Frontier..."
                required
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className={styles.gridThree}>
            <label className={styles.field}>
              Año
              <input
                type="number"
                className={styles.input}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
                min={1990}
                max={2035}
                disabled={isSubmitting}
              />
            </label>

            <label className={styles.field}>
              Color
              <input
                type="text"
                className={styles.input}
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Blanco, Gris, Rojo..."
                disabled={isSubmitting}
              />
            </label>

            <label className={styles.field}>
              Tarifa diaria (S/)
              <input
                type="number"
                step="0.01"
                min="1"
                className={styles.input}
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                placeholder="250.00"
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className={styles.gridTwo}>
            <label className={styles.field}>
              Estado Inicial
              <select
                className={styles.select}
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                disabled={isSubmitting}
              >
                {STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              URL de Foto (opcional)
              <input
                type="url"
                className={styles.input}
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrar Vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
