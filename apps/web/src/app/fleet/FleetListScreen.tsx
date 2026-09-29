import { useState } from 'react';
import { Search } from 'lucide-react';
import { useFleetList, type VehicleFormData } from './useFleetList';
import { NewVehicleModal } from './NewVehicleModal';
import { AppHeader } from '../shared/AppHeader';
import type { FleetVehicle, VehicleStatus } from './fleet-client';
import styles from './FleetListScreen.module.css';

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

export function FleetListScreen() {
  const {
    state,
    vehicles,
    total,
    context,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    creating,
    createError,
    setCreateError,
    updatingId,
    addVehicle,
    changeStatus,
    editingVehicle,
    setEditingVehicle,
    editSubmitting,
    editError,
    setEditError,
    editVehicle,
    deactivateVehicle,
    reload,
  } = useFleetList();

  const [modalOpen, setModalOpen] = useState(false);
  const [deactivatingConfirmId, setDeactivatingConfirmId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  function openEditModal(vehicle: FleetVehicle) {
    setEditingVehicle(vehicle);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingVehicle(null);
  }

  async function handleModalSubmit(data: VehicleFormData): Promise<boolean> {
    if (editingVehicle) {
      return editVehicle(editingVehicle.id, data);
    }
    return addVehicle(data);
  }

  async function handleConfirmDeactivate(vehicleId: string) {
    setDeactivatingId(vehicleId);
    try {
      await deactivateVehicle(vehicleId);
    } finally {
      setDeactivatingId(null);
      setDeactivatingConfirmId(null);
    }
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader
        pageTitle="Flota Vehicular"
        actions={
          context ? (
            <button
              type="button"
              className={styles.newButton}
              onClick={() => setModalOpen(true)}
            >
              + Nuevo Vehículo
            </button>
          ) : undefined
        }
      />

      <div className={styles.content}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Buscar por placa, marca o modelo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar vehículos"
              />
            </div>

            <select
              className={styles.statusSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado"
            >
              <option value="ALL">Todos los estados</option>
              <option value="AVAILABLE">Disponible</option>
              <option value="RENTED">Alquilado</option>
              <option value="MAINTENANCE">Mantenimiento</option>
              <option value="OUT_OF_SERVICE">Fuera de Servicio</option>
            </select>
          </div>

          {state === 'READY' && (
            <span className={styles.countText}>
              {total} {total === 1 ? 'vehículo en flota' : 'vehículos en flota'}
            </span>
          )}
        </div>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando flota vehicular…</p>}

        {state === 'FORBIDDEN' && (
          <p className={styles.statusText}>
            No tienes permisos para ver la flota de esta sede o empresa.
          </p>
        )}

        {state === 'RECOVERABLE_ERROR' && (
          <div className={styles.statusText}>
            <p>No pudimos cargar el catálogo de flota vehicular.</p>
            <button type="button" className={styles.retryButton} onClick={() => void reload()}>
              Reintentar
            </button>
          </div>
        )}

        {state === 'EMPTY' && (
          <p className={styles.statusText}>
            {search.trim() || statusFilter !== 'ALL'
              ? 'No se encontraron vehículos que coincidan con los filtros aplicados.'
              : 'Todavía no hay vehículos registrados en la flota de esta empresa.'}
          </p>
        )}

        {state === 'READY' && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Vehículo</th>
                  <th>Categoría</th>
                  <th>Tarifa diaria</th>
                  <th>Estado</th>
                  <th>Acción</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span className={styles.plateBadge}>{v.plate}</span>
                    </td>
                    <td>
                      <span className={styles.vehicleTitle}>
                        {v.brand} {v.model}
                      </span>
                      <div className={styles.textMuted}>
                        {v.year ? `${v.year} • ` : ''}
                        {v.color || 'Color no especificado'}
                      </div>
                    </td>
                    <td>
                      <span className={styles.categoryBadge}>{v.category}</span>
                    </td>
                    <td>
                      {v.dailyRate != null ? (
                        <span className={styles.dailyRate}>S/ {Number(v.dailyRate).toFixed(2)}</span>
                      ) : (
                        <span className={styles.textMuted}>—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${STATUS_CLASSES[v.status] || ''}`}
                      >
                        {STATUS_LABELS[v.status] || v.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className={styles.quickStatusSelect}
                        value={v.status}
                        disabled={updatingId === v.id}
                        onChange={(e) => void changeStatus(v.id, e.target.value as VehicleStatus)}
                        aria-label={`Cambiar estado de ${v.plate}`}
                      >
                        <option value="AVAILABLE">Disponible</option>
                        <option value="RENTED">Alquilado</option>
                        <option value="MAINTENANCE">Mantenimiento</option>
                        <option value="OUT_OF_SERVICE">Fuera de Servicio</option>
                      </select>
                    </td>
                    <td>
                      {v.status !== 'OUT_OF_SERVICE' &&
                        (deactivatingConfirmId === v.id ? (
                          <span className={styles.confirmGroup}>
                            <button
                              type="button"
                              className={styles.dangerButton}
                              disabled={deactivatingId === v.id}
                              onClick={() => void handleConfirmDeactivate(v.id)}
                            >
                              {deactivatingId === v.id ? 'Dando de baja…' : 'Confirmar baja'}
                            </button>
                            <button
                              type="button"
                              className={styles.linkButton}
                              onClick={() => setDeactivatingConfirmId(null)}
                            >
                              Volver
                            </button>
                          </span>
                        ) : (
                          <span className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.linkButton}
                              onClick={() => openEditModal(v)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className={styles.dangerLink}
                              onClick={() => setDeactivatingConfirmId(v.id)}
                            >
                              Dar de baja
                            </button>
                          </span>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewVehicleModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        isSubmitting={editingVehicle ? editSubmitting : creating}
        errorMessage={editingVehicle ? editError : createError}
        onClearError={() => (editingVehicle ? setEditError(null) : setCreateError(null))}
        vehicle={editingVehicle}
      />
    </main>
  );
}
