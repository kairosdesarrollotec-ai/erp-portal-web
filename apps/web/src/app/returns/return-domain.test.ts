import { describe, it, expect } from 'vitest';
import { ReturnCommandError } from './returns-client';
import { describeReturnError, isIncidentOpenError, isStaleReturnError } from './return-errors';
import { returnPathForStatus, hoursSince, isReturnFinal, RETURN_STATUS_LABELS } from './return-status';
import { canReturnAction } from './return-permissions';
import { roleRef } from '../../test/permissions';
import { damagesWithoutAmount, formatPen, hasGraveDamage, humanizeZoneCode, totalCharges } from './return-financial';
import type { ImmobilizationChargeResponse, ReturnDamageResponse } from './returns-client';
import {
  clearReturnDrafts,
  EMPTY_RESPONSIBILITY_DOCUMENT,
  isResponsibilityDocumentComplete,
  loadReturnChecklist,
  saveReturnChecklist,
  EMPTY_RETURN_CHECKLIST,
} from './return-session-draft';

const damage = (over: Partial<ReturnDamageResponse> = {}): ReturnDamageResponse => ({
  id: 'd1',
  returnId: 'r1',
  origin: 'AESTHETIC',
  severity: 'LEVE',
  estimatedAmount: 200,
  createdAt: 'x',
  ...over,
});
const charge = (over: Partial<ImmobilizationChargeResponse> = {}): ImmobilizationChargeResponse => ({
  id: 'c1',
  returnId: 'r1',
  daysCharged: 2,
  dailyRate: 100,
  totalAmount: 200,
  createdAt: 'x',
  ...over,
});

describe('return-errors - lenguaje de negocio', () => {
  it('traduce codigos de dominio sin exponer codigo ni HTTP', () => {
    const err = new ReturnCommandError(422, { code: 'INCIDENT_STILL_OPEN', detail: 'x' });
    const message = describeReturnError(err, 'fallback');
    expect(message).toMatch(/incidencia/i);
    expect(message).not.toMatch(/INCIDENT_STILL_OPEN|422/);
  });

  it('usa el mensaje por estado HTTP cuando no hay codigo conocido', () => {
    expect(describeReturnError(new ReturnCommandError(412, null), 'fb')).toMatch(/modificó/);
    expect(describeReturnError(new ReturnCommandError(403, null), 'fb')).toMatch(/permiso/);
  });

  it('devuelve el fallback ante errores no tipados', () => {
    expect(describeReturnError(new Error('boom'), 'No pudimos')).toBe('No pudimos');
  });

  it('detecta expedientes desactualizados (409/412/428)', () => {
    expect(isStaleReturnError(new ReturnCommandError(412, null))).toBe(true);
    expect(isStaleReturnError(new ReturnCommandError(422, null))).toBe(false);
  });
});

describe('return-status', () => {
  it('returnPathForStatus retoma el expediente en la pantalla del estado', () => {
    expect(returnPathForStatus('r1', 'a1', 'PROGRAMADA')).toBe('/devoluciones/recepcion/a1');
    expect(returnPathForStatus('r1', 'a1', 'RECEPCION_PROVISIONAL')).toBe('/devoluciones/r1/alcoholimetro');
    expect(returnPathForStatus('r1', 'a1', 'INSPECCION')).toBe('/devoluciones/r1/checklist');
    expect(returnPathForStatus('r1', 'a1', 'SIN_DANOS')).toBe('/devoluciones/r1/resultado');
    expect(returnPathForStatus('r1', 'a1', 'CON_DANOS')).toBe('/devoluciones/r1/resultado');
    expect(returnPathForStatus('r1', 'a1', 'CIERRE_FINANCIERO')).toBe('/devoluciones/r1/cierre');
    expect(returnPathForStatus('r1', 'a1', 'CERRADA')).toBe('/devoluciones/r1/cierre');
  });

  it('badges de la bandeja segun DEV-01', () => {
    expect(RETURN_STATUS_LABELS.PROGRAMADA).toBe('Programada');
    expect(RETURN_STATUS_LABELS.RECEPCION_PROVISIONAL).toBe('Recepción');
    expect(RETURN_STATUS_LABELS.CON_DANOS).toBe('En evaluación');
    expect(RETURN_STATUS_LABELS.CIERRE_FINANCIERO).toBe('Financiero');
    expect(RETURN_STATUS_LABELS.CERRADA).toBe('Cerrada');
    expect(isReturnFinal('CERRADA')).toBe(true);
    expect(isReturnFinal('CON_DANOS')).toBe(false);
  });

  it('hoursSince calcula horas naturales', () => {
    const now = new Date('2026-10-05T10:00:00Z');
    expect(hoursSince('2026-10-04T10:00:00Z', now)).toBe(24);
    expect(hoursSince(null, now)).toBeNull();
  });
});

describe('return-permissions (espejo de return-role-policy.ts)', () => {
  it('sin rol conocido no oculta nada (decide el backend)', () => {
    expect(canReturnAction(null, 'CLOSE')).toBe(true);
  });

  it('respeta la politica del backend', () => {
    expect(canReturnAction(roleRef('CAMPO'), 'UPLOAD_EVIDENCE')).toBe(true);
    expect(canReturnAction(roleRef('CAMPO'), 'CLOSE')).toBe(false);
    expect(canReturnAction(roleRef('FRONT_OFFICE'), 'ASSESS_DAMAGE')).toBe(false);
    expect(canReturnAction(roleRef('GERENCIA'), 'ASSESS_DAMAGE')).toBe(true);
    expect(canReturnAction(roleRef('FINANZAS'), 'CLOSE_FINANCIAL')).toBe(true);
    expect(canReturnAction(roleRef('FINANZAS'), 'CLOSE')).toBe(false);
    expect(canReturnAction(roleRef('PLATFORM_ADMIN'), 'CLOSE')).toBe(true);
  });
});

describe('return-errors - cambios de contrato', () => {
  it('INCIDENT_STILL_OPEN (422) es el estado bloqueado y no se trata como expediente desactualizado', () => {
    const err = new ReturnCommandError(422, { code: 'INCIDENT_STILL_OPEN' });
    expect(isIncidentOpenError(err)).toBe(true);
    expect(isStaleReturnError(err)).toBe(false);
    expect(isStaleReturnError(new ReturnCommandError(409, { code: 'INCIDENT_STILL_OPEN' }))).toBe(false);
    expect(describeReturnError(err, 'fb')).toMatch(/incidencia/i);
  });

  it('MISSING_RESPONSIBILITY_DOCUMENT se explica en lenguaje de negocio', () => {
    const message = describeReturnError(new ReturnCommandError(422, { code: 'MISSING_RESPONSIBILITY_DOCUMENT' }), 'fb');
    expect(message).toMatch(/documento de responsabilidad/i);
    expect(message).not.toMatch(/MISSING_RESPONSIBILITY_DOCUMENT|422/);
  });

  it('solo Gerencia decide ante alcolimetro desfavorable', () => {
    expect(canReturnAction(roleRef('GERENCIA'), 'RESOLVE_ALCOHOL_ESCALATION')).toBe(true);
    expect(canReturnAction(roleRef('ADMINISTRACION'), 'RESOLVE_ALCOHOL_ESCALATION')).toBe(false);
    expect(canReturnAction(roleRef('CAMPO'), 'RESOLVE_ALCOHOL_ESCALATION')).toBe(false);
    expect(canReturnAction(null, 'RESOLVE_ALCOHOL_ESCALATION')).toBe(true);
  });
});

describe('return-financial - totales desde el expediente', () => {
  it('totaliza danos con monto y paralizacion; un daño tecnico sin monto no suma y queda abierto', () => {
    const damages = [damage(), damage({ id: 'd2', origin: 'TECHNICAL', severity: 'GRAVE', estimatedAmount: 1500 }), damage({ id: 'd3', origin: 'TECHNICAL', estimatedAmount: null })];
    expect(totalCharges(damages, [charge()])).toBe(1900);
    expect(hasGraveDamage(damages)).toBe(true);
    expect(damagesWithoutAmount(damages).map((d) => d.id)).toEqual(['d3']);
    expect(totalCharges([], [])).toBe(0);
    expect(hasGraveDamage([damage()])).toBe(false);
  });

  it('formatea moneda y nombres de paño', () => {
    expect(formatPen(1000)).toMatch(/S\/\s?1,000\.00/);
    expect(humanizeZoneCode('PUERTA_CONDUCTOR')).toBe('Puerta conductor');
  });
});

describe('return-session-draft - borradores de UI', () => {
  it('el documento de responsabilidad exige nombre, titular?, relacion si no es titular y firma', () => {
    const base = { ...EMPTY_RESPONSIBILITY_DOCUMENT, signerName: 'Maria', signatureData: 'data:image/png;base64,xx' };
    expect(isResponsibilityDocumentComplete(EMPTY_RESPONSIBILITY_DOCUMENT)).toBe(false);
    expect(isResponsibilityDocumentComplete(base)).toBe(false); // titular? sin responder
    expect(isResponsibilityDocumentComplete({ ...base, signerIsHolder: true })).toBe(true);
    expect(isResponsibilityDocumentComplete({ ...base, signerIsHolder: false })).toBe(false); // falta relacion
    expect(isResponsibilityDocumentComplete({ ...base, signerIsHolder: false, signerRelationToHolder: 'Hermano' })).toBe(true);
    expect(isResponsibilityDocumentComplete({ ...base, signerIsHolder: true, signatureData: '' })).toBe(false);
  });

  it('guarda y limpia el borrador del checklist por expediente', () => {
    clearReturnDrafts('t-1');
    expect(loadReturnChecklist('t-1').responsibilityDocument).toEqual(EMPTY_RESPONSIBILITY_DOCUMENT);
    saveReturnChecklist('t-1', { ...EMPTY_RETURN_CHECKLIST, fivDone: true });
    expect(loadReturnChecklist('t-1').fivDone).toBe(true);
    clearReturnDrafts('t-1');
    expect(loadReturnChecklist('t-1').fivDone).toBe(false);
  });
});
