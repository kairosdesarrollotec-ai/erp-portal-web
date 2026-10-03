/**
 * ENTREGA-04/05 - el backend no tiene un endpoint de guardado parcial del
 * checklist de entrega mas alla de la evidencia misma (fotos/videos, que ya
 * se persisten en el backend via POST /rentals/:id/evidence apenas se
 * suben - ver Stage4ChecklistScreen). Lo que SI falta persistir en backend
 * es el temporizador/notas/excepcion, asi que ese resto del borrador se
 * guarda en sessionStorage por expediente. Se limpia al confirmar la
 * entrega (complete-delivery) o al cambiar de expediente.
 */
export interface RentalChecklistDraft {
  technicalMinutes: number;
  documentaryMinutes: number;
  exceptionReason: string;
  notes: string;
}

export const EMPTY_CHECKLIST_DRAFT: RentalChecklistDraft = {
  technicalMinutes: 0,
  documentaryMinutes: 0,
  exceptionReason: '',
  notes: '',
};

function key(rentalId: string) {
  return `kairos.alquiler.${rentalId}.checklist`;
}

export function loadChecklistDraft(rentalId: string): RentalChecklistDraft {
  try {
    const raw = sessionStorage.getItem(key(rentalId));
    if (!raw) return EMPTY_CHECKLIST_DRAFT;
    return { ...EMPTY_CHECKLIST_DRAFT, ...(JSON.parse(raw) as Partial<RentalChecklistDraft>) };
  } catch {
    return EMPTY_CHECKLIST_DRAFT;
  }
}

export function saveChecklistDraft(rentalId: string, draft: RentalChecklistDraft): void {
  try {
    sessionStorage.setItem(key(rentalId), JSON.stringify(draft));
  } catch {
    // sessionStorage puede no estar disponible - no bloquea la pantalla
  }
}

export function clearChecklistDraft(rentalId: string): void {
  try {
    sessionStorage.removeItem(key(rentalId));
  } catch {
    // no-op
  }
}
