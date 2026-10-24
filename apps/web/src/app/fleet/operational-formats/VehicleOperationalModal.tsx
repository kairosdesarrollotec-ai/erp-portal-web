import { useState } from 'react';
import { X } from 'lucide-react';
import { getFirebaseAuth } from '../../providers/firebase';
import { recordVehicleOperationalFormat } from '../fleet-client';
import { FITVM_CATEGORIES } from './operational-format-types';
import styles from './OperationalFormats.module.css';

interface VehicleOperationalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicleId: string;
  vehiclePlate: string;
  companyId: string;
  branchId: string;
  idToken?: string;
  defaultFormat?: string;
}

export function VehicleOperationalModal({
  isOpen,
  onClose,
  onSuccess,
  vehicleId,
  vehiclePlate,
  companyId,
  branchId,
  idToken: initialIdToken,
  defaultFormat = 'FORMATO_05_RIO',
}: VehicleOperationalModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>(defaultFormat);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Common fields
  const [performedBy, setPerformedBy] = useState('');
  const [odometerKm, setOdometerKm] = useState<string>('');
  const [fuelLevelLines, setFuelLevelLines] = useState<number>(16);
  const [observations, setObservations] = useState('');

  // RIO (05)
  const [rioFechaReporte, setRioFechaReporte] = useState(new Date().toISOString().slice(0, 10));
  const [rioDescripcion, setRioDescripcion] = useState('');
  const [rioSugerencia, setRioSugerencia] = useState('');
  const [rioReportado, setRioReportado] = useState<'SI' | 'NO'>('SI');
  const [rioSubsanacion, setRioSubsanacion] = useState<'SI' | 'NO'>('NO');
  const [rioFechaSubsanacion, setRioFechaSubsanacion] = useState('');

  // RLV (07)
  const [rlvFecha, setRlvFecha] = useState(new Date().toISOString().slice(0, 10));
  const [rlvTipo, setRlvTipo] = useState<'Básica' | 'Completa' | 'Lavado de salón' | 'Detallado'>('Básica');
  const [rlvCosto, setRlvCosto] = useState<string>('30');

  // Mantenimiento (09)
  const [mantenimientoCodigo, setMantenimientoCodigo] = useState('');
  const [mantenimientoFechaIngreso, setMantenimientoFechaIngreso] = useState(new Date().toISOString().slice(0, 10));
  const [mantenimientoFechaSalida, setMantenimientoFechaSalida] = useState('');
  const [mantenimientoTaller, setMantenimientoTaller] = useState('');
  const [mantenimientoCelularTaller, setMantenimientoCelularTaller] = useState('');
  const [mantenimientoTipo, setMantenimientoTipo] = useState<'PREVENTIVO' | 'CORRECTIVO' | 'OTRO'>('PREVENTIVO');
  const [mantenimientoEncargado, setMantenimientoEncargado] = useState('');
  const [mantenimientoMotivo, setMantenimientoMotivo] = useState('');
  const [mantenimientoManoObra, setMantenimientoManoObra] = useState<string>('0');
  const [mantenimientoRepuestos, setMantenimientoRepuestos] = useState<string>('0');
  const [mantenimientoInsumos, setMantenimientoInsumos] = useState<string>('0');
  const [mantenimientoDetalle, setMantenimientoDetalle] = useState('');

  // FIVI (01)
  const [fiviFecha, setFiviFecha] = useState(new Date().toISOString().slice(0, 10));
  const [fiviMotorEnciende, setFiviMotorEnciende] = useState<'SI' | 'NO'>('SI');
  const [fiviLucesAdvertencia, setFiviLucesAdvertencia] = useState('Ninguna');
  const [fiviLimpioExterior, setFiviLimpioExterior] = useState<'SI' | 'NO'>('SI');
  const [fiviLimpioInterior, setFiviLimpioInterior] = useState<'SI' | 'NO'>('SI');
  const [fiviMaleteraLimpia, setFiviMaleteraLimpia] = useState<'SI' | 'NO'>('SI');
  const [fiviPresionPsi, setFiviPresionPsi] = useState('35');
  const [fiviTapaCombustible, setFiviTapaCombustible] = useState<'SI' | 'NO'>('SI');
  const [fiviDisponible, setFiviDisponible] = useState<'SI' | 'NO'>('SI');
  const [fiviFallas, setFiviFallas] = useState('');

  const fiviBotiquin = 'SI';
  const fiviGata = 'SI';
  const fiviTriangulo = 'SI';
  const fiviExtintor = 'SI';
  const fiviCableBateria = 'SI';
  const fiviLlaves = 'SI';
  const fiviLlaveRueda = 'SI';
  const fiviRepuesto = 'SI';

  // FITVM (03) / FIVUN (04) grid state: { [key]: 'B' | 'M' | 'NA' }
  const [techGrid, setTechGrid] = useState<Record<string, 'B' | 'M' | 'NA'>>(() => {
    const init: Record<string, 'B' | 'M' | 'NA'> = {};
    for (const cat of FITVM_CATEGORIES) {
      for (const it of cat.items) {
        init[it.key] = 'B';
      }
    }
    return init;
  });

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!performedBy.trim()) {
      setErrorMessage('El nombre del responsable que registra es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    let specificData: Record<string, unknown> = {};

    if (selectedFormat === 'FORMATO_05_RIO') {
      if (!rioDescripcion.trim()) {
        setErrorMessage('La descripción de la observación o incidencia es obligatoria en RIO.');
        setIsSubmitting(false);
        return;
      }
      specificData = {
        fechaReporte: rioFechaReporte,
        responsable: performedBy,
        descripcion: rioDescripcion,
        sugerencia: rioSugerencia,
        reportado: rioReportado,
        firma: performedBy,
        subsanacion: rioSubsanacion,
        fechaSubsanacion: rioFechaSubsanacion || null,
      };
    } else if (selectedFormat === 'FORMATO_07_RLV') {
      specificData = {
        fechaLimpieza: rlvFecha,
        responsable: performedBy,
        tipoLimpieza: rlvTipo,
        costo: Number(rlvCosto) || 0,
        observaciones: observations,
      };
    } else if (selectedFormat === 'FORMATO_09_MANTENIMIENTO') {
      const manoObra = Number(mantenimientoManoObra) || 0;
      const repuestos = Number(mantenimientoRepuestos) || 0;
      const insumos = Number(mantenimientoInsumos) || 0;
      specificData = {
        codigo: mantenimientoCodigo,
        fechaIngreso: mantenimientoFechaIngreso,
        fechaSalida: mantenimientoFechaSalida || null,
        nombreTaller: mantenimientoTaller,
        celularTaller: mantenimientoCelularTaller,
        tipoMantenimiento: mantenimientoTipo,
        encargado: mantenimientoEncargado || performedBy,
        motivoIngreso: mantenimientoMotivo,
        costoManoObra: manoObra,
        costoRepuestos: repuestos,
        costoInsumos: insumos,
        costoTotal: manoObra + repuestos + insumos,
        detalleRepuestos: mantenimientoDetalle,
      };
    } else if (selectedFormat === 'FORMATO_01_FIVI') {
      specificData = {
        fechaInspeccion: fiviFecha,
        responsable: performedBy,
        motorEnciende: fiviMotorEnciende,
        lucesAdvertencia: fiviLucesAdvertencia,
        limpiezaExterior: fiviLimpioExterior,
        limpiezaInterior: fiviLimpioInterior,
        maleteraLimpia: fiviMaleteraLimpia,
        botiquin: fiviBotiquin,
        gata: fiviGata,
        triangulo: fiviTriangulo,
        extintor: fiviExtintor,
        cableBateria: fiviCableBateria,
        llavesBasicas: fiviLlaves,
        llaveRueda: fiviLlaveRueda,
        llantaRepuesto: fiviRepuesto,
        presionLlantasPsi: fiviPresionPsi,
        tapaCombustibleAsegurada: fiviTapaCombustible,
        disponibleAlquilar: fiviDisponible,
        fallasReportar: fiviFallas,
      };
    } else if (selectedFormat === 'FORMATO_03_FITVM' || selectedFormat === 'FORMATO_04_FIVUN') {
      specificData = {
        verificador: performedBy,
        inspeccionItems: techGrid,
        observaciones: observations,
      };
    }

    try {
      let token = initialIdToken;
      if (!token) {
        const user = getFirebaseAuth().currentUser;
        if (user) token = await user.getIdToken();
      }
      await recordVehicleOperationalFormat(
        token || '',
        vehicleId,
        {
          companyId,
          branchId,
          formatType: selectedFormat,
          odometerKm: odometerKm ? Number(odometerKm) : undefined,
          fuelLevelLines: fuelLevelLines,
          data: specificData,
          observations: observations || undefined,
          performedBy: performedBy.trim(),
        },
        `op-format-${vehicleId}-${selectedFormat}-${Date.now()}`,
      );

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.detail || err?.message || 'Error al guardar el formato operativo.');
    }
  }

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div>
            <h2 id="modal-title" className={styles.sectionTitle}>
              Registrar Formato Operativo — {vehiclePlate}
            </h2>
            <p className={styles.sectionSubtitle}>
              Ficha digital y formatos oficiales KAIROS / VeloxRent
            </p>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className={styles.modalBody}>
            {errorMessage && (
              <div className={styles.errorBanner} role="alert">
                {errorMessage}
              </div>
            )}

            {/* Selector de Formato */}
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="format-select" className={styles.label}>
                  Seleccionar Formato Operativo
                </label>
                <select
                  id="format-select"
                  className={styles.select}
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                >
                  <option value="FORMATO_05_RIO">Formato 05: Registro de Incidencias y Observaciones (RIO)</option>
                  <option value="FORMATO_07_RLV">Formato 07: Registro de Limpieza Vehicular (RLV)</option>
                  <option value="FORMATO_09_MANTENIMIENTO">Formato 09: Reporte de Mantenimiento</option>
                  <option value="FORMATO_01_FIVI">Formato 01: Inspección Vehicular Interdiaria (FIVI)</option>
                  <option value="FORMATO_03_FITVM">Formato 03: Inspección Técnica Vehicular Mensual (FITVM)</option>
                  <option value="FORMATO_04_FIVUN">Formato 04: Inspección Técnica de Unidad Nueva (FIVUN)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="performedBy-input" className={styles.label}>
                  Responsable / Verificador *
                </label>
                <input
                  id="performedBy-input"
                  className={styles.input}
                  type="text"
                  required
                  placeholder="Ej. Cecilia Chumpitaz / Mecánico"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="odometer-input" className={styles.label}>
                  Odómetro actual (KM)
                </label>
                <input
                  id="odometer-input"
                  className={styles.input}
                  type="number"
                  placeholder="Ej. 45200"
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="fuel-input" className={styles.label}>
                  Nivel de Combustible (Líneas 0 - 16)
                </label>
                <select
                  id="fuel-input"
                  className={styles.select}
                  value={fuelLevelLines}
                  onChange={(e) => setFuelLevelLines(Number(e.target.value))}
                >
                  <option value={0}>0 / 16 (Vacío)</option>
                  <option value={4}>4 / 16 (1/4 tanque)</option>
                  <option value={8}>8 / 16 (1/2 tanque)</option>
                  <option value={12}>12 / 16 (3/4 tanque)</option>
                  <option value={16}>16 / 16 (Tanque lleno)</option>
                </select>
              </div>
            </div>

            {/* ── CAMPOS ESPECÍFICOS SEGÚN FORMATO ── */}

            {/* Formato 05 RIO */}
            {selectedFormat === 'FORMATO_05_RIO' && (
              <div>
                <h3 className={styles.fieldCategoryTitle}>Campos del Formato 05 — RIO</h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Fecha de Reporte</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={rioFechaReporte}
                      onChange={(e) => setRioFechaReporte(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>¿Reporte formal?</label>
                    <select
                      className={styles.select}
                      value={rioReportado}
                      onChange={(e) => setRioReportado(e.target.value as 'SI' | 'NO')}
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>¿Subsanado?</label>
                    <select
                      className={styles.select}
                      value={rioSubsanacion}
                      onChange={(e) => setRioSubsanacion(e.target.value as 'SI' | 'NO')}
                    >
                      <option value="NO">NO</option>
                      <option value="SI">SI</option>
                    </select>
                  </div>
                  {rioSubsanacion === 'SI' && (
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Fecha de Subsanación</label>
                      <input
                        type="date"
                        className={styles.input}
                        value={rioFechaSubsanacion}
                        onChange={(e) => setRioFechaSubsanacion(e.target.value)}
                      />
                    </div>
                  )}
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Descripción de la Observación / Incidencia *</label>
                    <textarea
                      className={styles.textarea}
                      required
                      placeholder="Detalle de la falla, ruido o daño observado en el vehículo..."
                      value={rioDescripcion}
                      onChange={(e) => setRioDescripcion(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Sugerencia</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Sugerencia de reparación, reemplazo o prueba técnica"
                      value={rioSugerencia}
                      onChange={(e) => setRioSugerencia(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Formato 07 RLV */}
            {selectedFormat === 'FORMATO_07_RLV' && (
              <div>
                <h3 className={styles.fieldCategoryTitle}>Campos del Formato 07 — RLV (Limpieza Vehicular)</h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Fecha de Limpieza</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={rlvFecha}
                      onChange={(e) => setRlvFecha(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Tipo de Limpieza</label>
                    <select
                      className={styles.select}
                      value={rlvTipo}
                      onChange={(e) => setRlvTipo(e.target.value as any)}
                    >
                      <option value="Básica">Básica (Carrocería y alfombrillas)</option>
                      <option value="Completa">Completa (Exterior, interior y maletera)</option>
                      <option value="Lavado de salón">Lavado de salón (Tapicería profunda)</option>
                      <option value="Detallado">Detallado / Pulido</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Costo (S/.)</label>
                    <input
                      type="number"
                      step="0.5"
                      className={styles.input}
                      value={rlvCosto}
                      onChange={(e) => setRlvCosto(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Formato 09 Mantenimiento */}
            {selectedFormat === 'FORMATO_09_MANTENIMIENTO' && (
              <div>
                <h3 className={styles.fieldCategoryTitle}>Campos del Formato 09 — Reporte de Mantenimiento</h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Código de Orden / Identificador</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="VR-GO-FRM-001"
                      value={mantenimientoCodigo}
                      onChange={(e) => setMantenimientoCodigo(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Tipo de Mantenimiento</label>
                    <select
                      className={styles.select}
                      value={mantenimientoTipo}
                      onChange={(e) => setMantenimientoTipo(e.target.value as any)}
                    >
                      <option value="PREVENTIVO">P: Preventivo</option>
                      <option value="CORRECTIVO">C: Correctivo</option>
                      <option value="OTRO">O: Otro</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nombre del Taller</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Taller Autorizado..."
                      value={mantenimientoTaller}
                      onChange={(e) => setMantenimientoTaller(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Celular del Taller</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="999888777"
                      value={mantenimientoCelularTaller}
                      onChange={(e) => setMantenimientoCelularTaller(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Encargado del Mantenimiento</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Mecánico o responsable"
                      value={mantenimientoEncargado}
                      onChange={(e) => setMantenimientoEncargado(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Fecha de Ingreso</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={mantenimientoFechaIngreso}
                      onChange={(e) => setMantenimientoFechaIngreso(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Fecha de Salida</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={mantenimientoFechaSalida}
                      onChange={(e) => setMantenimientoFechaSalida(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Mano de Obra (S/.)</label>
                    <input
                      type="number"
                      step="0.5"
                      className={styles.input}
                      value={mantenimientoManoObra}
                      onChange={(e) => setMantenimientoManoObra(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Repuestos (S/.)</label>
                    <input
                      type="number"
                      step="0.5"
                      className={styles.input}
                      value={mantenimientoRepuestos}
                      onChange={(e) => setMantenimientoRepuestos(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Insumos (S/.)</label>
                    <input
                      type="number"
                      step="0.5"
                      className={styles.input}
                      value={mantenimientoInsumos}
                      onChange={(e) => setMantenimientoInsumos(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Motivo de Ingreso al Taller</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Descripción de la causa de mantenimiento..."
                      value={mantenimientoMotivo}
                      onChange={(e) => setMantenimientoMotivo(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Detalle de Repuestos, Insumos o Materiales Utilizados</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Listado de repuestos y códigos cambiados..."
                      value={mantenimientoDetalle}
                      onChange={(e) => setMantenimientoDetalle(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Formato 01 FIVI */}
            {selectedFormat === 'FORMATO_01_FIVI' && (
              <div>
                <h3 className={styles.fieldCategoryTitle}>Campos del Formato 01 — FIVI (Inspección Interdiaria)</h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Fecha de Inspección</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={fiviFecha}
                      onChange={(e) => setFiviFecha(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>¿Motor enciende al primer intento?</label>
                    <select
                      className={styles.select}
                      value={fiviMotorEnciende}
                      onChange={(e) => setFiviMotorEnciende(e.target.value as any)}
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Testigos de advertencia en tablero</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Ninguna / Check engine..."
                      value={fiviLucesAdvertencia}
                      onChange={(e) => setFiviLucesAdvertencia(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Limpieza Exterior / Carrocería</label>
                    <select
                      className={styles.select}
                      value={fiviLimpioExterior}
                      onChange={(e) => setFiviLimpioExterior(e.target.value as any)}
                    >
                      <option value="SI">SI (Limpio)</option>
                      <option value="NO">NO (Requiere lavado)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Limpieza Interior</label>
                    <select
                      className={styles.select}
                      value={fiviLimpioInterior}
                      onChange={(e) => setFiviLimpioInterior(e.target.value as any)}
                    >
                      <option value="SI">SI (Limpio)</option>
                      <option value="NO">NO (Requiere aspirado)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Limpieza Maletera</label>
                    <select
                      className={styles.select}
                      value={fiviMaleteraLimpia}
                      onChange={(e) => setFiviMaleteraLimpia(e.target.value as any)}
                    >
                      <option value="SI">SI (Limpio)</option>
                      <option value="NO">NO (Requiere limpieza)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Presión Neumáticos (PSI)</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="35 PSI"
                      value={fiviPresionPsi}
                      onChange={(e) => setFiviPresionPsi(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Tapa Combustible Asegurada</label>
                    <select
                      className={styles.select}
                      value={fiviTapaCombustible}
                      onChange={(e) => setFiviTapaCombustible(e.target.value as any)}
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>¿Disponible para Alquilar?</label>
                    <select
                      className={styles.select}
                      value={fiviDisponible}
                      onChange={(e) => setFiviDisponible(e.target.value as any)}
                    >
                      <option value="SI">SI (Apto)</option>
                      <option value="NO">NO (Observado)</option>
                    </select>
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Kit de Emergencia Completo (Botiquín, Extintor, Gata, Triángulo, Llaves)</label>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <span>Botiquín: <strong>{fiviBotiquin}</strong></span>
                      <span>Extintor: <strong>{fiviExtintor}</strong></span>
                      <span>Gata: <strong>{fiviGata}</strong></span>
                      <span>Triángulo: <strong>{fiviTriangulo}</strong></span>
                      <span>Llave Ruedas: <strong>{fiviLlaveRueda}</strong></span>
                      <span>Repuesto: <strong>{fiviRepuesto}</strong></span>
                    </div>
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Fallas o detalles a reportar</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Detalles interdiarios observados..."
                      value={fiviFallas}
                      onChange={(e) => setFiviFallas(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Formato 03 FITVM o Formato 04 FIVUN */}
            {(selectedFormat === 'FORMATO_03_FITVM' || selectedFormat === 'FORMATO_04_FIVUN') && (
              <div>
                <h3 className={styles.fieldCategoryTitle}>
                  Grilla de Inspección Técnica — {selectedFormat === 'FORMATO_03_FITVM' ? 'FITVM (Mensual)' : 'FIVUN (Unidad Nueva)'}
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '1rem' }}>
                  Estado de cada ítem técnico: <strong>B</strong> (Buen estado) | <strong>M</strong> (Mal estado) | <strong>NA</strong> (No aplica).
                </p>

                {FITVM_CATEGORIES.map((cat) => (
                  <div key={cat.category} style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                      {cat.category}
                    </h4>
                    <div className={styles.checkGrid}>
                      {cat.items.map((item) => (
                        <div key={item.key} className={styles.checkCard}>
                          <span className={styles.checkCardLabel}>{item.label}</span>
                          <span className={styles.checkCardSpec}>{item.spec}</span>
                          <div className={styles.radioGroup}>
                            <label className={styles.radioLabel}>
                              <input
                                type="radio"
                                name={`fitvm_${item.key}`}
                                value="B"
                                checked={techGrid[item.key] === 'B'}
                                onChange={() => setTechGrid((prev) => ({ ...prev, [item.key]: 'B' }))}
                              />
                              B
                            </label>
                            <label className={styles.radioLabel}>
                              <input
                                type="radio"
                                name={`fitvm_${item.key}`}
                                value="M"
                                checked={techGrid[item.key] === 'M'}
                                onChange={() => setTechGrid((prev) => ({ ...prev, [item.key]: 'M' }))}
                              />
                              M
                            </label>
                            <label className={styles.radioLabel}>
                              <input
                                type="radio"
                                name={`fitvm_${item.key}`}
                                value="NA"
                                checked={techGrid[item.key] === 'NA'}
                                onChange={() => setTechGrid((prev) => ({ ...prev, [item.key]: 'NA' }))}
                              />
                              NA
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Observaciones generales */}
            <div className={styles.formGroupFull} style={{ marginTop: '1rem' }}>
              <label htmlFor="obs-input" className={styles.label}>
                Observaciones generales
              </label>
              <textarea
                id="obs-input"
                className={styles.textarea}
                placeholder="Notas adicionales o firmas requeridas..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Formato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
