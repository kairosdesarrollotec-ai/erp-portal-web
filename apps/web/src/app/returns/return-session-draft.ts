import type { DamageOrigin, DamageSeverity } from './return-status';

/**
 * Borradores de UI por expediente (sessionStorage, igual que
 * rental-checklist-draft.ts): checklist, marcas por zona y seleccion de
 * gravedad en curso. NO guardan datos de dominio: danos y cargos de
 * paralizacion viven en el expediente (ReturnResponse.damages /
 * immobilizationCharges). Se limpian al cerrar el expediente.
 */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage puede no estar disponible - no bloquea la pantalla
  }
}

function remove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // no-op
  }
}

const k = (returnId: string, part: string) => `kairos.devolucion.${returnId}.${part}`;

// --- DEV-04: FIV / FCKE / notas / tiempos --------------------------------

/** Borrador del documento de responsabilidad (BR-DEV-009); se envia en complete-inspection (DEV-05). */
export interface ResponsibilityDocumentDraft {
  signerName: string;
  /** null = aun sin responder. */
  signerIsHolder: boolean | null;
  signerRelationToHolder: string;
  signatureData: string;
}

export const EMPTY_RESPONSIBILITY_DOCUMENT: ResponsibilityDocumentDraft = {
  signerName: '',
  signerIsHolder: null,
  signerRelationToHolder: '',
  signatureData: '',
};

export interface ReturnChecklistDraft {
  fivDone: boolean;
  fckeDone: boolean;
  responsibilityDocument: ResponsibilityDocumentDraft;
  notes: string;
  [key: string]: unknown;
}

export const EMPTY_RETURN_CHECKLIST: ReturnChecklistDraft = {
  fivDone: false,
  fckeDone: false,
  responsibilityDocument: EMPTY_RESPONSIBILITY_DOCUMENT,
  notes: '',
};

/** El documento esta completo: nombre, titular?, relacion (si no es titular) y firma. */
export function isResponsibilityDocumentComplete(doc: ResponsibilityDocumentDraft): boolean {
  if (!doc.signerName.trim() || doc.signerIsHolder === null || !doc.signatureData) return false;
  return doc.signerIsHolder || doc.signerRelationToHolder.trim().length > 0;
}

export const loadReturnChecklist = (id: string): ReturnChecklistDraft => {
  const draft = read<ReturnChecklistDraft>(k(id, 'checklist'), EMPTY_RETURN_CHECKLIST);
  return { ...draft, responsibilityDocument: { ...EMPTY_RESPONSIBILITY_DOCUMENT, ...draft.responsibilityDocument } };
};
export const saveReturnChecklist = (id: string, draft: ReturnChecklistDraft) => write(k(id, 'checklist'), draft);

// --- DEV-05: marcas por zona ---------------------------------------------

export type ZoneMark = 'OK' | 'DAMAGED';
export type ZoneMarks = Record<string, ZoneMark | undefined>;

export const loadZoneMarks = (id: string): ZoneMarks => read<ZoneMarks>(k(id, 'zonas'), {});
export const saveZoneMarks = (id: string, marks: ZoneMarks) => write(k(id, 'zonas'), marks);

// --- DEV-06: seleccion de gravedad/origen en curso ------------------------

export interface DamageSelection {
  origin: DamageOrigin | '';
  severity: DamageSeverity | '';
  /** "¿El cliente acepta el costo?" (null = sin responder; no aplica a GRAVE). */
  customerAcceptsCost: boolean | null;
}

export const EMPTY_DAMAGE_SELECTION: DamageSelection = { origin: '', severity: '', customerAcceptsCost: null };
export const loadDamageSelection = (id: string) => read(k(id, 'dano-seleccion'), EMPTY_DAMAGE_SELECTION);
export const saveDamageSelection = (id: string, sel: DamageSelection) => write(k(id, 'dano-seleccion'), sel);

export function clearReturnDrafts(id: string): void {
  for (const part of ['checklist', 'zonas', 'dano-seleccion']) remove(k(id, part));
}
