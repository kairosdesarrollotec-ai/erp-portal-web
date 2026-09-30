import { useState, useRef, type FormEvent, useEffect, type ChangeEvent } from 'react';
import { Camera } from 'lucide-react';
import type { VehicleFormData } from './useFleetList';
import type { FleetVehicle, VehicleStatus } from './fleet-client';
import styles from './NewVehicleModal.module.css';

const MAX_PHOTO_BYTES = 12 * 1024 * 1024; // 12 MB — SDD-00 §16.5

interface NewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VehicleFormData) => Promise<boolean>;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  /**
   * Cuando se pasa, el modal opera en modo edición sobre este vehículo:
   * la placa se muestra pero no es editable (es el identificador natural
   * del vehículo) y el estado no se ofrece aquí (se cambia desde el
   * selector rápido o la acción "Dar de baja" en la lista).
   */
  vehicle?: FleetVehicle | null;
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
  vehicle = null,
}: NewVehicleModalProps) {
  const isEditMode = vehicle !== null;
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<string>('');
  const [color, setColor] = useState('');
  const [category, setCategory] = useState('SEDAN');
  const [status, setStatus] = useState<VehicleStatus>('AVAILABLE');
  const [dailyRate, setDailyRate] = useState<string>('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/webp') {
      setValidationError('Solo se admiten imágenes JPEG o WebP.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setValidationError(`El archivo supera el tamaño máximo de 12 MB.`);
      e.target.value = '';
      return;
    }

    if (photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    const blobUrl = URL.createObjectURL(file);
    setPendingPhotoFile(file);
    setPhotoPreviewUrl(blobUrl);
    setExistingPhotoUrl('');
    e.target.value = '';
  }

  function clearPhoto() {
    if (photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPendingPhotoFile(null);
    setPhotoPreviewUrl('');
    setExistingPhotoUrl('');
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!isOpen) {
      setPlate('');
      setBrand('');
      setModel('');
      setYear('');
      setColor('');
      setCategory('SEDAN');
      setStatus('AVAILABLE');
      setDailyRate('');
      setPendingPhotoFile(null);
      setPhotoPreviewUrl((prev) => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return '';
      });
      setExistingPhotoUrl('');
      setValidationError(null);
      onClearError();
      return;
    }

    if (vehicle) {
      setPlate(vehicle.plate);
      setBrand(vehicle.brand);
      setModel(vehicle.model);
      setYear(vehicle.year != null ? String(vehicle.year) : '');
      setColor(vehicle.color ?? '');
      setCategory(vehicle.category ?? 'SEDAN');
      setStatus(vehicle.status);
      setDailyRate(vehicle.dailyRate != null ? String(vehicle.dailyRate) : '');
      setPendingPhotoFile(null);
      setPhotoPreviewUrl('');
      setExistingPhotoUrl(vehicle.photoUrl ?? '');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, onClearError, vehicle]);

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
    if (!isEditMode && !cleanPlate) {
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
      photoFile: pendingPhotoFile ?? undefined,
      photoUrl: pendingPhotoFile ? undefined : (existingPhotoUrl.trim() || undefined),
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
          {isEditMode ? 'Editar Vehículo' : 'Registrar Vehículo'}
        </h2>
        <p className={styles.description}>
          {isEditMode
            ? 'Actualice los datos del vehículo. La placa y el estado no se editan desde aquí.'
            : 'Ingrese los datos del nuevo vehículo para agregarlo al catálogo de la sede actual.'}
        </p>

        {activeError && <div className={styles.errorText}>{activeError}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.gridTwo}>
            <label className={styles.field}>
              Placa {isEditMode ? '' : '*'}
              <input
                type="text"
                className={styles.input}
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="ABC-123"
                maxLength={10}
                required={!isEditMode}
                disabled={isSubmitting || isEditMode}
                readOnly={isEditMode}
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

          {!isEditMode && (
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
          )}

          <div className={styles.photoSection}>
            <span className={styles.photoLabel}>Foto del Vehículo (opcional)</span>
            <div className={styles.photoContainer}>
              {(photoPreviewUrl || existingPhotoUrl) ? (
                <div className={styles.photoPreviewWrapper}>
                  <img
                    src={photoPreviewUrl || existingPhotoUrl}
                    alt="Vista previa del vehículo"
                    className={styles.photoPreview}
                  />
                </div>
              ) : null}
              <div className={styles.photoActions}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  data-testid="vehicle-photo-file-input"
                />
                <button
                  type="button"
                  className={styles.attachPhotoButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  <Camera size={16} />
                  {(photoPreviewUrl || existingPhotoUrl) ? 'Cambiar foto' : 'Adjuntar foto'}
                </button>
                {(photoPreviewUrl || existingPhotoUrl) && (
                  <button
                    type="button"
                    className={styles.removePhotoButton}
                    onClick={clearPhoto}
                    disabled={isSubmitting}
                  >
                    Quitar foto
                  </button>
                )}
                <span className={styles.photoHint}>Formatos admitidos: JPEG o WebP (máx 12 MB)</span>
              </div>
            </div>
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
              {isSubmitting
                ? pendingPhotoFile
                  ? 'Subiendo foto...'
                  : isEditMode
                    ? 'Guardando...'
                    : 'Registrando...'
                : isEditMode
                  ? 'Guardar Cambios'
                  : 'Registrar Vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
