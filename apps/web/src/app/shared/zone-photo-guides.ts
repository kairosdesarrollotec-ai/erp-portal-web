/**
 * D3: Guía de toma fotográfica por zona del vehículo (orientación al operador en checklists).
 * Aplica tanto a la entrega (Stage4ChecklistScreen) como a la devolución (ChecklistScreen).
 */
export const ZONE_PHOTO_GUIDES: Record<string, string> = {
  FRONTAL:
    'Parachoques delantero, capó, faros principales y neblineros, parabrisas, placa y toma a 45° de esquinas delanteras.',
  LATERAL_IZQUIERDO:
    'Puertas izquierdas, manijas, espejos laterales, aros y llantas delantera/trasera izquierdas, guardafangos y estribos.',
  LATERAL_DERECHO:
    'Puertas derechas, manijas, espejos laterales, aros y llantas delantera/trasera derechas, guardafangos y estribos.',
  POSTERIOR:
    'Parachoques posterior, compuerta/maletera, faros posteriores, placa, llanta de repuesto y kit de emergencia.',
  INTERIOR:
    'Salón completo, tapicería de asientos, tablero con odómetro e indicadores encendidos, timón, climatizador y techo.',
};
