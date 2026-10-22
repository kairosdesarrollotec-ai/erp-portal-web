import { Link } from 'react-router-dom';
import { usePermissions } from './usePermissions';
import styles from './VehicleDataWarnings.module.css';

/** Forma común de rentals.yaml 1.12.0 / reservations.yaml 0.9.0 (VehicleDataWarning). */
export interface VehicleWarning {
  code: string;
  field?: string;
  message?: string;
}

/** Mensajes de negocio por código (DEC-ALQ-VEHDATA-001, Respuestas 2026-10-20 #5). */
const WARNING_COPY: Record<string, string> = {
  VEHICLE_PASSENGER_CAPACITY_MISSING:
    'Falta la capacidad de pasajeros de este vehículo: no se puede validar el máximo de acompañantes.',
  VEHICLE_DEPOSIT_MINIMUM_MISSING:
    'Falta el monto de garantía de este vehículo: complétalo para saber cuánto corresponde cobrar.',
  VEHICLE_FUEL_PRICE_MISSING:
    'Falta el precio del combustible de este vehículo: complétalo para poder calcular el cobro por combustible.',
};

function vehicleWarningMessage(warning: VehicleWarning): string {
  return WARNING_COPY[warning.code] ?? warning.message ?? 'Faltan datos del vehículo.';
}

interface Props {
  warnings: VehicleWarning[] | null | undefined;
  vehicleId: string;
  /** Contexto de trabajo (empresa/sede) que se reenvía al abrir Flota. */
  context?: unknown;
  /** Códigos que ya se muestran en otro aviso de la pantalla (evita duplicados). */
  hideCodes?: string[];
}

/**
 * Avisos de datos faltantes del vehículo (capacidad, garantía, combustible) con atajo a «Editar vehículo».
 * No bloquea el flujo. El atajo solo se ofrece con permiso FLEET.WRITE.
 */
export function VehicleDataWarnings({ warnings, vehicleId, context, hideCodes = [] }: Props) {
  const visible = (warnings ?? []).filter((w) => !hideCodes.includes(w.code));
  if (visible.length === 0) return null;
  return <WarningsBox visible={visible} vehicleId={vehicleId} context={context} />;
}

function WarningsBox({ visible, vehicleId, context }: { visible: VehicleWarning[]; vehicleId: string; context?: unknown }) {
  const { can } = usePermissions();
  const canEdit = can('FLEET', 'WRITE');
  const baseState = context && typeof context === 'object' ? (context as Record<string, unknown>) : {};

  return (
    <div className={styles.box} role="status" data-testid="vehicle-data-warnings">
      <p className={styles.title}>Faltan datos de este vehículo</p>
      <ul className={styles.list}>
        {visible.map((w) => (
          <li key={w.code} data-testid={`vehicle-warning-${w.code}`}>
            {vehicleWarningMessage(w)}
          </li>
        ))}
      </ul>
      <p className={styles.note}>Puedes continuar; conviene completarlos antes de seguir.</p>
      {canEdit ? (
        <Link to={`/flota/${vehicleId}`} state={{ ...baseState, openEdit: true }} className={styles.link}>
          Editar vehículo
        </Link>
      ) : (
        <p className={styles.note}>Pide a quien administra la flota que complete estos datos.</p>
      )}
    </div>
  );
}
