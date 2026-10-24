/**
 * Constantes y tipos para los Formatos Operativos 01 al 09 de Flota
 * Conforme a ~/ProjectKairos/formatos/ESTRUCTURA_FORMATOS_01-09.md
 */

export const OPERATIONAL_FORMAT_LABELS: Record<string, string> = {
  FORMATO_01_FIVI: 'Inspección Vehicular Interdiaria (FIVI)',
  FORMATO_02_FIV: 'Inspección Vehicular (FIV)',
  FORMATO_03_FITVM: 'Inspección Técnica Vehicular Mensual (FITVM)',
  FORMATO_04_FIVUN: 'Inspección Técnica Vehicular de Unidad Nueva (FIVUN)',
  FORMATO_05_RIO: 'Registro de Incidencias y Observaciones (RIO)',
  FORMATO_06_RNC: 'Registro de Nivel de Combustible (RNC)',
  FORMATO_07_RLV: 'Registro de Limpieza Vehicular (RLV)',
  FORMATO_08_FCKE: 'Control de Kit de Emergencia (FCKE)',
  FORMATO_09_MANTENIMIENTO: 'Reporte de Mantenimiento',
};

export type OperationalFormatType = keyof typeof OPERATIONAL_FORMAT_LABELS;

export interface OperationalRecordItem {
  id: string;
  vehicleId: string;
  formatType: string;
  processType: string | null;
  processId: string | null;
  odometerKm: number | null;
  fuelLevelLines: number | null;
  data: Record<string, unknown>;
  observations: string | null;
  performedBy: string;
  performedAt: string;
  createdAt: string;
}

export interface OperationalReminderItem {
  id: string;
  vehicleId: string;
  formatType: string;
  dueDate: string;
  status: 'PENDING' | 'OVERDUE' | 'COMPLETED';
  completedRecordId?: string | null;
  completedAt?: string | null;
  vehiclePlate?: string | null;
}

// ── FORMATO 03 & 04 (FITVM & FIVUN) INSPECTION ITEMS ──
export interface FitvmItemDef {
  key: string;
  label: string;
  spec: string;
}

export interface FitvmCategoryDef {
  category: string;
  items: FitvmItemDef[];
}

export const FITVM_CATEGORIES: FitvmCategoryDef[] = [
  {
    category: 'Nivel de Fluidos',
    items: [
      { key: 'aceite_motor', label: 'Aceite de Motor', spec: 'Nivel entre MIN y MAX, color marrón claro' },
      { key: 'refrigerante', label: 'Líquido Refrigerante', spec: 'Nivel entre marcas del depósito, color limpio' },
      { key: 'liquido_frenos', label: 'Líquido de Frenos', spec: 'Nivel entre MIN y MAX, no oscuro' },
      { key: 'direccion_asistida', label: 'Líquido de Dirección Asistida', spec: 'Nivel adecuado, no espumoso' },
      { key: 'limpiaparabrisas', label: 'Líquido Limpiaparabrisas', spec: 'Suficiente en el depósito' },
      { key: 'aceite_transmision', label: 'Aceite de Transmisión', spec: 'Nivel con varilla, rojo claro si aplica' },
    ],
  },
  {
    category: 'Sistema de Frenos',
    items: [
      { key: 'pedal_freno', label: 'Pedal de Freno', spec: 'Funciona firme, no se hunde en exceso' },
      { key: 'freno_estacionamiento', label: 'Freno de Estacionamiento', spec: 'Sujeta bien el vehículo' },
      { key: 'ruidos_frenar', label: 'Ruidos al Frenar', spec: 'Sin chillidos ni ruidos extraños' },
      { key: 'pastillas_delanteras', label: 'Pastillas Delanteras (Der/Izq)', spec: 'Desgaste visual dentro de tolerancia' },
      { key: 'pastillas_posteriores', label: 'Pastillas/Zapatas Posteriores', spec: 'Desgaste visual dentro de tolerancia' },
      { key: 'discos_tambores', label: 'Discos o Tambores', spec: 'Sin rayaduras profundas ni deformación' },
      { key: 'mangueras_freno', label: 'Mangueras y Líneas de Freno', spec: 'Sin fugas ni grietas' },
    ],
  },
  {
    category: 'Motor',
    items: [
      { key: 'arranque_motor', label: 'Arranque del Motor', spec: 'Enciende al primer intento sin dificultad' },
      { key: 'ralenti_motor', label: 'Ralentí del Motor', spec: 'Estable sin vibraciones excesivas' },
      { key: 'ruidos_motor', label: 'Ruidos Anormales del Motor', spec: 'Sin golpeteos ni silbidos inusuales' },
      { key: 'humo_escape', label: 'Humo del Escape', spec: 'Sin humo excesivo azul, negro o blanco' },
      { key: 'cambios_marcha', label: 'Cambios de Marcha', spec: 'Entran con suavidad y precisión' },
      { key: 'fugas_motor', label: 'Fugas Visibles de Fluidos', spec: 'Sin manchas ni goteos en el vano motor ni piso' },
      { key: 'filtro_aire', label: 'Filtro de Aire', spec: 'Limpio y sin obstrucciones' },
      { key: 'correas_motor', label: 'Estado de Correas', spec: 'Sin grietas ni tensión floja' },
      { key: 'luces_tablero', label: 'Testigos del Tablero', spec: 'Sin luces de alerta encendidas (Check engine)' },
    ],
  },
  {
    category: 'Dirección y Suspensión',
    items: [
      { key: 'juego_direccion', label: 'Juego en la Dirección', spec: 'Sin holgura excesiva al girar volante' },
      { key: 'amortiguadores_delanteros', label: 'Amortiguadores Delanteros', spec: 'Sin fugas de aceite, absorben irregularidades' },
      { key: 'amortiguadores_posteriores', label: 'Amortiguadores Posteriores', spec: 'Sin fugas de aceite, absorben irregularidades' },
      { key: 'rotulas_terminales', label: 'Rótulas y Terminales', spec: 'Sin juego ni ruidos al girar dirección' },
      { key: 'brazos_suspension', label: 'Brazos de Suspensión y Bujes', spec: 'Sin deformaciones ni bujes rotos' },
    ],
  },
  {
    category: 'Neumáticos',
    items: [
      { key: 'neumaticos_delanteros', label: 'Neumáticos Delanteros (Der/Izq)', spec: 'Presión 35 PSI, cocada > 3 mm, sin cortes' },
      { key: 'neumaticos_posteriores', label: 'Neumáticos Posteriores (Der/Izq)', spec: 'Presión 35 PSI, cocada > 3 mm, sin cortes' },
      { key: 'llanta_repuesto', label: 'Llanta de Repuesto', spec: 'Operativa, inflada a 35 PSI' },
    ],
  },
  {
    category: 'Iluminación y Batería',
    items: [
      { key: 'luces_delanteras', label: 'Faros Delanteros (Altas/Bajas)', spec: 'Ambos faros operativos y alineados' },
      { key: 'luces_posteriores', label: 'Luces Posteriores y Freno', spec: 'Faros de posición y freno operativos' },
      { key: 'direccionales_intermitentes', label: 'Direccionales e Intermitentes', spec: 'Destello normal en los 4 costados' },
      { key: 'bateria_bornes', label: 'Batería: Bornes y Fijación', spec: 'Bornes ajustados y limpios sin sulfato' },
    ],
  },
  {
    category: 'Documentación Legal',
    items: [
      { key: 'soat_vigente', label: 'SOAT Vigente', spec: 'Póliza vigente al día' },
      { key: 'tarjeta_propiedad', label: 'Tarjeta de Propiedad', spec: 'Original / copia visible en vehículo' },
      { key: 'revision_tecnica', label: 'Revisión Técnica', spec: 'Certificado de inspección técnica vigente' },
    ],
  },
];
