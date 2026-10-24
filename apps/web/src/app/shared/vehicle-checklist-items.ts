/**
 * Mapeo oficial de formatos operativos FIV (Formato 02), FCKE (Formato 08) y RNC (Formato 06)
 * integrados en los checklists de Entrega (ALQ-09) y Devolución (DEV-04).
 *
 * Fuente: ~/ProjectKairos/formatos/ESTRUCTURA_FORMATOS_01-09.md
 * Regla BR-INS-005:
 *   - FIV (Formato 02): verifica estado general y solo presencia del kit de emergencia.
 *   - FCKE (Formato 08): verifica presencia, estado y vigencia (extintor, botiquín) de cada implemento del kit.
 *   - RNC (Formato 06): registra nivel de combustible en líneas y kilometraje.
 */

export type ChecklistItemStatus = 'B' | 'M' | 'NA';

export interface ChecklistItemDef {
  key: string;
  label: string;
  category: string;
  format: 'FIV' | 'FCKE' | 'RNC';
}

export const FIV_ITEMS: readonly ChecklistItemDef[] = [
  // 1. Exteriores del Vehículo
  { key: 'fiv_puertas_capo_cajuela', label: '¿Las puertas, capó y cajuela abren y cierran correctamente?', category: 'Exteriores del Vehículo', format: 'FIV' },
  { key: 'fiv_pintura_detalles', label: '¿Existen diferencias de tonalidad en la pintura y/o detalles en la carrocería?', category: 'Exteriores del Vehículo', format: 'FIV' },
  { key: 'fiv_faros_luces', label: '¿Funcionan correctamente las luces delanteras, traseras, intermitentes, de freno, reversa y placa?', category: 'Exteriores del Vehículo', format: 'FIV' },
  { key: 'fiv_vidrios_faros', label: '¿Los vidrios del faro están en óptimas condiciones?', category: 'Exteriores del Vehículo', format: 'FIV' },
  { key: 'fiv_parabrisas', label: '¿Existen grietas o astillas visibles en los parabrisas?', category: 'Exteriores del Vehículo', format: 'FIV' },
  { key: 'fiv_limpiaparabrisas', label: '¿Funcionan correctamente los limpiaparabrisas y plumillas?', category: 'Exteriores del Vehículo', format: 'FIV' },
  { key: 'fiv_llantas_estado', label: '¿Las llantas se encuentran en buen estado, sin grietas ni desgastes excesivos?', category: 'Exteriores del Vehículo', format: 'FIV' },
  { key: 'fiv_presion_llantas', label: '¿La presión de las llantas es la correcta?', category: 'Exteriores del Vehículo', format: 'FIV' },
  { key: 'fiv_llanta_repuesto_equipo', label: '¿Cuenta con llanta de repuesto y equipo de cambio?', category: 'Exteriores del Vehículo', format: 'FIV' },
  { key: 'fiv_retrovisores', label: '¿Los cristales y retrovisores están firmes y sin daños?', category: 'Exteriores del Vehículo', format: 'FIV' },

  // 2. Limpieza del Vehículo
  { key: 'fiv_limpieza_interior', label: '¿El interior del vehículo se encuentra correctamente limpio?', category: 'Limpieza del Vehículo', format: 'FIV' },
  { key: 'fiv_limpieza_exterior', label: '¿El exterior del vehículo se encuentra correctamente limpio?', category: 'Limpieza del Vehículo', format: 'FIV' },

  // 3. Kit de Emergencia (Presencia en FIV per BR-INS-005)
  { key: 'fiv_kit_emergencia_presencia', label: '¿El Kit de emergencia cuenta con llave de ruedas, gata, triángulo de emergencia, botiquín, cable de batería, juego de llaves mixtas y extintor?', category: 'Kit de Emergencia', format: 'FIV' },

  // 4. Motor y Mecánica
  { key: 'fiv_motor_aceite', label: '¿El nivel de aceite de motor es el adecuado?', category: 'Motor y Mecánica', format: 'FIV' },
  { key: 'fiv_fugas_fluidos', label: '¿Hay alguna fuga de fluidos visible? ¿Se evidencia el origen?', category: 'Motor y Mecánica', format: 'FIV' },
  { key: 'fiv_bateria_fijacion_bornes', label: '¿La batería está correctamente fijada y con bornes sin corrosión?', category: 'Motor y Mecánica', format: 'FIV' },
  { key: 'fiv_bateria_codigo', label: '¿El código de batería corresponde al vehículo?', category: 'Motor y Mecánica', format: 'FIV' },
  { key: 'fiv_refrigerante_nivel', label: '¿El nivel de refrigerante es el adecuado y el radiador sin fugas?', category: 'Motor y Mecánica', format: 'FIV' },
  { key: 'fiv_agua_limpiaparabrisas', label: '¿El nivel de agua del limpiaparabrisas es el adecuado?', category: 'Motor y Mecánica', format: 'FIV' },

  // 5. Interior del Vehículo
  { key: 'fiv_asientos_estado', label: '¿Se evidencian rasgaduras o manchas en los asientos?', category: 'Interior del Vehículo', format: 'FIV' },
  { key: 'fiv_cinturones_seguridad', label: '¿Funcionan correctamente todos los cinturones de seguridad?', category: 'Interior del Vehículo', format: 'FIV' },
  { key: 'fiv_tablero_indicadores', label: '¿Funcionan correctamente los indicadores y testigos del tablero?', category: 'Interior del Vehículo', format: 'FIV' },
  { key: 'fiv_controles_volante', label: '¿Funcionan correctamente los controles del volante (luces, direccionales, limpiaparabrisas)?', category: 'Interior del Vehículo', format: 'FIV' },
  { key: 'fiv_climatizacion', label: '¿Funciona correctamente el aire acondicionado y la calefacción?', category: 'Interior del Vehículo', format: 'FIV' },
  { key: 'fiv_radio_sonido', label: '¿Funciona correctamente la radio, altavoces y controles de audio?', category: 'Interior del Vehículo', format: 'FIV' },
  { key: 'fiv_vidrios_electricos', label: '¿Funcionan correctamente los vidrios y asientos eléctricos?', category: 'Interior del Vehículo', format: 'FIV' },

  // 6. Parte Baja del Vehículo
  { key: 'fiv_chasis_fugas', label: '¿Hay alguna fuga de fluidos en chasis (aceite, refrigerante, líquido de frenos)?', category: 'Parte Baja del Vehículo', format: 'FIV' },
  { key: 'fiv_chasis_danos', label: '¿Se observa óxido, golpes, grietas o deformaciones en el chasis?', category: 'Parte Baja del Vehículo', format: 'FIV' },
  { key: 'fiv_chasis_cables_flojos', label: '¿Hay cables sueltos, partes flojas o signos de desgaste anormal?', category: 'Parte Baja del Vehículo', format: 'FIV' },

  // 7. Documentación y Verificación Legal
  { key: 'fiv_placas_coincidencia', label: '¿La placa se encuentra en buen estado y coincide con los documentos?', category: 'Documentación Legal', format: 'FIV' },
  { key: 'fiv_tarjeta_propiedad', label: '¿La tarjeta de propiedad vehicular pertenece al vehículo?', category: 'Documentación Legal', format: 'FIV' },
  { key: 'fiv_revision_tecnica_vigente', label: '¿Cuenta con revisión técnica vehicular vigente?', category: 'Documentación Legal', format: 'FIV' },
  { key: 'fiv_soat_vigente', label: '¿El vehículo cuenta con SOAT vigente?', category: 'Documentación Legal', format: 'FIV' },

  // 8. Prueba de Conducción
  { key: 'fiv_prueba_movimiento', label: '¿Se dio una vuelta a la manzana/cuadra para verificar el funcionamiento general?', category: 'Prueba de Conducción', format: 'FIV' },
  { key: 'fiv_arranque_motor', label: '¿El motor arranca sin problemas ni ruidos extraños?', category: 'Prueba de Conducción', format: 'FIV' },
  { key: 'fiv_desempeno_frenos', label: '¿Los frenos responden eficientemente?', category: 'Prueba de Conducción', format: 'FIV' },
  { key: 'fiv_rendimiento_motor', label: '¿Se acelera suavemente sin ruidos extraños?', category: 'Prueba de Conducción', format: 'FIV' },
  { key: 'fiv_direccion_alineacion', label: '¿Se evidencia alineación y respuesta correcta del volante?', category: 'Prueba de Conducción', format: 'FIV' },
  { key: 'fiv_suspension_ruidos', label: '¿Se evidencian ruidos extraños de la suspensión al conducir?', category: 'Prueba de Conducción', format: 'FIV' },
];

export const FCKE_ITEMS: readonly ChecklistItemDef[] = [
  { key: 'fcke_gata_botella', label: 'Gata hidráulica tipo botella (operativa y firme)', category: 'Kit de Emergencia', format: 'FCKE' },
  { key: 'fcke_triangulo', label: 'Triángulo de seguridad reflectante', category: 'Kit de Emergencia', format: 'FCKE' },
  { key: 'fcke_llaves_mixtas', label: 'Juego de llaves mixtas (N° 10, N° 11, N° 12)', category: 'Kit de Emergencia', format: 'FCKE' },
  { key: 'fcke_cable_bateria', label: 'Cable de batería (pasa-corriente)', category: 'Kit de Emergencia', format: 'FCKE' },
  { key: 'fcke_extintor', label: 'Extintor de incendios (vigente y cargado)', category: 'Kit de Emergencia', format: 'FCKE' },
  { key: 'fcke_botiquin', label: 'Botiquín de primeros auxilios (completo e insumos vigentes)', category: 'Kit de Emergencia', format: 'FCKE' },
  { key: 'fcke_llanta_repuesto', label: 'Llanta de repuesto en óptimas condiciones', category: 'Kit de Emergencia', format: 'FCKE' },
  { key: 'fcke_llave_ruedas', label: 'Llave de ruedas adecuada para el vehículo', category: 'Kit de Emergencia', format: 'FCKE' },
  { key: 'fcke_soga', label: 'Soga de remolque', category: 'Kit de Emergencia', format: 'FCKE' },
];

export const RNC_FIELDS = {
  KILOMETRAJE: 'rnc_kilometraje',
  NIVEL_COMBUSTIBLE_LINEAS: 'rnc_nivel_combustible_lineas',
  SUGERENCIA: 'rnc_sugerencia',
} as const;

