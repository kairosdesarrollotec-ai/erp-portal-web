import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  /**
   * DEC-ALQ-THIRDPATH-001: la marca «elegible para tercera vía» solo la edita Gerencia (permiso FLEET.MANAGE_THIRD_PATH).
   * Solo se ofrece en modo edición.
   */
  canManageThirdPath?: boolean;
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

const PASSENGER_CAPACITY_REQUIRED_MESSAGE =
  'Indique cuántos pasajeros admite el vehículo (capacidad de pasajeros, de 1 a 60).';

const vehicleSchema = z.object({
  plate: z.string(),
  brand: z.string().min(1, 'La marca es obligatoria.'),
  model: z.string().min(1, 'El modelo es obligatorio.'),
  year: z.string().refine(
    (v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1950 && Number(v) <= 2100),
    { message: 'Ingrese un año válido entre 1950 y 2100.' },
  ),
  color: z.string(),
  category: z.string(),
  status: z.enum(['AVAILABLE', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE']),
  dailyRate: z.string().refine((v) => v === '' || (Number(v) > 0 && !isNaN(Number(v))), {
    message: 'La tarifa diaria debe ser mayor a 0.',
  }),
  depositMinimum: z.string().refine((v) => v === '' || (Number(v) >= 0 && !isNaN(Number(v))), {
    message: 'La garantía debe ser un monto mayor o igual a 0.',
  }),
  passengerCapacity: z.string().refine(
    (v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 60),
    { message: 'La capacidad de pasajeros debe ser un entero entre 1 y 60.' },
  ),
  fuelPrice: z.string().refine((v) => v === '' || (Number(v) >= 0 && !isNaN(Number(v))), {
    message: 'El precio del combustible debe ser un monto mayor o igual a 0.',
  }),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

export function NewVehicleModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
  onClearError,
  vehicle = null,
  canManageThirdPath = false,
}: NewVehicleModalProps) {
  const isEditMode = vehicle !== null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: '',
      brand: '',
      model: '',
      year: undefined,
      color: '',
      category: 'SEDAN',
      status: 'AVAILABLE',
      dailyRate: undefined,
      depositMinimum: undefined,
      passengerCapacity: undefined,
      fuelPrice: undefined,
    },
  });

  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [thirdPathEligible, setThirdPathEligible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      reset({
        plate: '',
        brand: '',
        model: '',
        year: undefined,
        color: '',
        category: 'SEDAN',
        status: 'AVAILABLE',
        dailyRate: undefined,
        depositMinimum: undefined,
        passengerCapacity: undefined,
        fuelPrice: undefined,
      });
      // Las siguientes llamadas setState se batchean en una sola re-render (React 18).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingPhotoFile(null);
      setPhotoPreviewUrl((prev) => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return '';
      });
      setExistingPhotoUrl('');
      setPhotoError(null);
      onClearError();
      return;
    }

    if (vehicle) {
      reset({
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year != null ? String(vehicle.year) : '',
        color: vehicle.color ?? '',
        category: vehicle.category ?? 'SEDAN',
        status: vehicle.status,
        dailyRate: vehicle.dailyRate != null ? String(vehicle.dailyRate) : '',
        depositMinimum: vehicle.depositMinimum != null ? String(vehicle.depositMinimum) : '',
        passengerCapacity: vehicle.passengerCapacity != null ? String(vehicle.passengerCapacity) : '',
        fuelPrice: vehicle.fuelPrice != null ? String(vehicle.fuelPrice) : '',
      });
      setPendingPhotoFile(null);
      setPhotoPreviewUrl('');
      setExistingPhotoUrl(vehicle.photoUrl ?? '');
      setThirdPathEligible(vehicle.thirdPathEligible === true);
    }
  }, [isOpen, vehicle, reset, onClearError]);

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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/webp') {
      setPhotoError('Solo se admiten imágenes JPEG o WebP.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('El archivo supera el tamaño máximo de 12 MB.');
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
    setPhotoError(null);
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

  const onFormSubmit = handleSubmit((values) => {
    if (!isEditMode && !values.plate.trim()) {
      setError('plate', { message: 'La placa es obligatoria.' });
      return;
    }

    const parsedYear = values.year ? parseInt(values.year, 10) : undefined;
    const parsedRate = values.dailyRate ? parseFloat(values.dailyRate) : undefined;
    // DEC-FLT-CAP-001 / Respuestas 2026-10-20 #3-#4: todo vehículo tiene capacidad > 0 (máx. 60), al registrar y al editar
    // (el botón Editar sirve para completarla en vehículos antiguos). Garantía y combustible son opcionales: si faltan,
    // la reserva/alquiler avisará para completarlos.
    if (!(values.passengerCapacity ?? '').trim()) {
      setError('passengerCapacity', { message: PASSENGER_CAPACITY_REQUIRED_MESSAGE });
      return;
    }

    // "0" es válido (garantía/combustible >= 0): solo el vacío se omite.
    const parsedDepositMinimum = values.depositMinimum ? parseFloat(values.depositMinimum) : undefined;
    const parsedCapacity = values.passengerCapacity ? parseInt(values.passengerCapacity, 10) : undefined;
    const parsedFuelPrice = values.fuelPrice ? parseFloat(values.fuelPrice) : undefined;

    void onSubmit({
      plate: values.plate.trim().toUpperCase(),
      brand: values.brand.trim(),
      model: values.model.trim(),
      year: parsedYear,
      color: values.color?.trim() || undefined,
      category: values.category,
      status: values.status as VehicleStatus,
      dailyRate: parsedRate,
      depositMinimum: parsedDepositMinimum,
      passengerCapacity: parsedCapacity,
      fuelPrice: parsedFuelPrice,
      ...(isEditMode && canManageThirdPath ? { thirdPathEligible } : {}),
      photoFile: pendingPhotoFile ?? undefined,
      photoUrl: pendingPhotoFile ? undefined : (existingPhotoUrl.trim() || undefined),
    }).then((success) => {
      if (success) onClose();
    });
  });

  const firstFieldError =
    errors.plate?.message ??
    errors.brand?.message ??
    errors.model?.message ??
    errors.year?.message ??
    errors.dailyRate?.message ??
    errors.depositMinimum?.message ??
    errors.passengerCapacity?.message ??
    errors.fuelPrice?.message;

  const activeError = photoError ?? firstFieldError ?? errorMessage;

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

        <form onSubmit={onFormSubmit} className={styles.form} noValidate>
          <div className={styles.gridTwo}>
            <label className={styles.field}>
              Placa {isEditMode ? '' : '*'}
              <input
                type="text"
                className={styles.input}
                {...register('plate', {
                  setValueAs: (v: string) => v.toUpperCase(),
                })}
                placeholder="ABC-123"
                maxLength={10}
                disabled={isSubmitting || isEditMode}
                readOnly={isEditMode}
                aria-invalid={!!errors.plate}
              />
            </label>

            <label className={styles.field}>
              Categoría
              <select
                className={styles.select}
                {...register('category')}
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
                {...register('brand')}
                placeholder="Toyota, Hyundai, Nissan..."
                disabled={isSubmitting}
                aria-invalid={!!errors.brand}
              />
            </label>

            <label className={styles.field}>
              Modelo *
              <input
                type="text"
                className={styles.input}
                {...register('model')}
                placeholder="Hilux, Tucson, Frontier..."
                disabled={isSubmitting}
                aria-invalid={!!errors.model}
              />
            </label>
          </div>

          <div className={styles.gridThree}>
            <label className={styles.field}>
              Año
              <input
                type="number"
                className={styles.input}
                {...register('year')}
                placeholder="2024"
                min={1950}
                max={2100}
                disabled={isSubmitting}
                aria-invalid={!!errors.year}
              />
            </label>

            <label className={styles.field}>
              Color
              <input
                type="text"
                className={styles.input}
                {...register('color')}
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
                {...register('dailyRate')}
                placeholder="250.00"
                disabled={isSubmitting}
                aria-invalid={!!errors.dailyRate}
              />
            </label>
          </div>

          <div className={styles.gridThree}>
            <label className={styles.field}>
              Garantía (S/) (opcional)
              <input
                type="number"
                step="0.01"
                min="0"
                className={styles.input}
                {...register('depositMinimum')}
                placeholder="500.00"
                disabled={isSubmitting}
                aria-invalid={!!errors.depositMinimum}
              />
              <span className={styles.fieldHint}>Si no lo sabe, se le avisará al reservar o alquilar este vehículo.</span>
            </label>

            <label className={styles.field}>
              Capacidad de pasajeros *
              <input
                type="number"
                step="1"
                min="1"
                max="60"
                className={styles.input}
                {...register('passengerCapacity')}
                placeholder="5"
                disabled={isSubmitting}
                required
                aria-invalid={!!errors.passengerCapacity}
              />
              {isEditMode && vehicle?.passengerCapacity == null && (
                <span className={styles.fieldHint} role="note">
                  Falta registrar la capacidad de este vehículo. Indique cuántos pasajeros admite.
                </span>
              )}
            </label>

            <label className={styles.field}>
              Precio del combustible (S/ por unidad) (opcional)
              <input
                type="number"
                step="0.01"
                min="0"
                className={styles.input}
                {...register('fuelPrice')}
                placeholder="4.50"
                disabled={isSubmitting}
                aria-invalid={!!errors.fuelPrice}
              />
              <span className={styles.fieldHint}>Si no lo sabe, se le avisará al reservar o alquilar este vehículo.</span>
            </label>
          </div>

          {isEditMode && canManageThirdPath && (
            <label className={styles.field}>
              <span>
                <input
                  type="checkbox"
                  checked={thirdPathEligible}
                  onChange={(e) => setThirdPathEligible(e.target.checked)}
                  disabled={isSubmitting}
                />{' '}
                Elegible para tercera vía notarial
              </span>
              <span className={styles.fieldHint}>
                Marca de vehículo «de menor costo relativo» (BR-ALQ-004). Solo Gerencia puede cambiarla; aplica junto con la
                verificación biométrica del cliente.
              </span>
            </label>
          )}

          {!isEditMode && (
            <label className={styles.field}>
              Estado Inicial
              <select
                className={styles.select}
                {...register('status')}
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
