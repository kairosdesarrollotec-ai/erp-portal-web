import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useVehicleDetail } from './useVehicleDetail';
import { NewVehicleModal } from './NewVehicleModal';
import { VehicleDigitalFileSection } from './operational-formats/VehicleDigitalFileSection';
import { useRolePermissions } from '../shared/useRolePermissions';
import type { VehicleStatus } from './fleet-client';
import type { VehicleFormData } from './useFleetList';
import styles from './VehicleDetailScreen.module.css';

/**
 * FLO-02 — Detalle de vehículo.
 * Prototipo: PROTO-FLO-02-DETALLE-MANTENIMIENTO-VEHICULO (estado READY, 1440px).
 *
 * Secciones de historial de mantenimiento, telemetría y compromisos futuros
 * requieren módulos de backend no disponibles en v0.2.0 de fleet.yaml
 * (no existen endpoints para esos datos). Se muestran como placeholders
 * hasta que dichos módulos existan.
 */

const STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: 'Disponible',
  RENTED: 'Alquilado',
  MAINTENANCE: 'Mantenimiento',
  OUT_OF_SERVICE: 'Fuera de Servicio',
};

const STATUS_CLASSES: Record<VehicleStatus, string> = {
  AVAILABLE: styles.statusAvailable,
  RENTED: styles.statusRented,
  MAINTENANCE: styles.statusMaintenance,
  OUT_OF_SERVICE: styles.statusOutOfService,
};

export function VehicleDetailScreen() {
  const navigate = useNavigate();
  const { can } = useRolePermissions();
  const canWrite = can('FLEET', 'WRITE');
  const canManageThirdPath = can('FLEET', 'MANAGE_THIRD_PATH');
  const canRegisterOperationalFormat = can('FLEET', 'REGISTER_VEHICLE_OPERATIONAL_FORMAT') || canWrite;
  const canViewOperationalFormat = can('FLEET', 'VIEW_VEHICLE_OPERATIONAL_FORMAT') || can('FLEET', 'READ');
  const {
    state,
    vehicle,
    context,
    changingStatus,
    statusErrorMessage,
    editSubmitting,
    editErrorMessage,
    changeStatus,
    editVehicle,
    reload,
  } = useVehicleDetail();

  // Atajo desde los avisos de datos faltantes de reserva/alquiler (DEC-ALQ-VEHDATA-001): abre el editor al entrar.
  const location = useLocation();
  const [editModalOpen, setEditModalOpen] = useState(
    () => (location.state as { openEdit?: boolean } | null)?.openEdit === true,
  );

  async function handleEditSubmit(data: VehicleFormData): Promise<boolean> {
    const ok = await editVehicle(data);
    if (ok) setEditModalOpen(false);
    return ok;
  }

  if (state === 'LOADING') {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>Cargando vehículo…</p>
      </main>
    );
  }

  if (state === 'FORBIDDEN') {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>
          No tienes permisos para ver este vehículo.
        </p>
        <div className={styles.statusActions}>
          <button type="button" className={styles.linkButton} onClick={() => navigate('/flota')}>
            Volver a Flota
          </button>
        </div>
      </main>
    );
  }

  if (state === 'RECOVERABLE_ERROR' || !vehicle) {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>No pudimos cargar este vehículo.</p>
        <div className={styles.errorActions}>
          <button type="button" className={styles.retryButton} onClick={() => void reload()}>
            Reintentar
          </button>
          <button type="button" className={styles.linkButton} onClick={() => navigate('/flota')}>
            Volver a Flota
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrapper}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/flota', { state: context ?? undefined })}
          aria-label="Volver a la lista de flota"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Volver a Flota
        </button>
        <div className={styles.topBarDivider} aria-hidden="true" />
        <span className={styles.topBarMeta}>
          Placa: <strong>{vehicle.plate}</strong>
        </span>
        <div className={styles.topBarActions}>
          {canWrite && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setEditModalOpen(true)}
            >
              Editar vehículo
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {/* Vehicle info card */}
        <div className={styles.vehicleCard}>
          {/* Photo */}
          <div className={styles.photoWrapper}>
            {vehicle.photoUrl ? (
              <img
                src={vehicle.photoUrl}
                alt={`Foto de ${vehicle.brand} ${vehicle.model} — ${vehicle.plate}`}
                className={styles.vehiclePhotoImg}
              />
            ) : (
              <div className={styles.vehiclePhotoPlaceholder} aria-label="Sin foto">
                Sin foto
              </div>
            )}
            <span className={styles.plateLabelOnPhoto} aria-hidden="true">
              {vehicle.plate}
            </span>
          </div>

          {/* Info */}
          <div className={styles.vehicleInfo}>
            <div className={styles.vehicleBadges}>
              {vehicle.category && (
                <span className={styles.categoryBadge}>{vehicle.category}</span>
              )}
            </div>
            <h1 className={styles.vehicleName}>
              {vehicle.brand} {vehicle.model}
            </h1>
            {vehicle.year && (
              <p className={styles.vehicleSubtitle}>Año: {vehicle.year}</p>
            )}
            {vehicle.color && (
              <p className={styles.vehicleSubtitle}>Color: {vehicle.color}</p>
            )}

            <div className={styles.vehicleMeta}>
              {vehicle.dailyRate != null && (
                <div className={styles.vehicleMetaItem}>
                  <span className={styles.vehicleMetaLabel}>Tarifa</span>
                  <span className={styles.vehicleMetaValue}>
                    S/ {Number(vehicle.dailyRate).toFixed(2)} / día
                  </span>
                </div>
              )}
              {vehicle.depositMinimum != null && (
                <div className={styles.vehicleMetaItem}>
                  <span className={styles.vehicleMetaLabel}>Garantía</span>
                  <span className={styles.vehicleMetaValue}>
                    S/ {Number(vehicle.depositMinimum).toFixed(2)}
                  </span>
                </div>
              )}
              <div className={styles.vehicleMetaItem}>
                <span className={styles.vehicleMetaLabel}>Capacidad de pasajeros</span>
                {vehicle.passengerCapacity != null ? (
                  <span className={styles.vehicleMetaValue}>{vehicle.passengerCapacity}</span>
                ) : (
                  <span className={styles.vehicleMetaValue} data-testid="missing-capacity">
                    <span className={styles.missingCapacity} role="status">
                      Falta registrar la capacidad
                    </span>
                    {canWrite && (
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => setEditModalOpen(true)}
                      >
                        Completar capacidad
                      </button>
                    )}
                  </span>
                )}
              </div>
              <div className={styles.vehicleMetaItem}>
                <span className={styles.vehicleMetaLabel}>Apto para trocha</span>
                <span className={styles.vehicleMetaValue} data-testid="suitable-for-trocha">
                  {vehicle.suitableForTrocha ? 'Sí (Apto)' : 'No'}
                </span>
              </div>
              <div className={styles.vehicleMetaItem}>
                <span className={styles.vehicleMetaLabel}>Tercera vía notarial</span>
                <span className={styles.vehicleMetaValue} data-testid="third-path-eligible">
                  {vehicle.thirdPathEligible ? 'Elegible' : 'No elegible'}
                </span>
              </div>
              <div className={styles.vehicleMetaItem}>
                <span className={styles.vehicleMetaLabel}>Tarifas por Plan</span>
                <span className={styles.vehicleMetaValue}>
                  {`Normal: ${(vehicle.rateNormal ?? vehicle.dailyRate) != null ? `S/ ${Number(vehicle.rateNormal ?? vehicle.dailyRate).toFixed(2)}` : '—'} · Plus: ${vehicle.ratePlus != null ? `S/ ${Number(vehicle.ratePlus).toFixed(2)}` : '—'} · Libre: ${vehicle.rateLibre != null ? `S/ ${Number(vehicle.rateLibre).toFixed(2)}` : '—'}`}
                </span>
                {vehicle.rateNormal == null && vehicle.dailyRate == null && (
                  <span className={styles.missingCapacity} data-testid="missing-rate-normal" role="status">
                    Falta tarifa del plan Normal
                  </span>
                )}
                {vehicle.ratePlus == null && (
                  <span className={styles.missingCapacity} data-testid="missing-rate-plus" role="status">
                    Falta tarifa del plan Plus
                  </span>
                )}
                {vehicle.rateLibre == null && (
                  <span className={styles.missingCapacity} data-testid="missing-rate-libre" role="status">
                    Falta tarifa del plan Libre
                  </span>
                )}
              </div>
              <div className={styles.vehicleMetaItem}>
                <span className={styles.vehicleMetaLabel}>Multa combustible (por línea)</span>
                <span className={styles.vehicleMetaValue}>
                  {vehicle.fuelPenaltyPerLine != null
                    ? `S/ ${Number(vehicle.fuelPenaltyPerLine).toFixed(2)} / línea`
                    : 'Estándar'}
                </span>
              </div>
              <div className={styles.vehicleMetaItem}>
                <span className={styles.vehicleMetaLabel}>Precio del combustible</span>
                <span className={styles.vehicleMetaValue}>
                  {vehicle.fuelPrice != null
                    ? `S/ ${Number(vehicle.fuelPrice).toFixed(2)} / unidad`
                    : 'Sin registrar'}
                </span>
              </div>
            </div>
          </div>

          {/* Current status chip */}
          <div className={styles.vehicleActions}>
            <span
              className={`${styles.statusPill} ${STATUS_CLASSES[vehicle.status] ?? ''}`}
            >
              {STATUS_LABELS[vehicle.status] ?? vehicle.status}
            </span>
          </div>
        </div>

        {/* Inline status change */}
        <div className={styles.statusSection}>
          <span className={styles.statusLabel}>Estado operativo</span>
          <select
            className={styles.statusSelect}
            value={vehicle.status}
            disabled={changingStatus || !canWrite}
            onChange={(e) => void changeStatus(e.target.value as VehicleStatus)}
            aria-label="Cambiar estado operativo del vehículo"
          >
            <option value="AVAILABLE">Disponible</option>
            <option value="RENTED">Alquilado</option>
            <option value="MAINTENANCE">Mantenimiento</option>
            <option value="OUT_OF_SERVICE">Fuera de Servicio</option>
          </select>
          {changingStatus && (
            <span className={styles.vehicleSubtitle} aria-live="polite">
              Actualizando…
            </span>
          )}
          {statusErrorMessage && (
            <p className={styles.errorText} role="alert">
              {statusErrorMessage}
            </p>
          )}
        </div>

        {/* Ficha Digital de Formatos Operativos (C4) */}
        {context && canViewOperationalFormat && (
          <VehicleDigitalFileSection
            vehicleId={vehicle.id}
            vehiclePlate={vehicle.plate}
            companyId={context.companyId}
            branchId={context.branchId}
            canRegister={canRegisterOperationalFormat}
          />
        )}

        <div className={styles.placeholderSection} aria-label="Telemetría no disponible">
          <p className={styles.placeholderTitle}>Telemetría y compromisos futuros</p>
          <p className={styles.placeholderDesc}>
            Disponible cuando el módulo de Telemetría esté integrado al contrato OpenAPI.
          </p>
        </div>
      </div>

      {/* Edit modal */}
      <NewVehicleModal
        isOpen={editModalOpen && canWrite}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        isSubmitting={editSubmitting}
        errorMessage={editErrorMessage}
        onClearError={() => {/* handled by mutation reset */}}
        vehicle={vehicle}
        canManageThirdPath={canManageThirdPath}
      />
    </main>
  );
}
