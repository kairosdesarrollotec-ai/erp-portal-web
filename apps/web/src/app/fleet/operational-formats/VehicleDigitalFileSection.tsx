import { useState, useEffect, useCallback } from 'react';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import { getFirebaseAuth } from '../../providers/firebase';
import { listVehicleOperationalRecords, listVehicleOperationalReminders } from '../fleet-client';
import {
  OPERATIONAL_FORMAT_LABELS,
  type OperationalRecordItem,
  type OperationalReminderItem,
} from './operational-format-types';
import { VehicleOperationalModal } from './VehicleOperationalModal';
import styles from './OperationalFormats.module.css';

interface VehicleDigitalFileSectionProps {
  vehicleId: string;
  vehiclePlate: string;
  companyId: string;
  branchId: string;
  idToken?: string;
  canRegister: boolean;
}

export function VehicleDigitalFileSection({
  vehicleId,
  vehiclePlate,
  companyId,
  branchId,
  idToken: initialIdToken,
  canRegister,
}: VehicleDigitalFileSectionProps) {
  const [records, setRecords] = useState<OperationalRecordItem[]>([]);
  const [reminders, setReminders] = useState<OperationalReminderItem[]>([]);
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedToken, setResolvedToken] = useState<string>(initialIdToken || '');

  const [modalOpen, setModalOpen] = useState(false);
  const [targetFormat, setTargetFormat] = useState<string>('FORMATO_05_RIO');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let token = initialIdToken || resolvedToken;
      if (!token) {
        const user = getFirebaseAuth().currentUser;
        if (user) {
          token = await user.getIdToken();
          setResolvedToken(token);
        }
      }

      const [recsRes, remsRes] = await Promise.all([
        listVehicleOperationalRecords(token, vehicleId, { companyId, branchId }),
        listVehicleOperationalReminders(token, { companyId, branchId, vehicleId }),
      ]);

      setRecords((recsRes as any)?.records || (recsRes as any) || []);
      setReminders((remsRes as any)?.reminders || (remsRes as any) || []);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.detail || err?.message || 'Error al cargar la ficha digital operativa.');
    }
  }, [initialIdToken, vehicleId, companyId, branchId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeReminders = reminders.filter(
    (r) => r.status === 'PENDING' || r.status === 'OVERDUE',
  );

  const filteredRecords = formatFilter === 'ALL'
    ? records
    : records.filter((r) => r.formatType === formatFilter);

  function handleOpenModalFor(formatType: string) {
    setTargetFormat(formatType);
    setModalOpen(true);
  }

  return (
    <section className={styles.sectionCard} aria-label="Ficha Digital Operativa del Vehículo">
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            Ficha Digital y Formatos Operativos — {vehiclePlate}
          </h2>
          <p className={styles.sectionSubtitle}>
            Historial de inspecciones, mantenimiento, incidencias (RIO), limpieza (RLV) y kits
          </p>
        </div>
        {canRegister && (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => handleOpenModalFor('FORMATO_05_RIO')}
            data-testid="btn-register-operational-format"
          >
            <PlusCircle size={15} />
            Registrar Formato
          </button>
        )}
      </div>

      {/* Recordatorios Activos / Vencidos in-app para esta unidad */}
      {activeReminders.length > 0 && (
        <div className={styles.reminderAlertBox} role="alert" data-testid="vehicle-active-reminders">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={18} color="#b45309" />
            <div>
              <p className={styles.reminderAlertText}>
                <strong>Recordatorios de Inspección Pendientes:</strong> Esta unidad tiene {activeReminders.length} inspección(es) pendiente(s) o vencida(s).
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                {activeReminders.map((rem) => (
                  <span key={rem.id} style={{ fontSize: '12px', color: '#92400e' }}>
                    • {OPERATIONAL_FORMAT_LABELS[rem.formatType] ?? rem.formatType} (Vence: {rem.dueDate?.slice(0, 10)})
                    {' '}
                    <span className={`${styles.badge} ${rem.status === 'OVERDUE' ? styles.badgeOverdue : styles.badgePending}`}>
                      {rem.status === 'OVERDUE' ? 'VENCIDO' : 'PENDIENTE'}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          {canRegister && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => handleOpenModalFor(activeReminders[0].formatType)}
              data-testid="btn-resolve-reminder"
            >
              Completar Inspección
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div className={styles.errorBanner} role="alert">
          {errorMessage}
        </div>
      )}

      {/* Filtros de la lista */}
      <div className={styles.filterRow}>
        <label htmlFor="filter-format-select" style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>
          Filtrar por Formato:
        </label>
        <select
          id="filter-format-select"
          className={styles.filterSelect}
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          data-testid="filter-format-select"
        >
          <option value="ALL">Todos los formatos</option>
          <option value="FORMATO_01_FIVI">Formato 01: FIVI (Interdiaria)</option>
          <option value="FORMATO_02_FIV">Formato 02: FIV (Inspección Vehicular)</option>
          <option value="FORMATO_03_FITVM">Formato 03: FITVM (Mensual)</option>
          <option value="FORMATO_04_FIVUN">Formato 04: FIVUN (Unidad Nueva)</option>
          <option value="FORMATO_05_RIO">Formato 05: RIO (Incidencias)</option>
          <option value="FORMATO_06_RNC">Formato 06: RNC (Combustible)</option>
          <option value="FORMATO_07_RLV">Formato 07: RLV (Limpieza)</option>
          <option value="FORMATO_08_FCKE">Formato 08: FCKE (Kit Emergencia)</option>
          <option value="FORMATO_09_MANTENIMIENTO">Formato 09: Mantenimiento</option>
        </select>
        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>
          Total registros: {filteredRecords.length}
        </span>
      </div>

      {/* Tabla de registros */}
      {isLoading ? (
        <div className={styles.emptyState}>Cargando registros operativos...</div>
      ) : filteredRecords.length === 0 ? (
        <div className={styles.emptyState} data-testid="empty-operational-records">
          No hay registros operativos cargados para este vehículo.
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table} data-testid="operational-records-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Formato</th>
                <th>Responsable</th>
                <th>Odómetro</th>
                <th>Combustible</th>
                <th>Proceso</th>
                <th>Observaciones / Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => (
                <tr key={r.id} data-testid={`operational-record-row-${r.id}`}>
                  <td>{r.performedAt ? new Date(r.performedAt).toLocaleDateString('es-PE') : '-'}</td>
                  <td>
                    <span className={styles.badgeFormat}>
                      {OPERATIONAL_FORMAT_LABELS[r.formatType] ?? r.formatType}
                    </span>
                  </td>
                  <td>{r.performedBy || '-'}</td>
                  <td>{r.odometerKm != null ? `${r.odometerKm} km` : '-'}</td>
                  <td>{r.fuelLevelLines != null ? `${r.fuelLevelLines}/16 líneas` : '-'}</td>
                  <td>
                    {r.processType ? (
                      <span className={styles.badge} style={{ background: '#f3f4f6', color: '#374151' }}>
                        {r.processType}
                      </span>
                    ) : (
                      'RUTINA'
                    )}
                  </td>
                  <td>{r.observations || (r.data?.descripcion as string) || (r.data?.motivoIngreso as string) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para registrar nuevo formato */}
      <VehicleOperationalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => void loadData()}
        vehicleId={vehicleId}
        vehiclePlate={vehiclePlate}
        companyId={companyId}
        branchId={branchId}
        idToken={initialIdToken || resolvedToken}
        defaultFormat={targetFormat}
      />
    </section>
  );
}
