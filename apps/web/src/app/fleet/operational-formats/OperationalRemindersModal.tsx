import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { getFirebaseAuth } from '../../providers/firebase';
import { listVehicleOperationalReminders } from '../fleet-client';
import {
  OPERATIONAL_FORMAT_LABELS,
  type OperationalReminderItem,
} from './operational-format-types';
import { VehicleOperationalModal } from './VehicleOperationalModal';
import styles from './OperationalFormats.module.css';

interface OperationalRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  branchId: string;
  idToken?: string;
  canRegister: boolean;
}

export function OperationalRemindersModal({
  isOpen,
  onClose,
  companyId,
  branchId,
  idToken: initialIdToken,
  canRegister,
}: OperationalRemindersModalProps) {
  const [reminders, setReminders] = useState<OperationalReminderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedToken, setResolvedToken] = useState<string>(initialIdToken || '');

  // Modal para resolver el recordatorio
  const [selectedReminder, setSelectedReminder] = useState<OperationalReminderItem | null>(null);

  const loadReminders = useCallback(async () => {
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
      const res = await listVehicleOperationalReminders(token, { companyId, branchId });
      const items = (res as any)?.reminders || (res as any) || [];
      // Filtramos solo los pendientes y vencidos
      const pendingAndOverdue = items.filter(
        (r: OperationalReminderItem) => r.status === 'PENDING' || r.status === 'OVERDUE',
      );
      setReminders(pendingAndOverdue);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.detail || err?.message || 'Error al cargar recordatorios operativos.');
    }
  }, [initialIdToken, companyId, branchId]);

  useEffect(() => {
    if (isOpen) {
      void loadReminders();
    }
  }, [isOpen, loadReminders]);

  if (!isOpen) return null;

  function handleOpenResolution(rem: OperationalReminderItem) {
    setSelectedReminder(rem);
  }

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="reminders-modal-title">
      <div className={styles.modalContent} style={{ maxWidth: '850px' }}>
        <div className={styles.modalHeader}>
          <div>
            <h2 id="reminders-modal-title" className={styles.sectionTitle}>
              Recordatorios de Inspección Técnica (FIVI y FITVM)
            </h2>
            <p className={styles.sectionSubtitle}>
              Inspecciones interdiarias (FIVI) y mensuales (FITVM) pendientes o vencidas por unidad
            </p>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            aria-label="Cerrar modal de recordatorios"
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {errorMessage && (
            <div className={styles.errorBanner} role="alert">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className={styles.emptyState}>Cargando recordatorios...</div>
          ) : reminders.length === 0 ? (
            <div className={styles.emptyState} data-testid="empty-reminders-state">
              <CheckCircle size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
              <p>¡Excelente! No hay recordatorios de inspección pendientes ni vencidos en la flota.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table} data-testid="reminders-table">
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Formato Requerido</th>
                    <th>Vehículo ID</th>
                    <th>Fecha Límite</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {reminders.map((rem) => (
                    <tr key={rem.id} data-testid={`reminder-row-${rem.id}`}>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            rem.status === 'OVERDUE' ? styles.badgeOverdue : styles.badgePending
                          }`}
                        >
                          {rem.status === 'OVERDUE' ? 'VENCIDO' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td>
                        <strong>{OPERATIONAL_FORMAT_LABELS[rem.formatType] ?? rem.formatType}</strong>
                      </td>
                      <td>{rem.vehiclePlate || rem.vehicleId}</td>
                      <td>{rem.dueDate ? new Date(rem.dueDate).toLocaleDateString('es-PE') : '-'}</td>
                      <td>
                        {canRegister && (
                          <button
                            type="button"
                            className={styles.primaryButton}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '12px' }}
                            onClick={() => handleOpenResolution(rem)}
                            data-testid={`btn-resolve-reminder-${rem.id}`}
                          >
                            Registrar Formato
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal para registrar el formato del recordatorio seleccionado */}
      {selectedReminder && (
        <VehicleOperationalModal
          isOpen={Boolean(selectedReminder)}
          onClose={() => setSelectedReminder(null)}
          onSuccess={() => {
            setSelectedReminder(null);
            void loadReminders();
          }}
          vehicleId={selectedReminder.vehicleId}
          vehiclePlate={selectedReminder.vehiclePlate || selectedReminder.vehicleId}
          companyId={companyId}
          branchId={branchId}
          idToken={initialIdToken || resolvedToken}
          defaultFormat={selectedReminder.formatType}
        />
      )}
    </div>
  );
}
