/**
 * ENTREGA-04/05 - el backend no tiene un endpoint de guardado parcial del
 * checklist de entrega (POST .../commands/complete-delivery solo recibe
 * photosCount/videosCount/notes, en un unico envio final). Para que
 * ENTREGA-04 "autoguarde" su avance y ENTREGA-05 pueda mostrarlo y
 * confirmarlo sin perderlo, el borrador se guarda en sessionStorage por
 * expediente. Se limpia al confirmar la entrega (complete-delivery) o al
 * cambiar de expediente.
 */
export interface RentalChecklistDraft {
  photosCount: number;
  videosCount: number;
  technicalMinutes: number;
  documentaryMinutes: number;
  exceptionReason: string;
  notes: string;
}

export const EMPTY_CHECKLIST_DRAFT: RentalChecklistDraft = {
  photosCount: 0,
  videosCount: 0,
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
