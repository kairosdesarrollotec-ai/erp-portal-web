import { describe, it, expect } from 'vitest';
import { effectiveInquiryChannel } from './useNewInquiry';
import { fallbackRequiredDocuments, inquiryChannelLabel, requiredDocumentLabel, INQUIRY_CHANNEL_LABELS } from './inquiry-status';
import { inquiryCommandErrorMessage, InquiryCommandError } from './inquiries-client';
import { vehicleFitsParty } from './useInquiryVehicles';

describe('reglas de Consulta (decisiones 22-oct)', () => {
  it('modalidad PRESENCIAL envia el canal PRESENCIAL; VIRTUAL usa el canal elegido', () => {
    expect(effectiveInquiryChannel({ displayMode: 'PRESENCIAL', channel: 'WHATSAPP' })).toBe('PRESENCIAL');
    expect(effectiveInquiryChannel({ displayMode: 'VIRTUAL', channel: 'LLAMADA' })).toBe('LLAMADA');
    expect(effectiveInquiryChannel({ displayMode: 'VIRTUAL', channel: 'PRESENCIAL' })).toBe('WHATSAPP');
  });

  it('LLAMADA existe en las etiquetas y los canales se muestran legibles', () => {
    expect(INQUIRY_CHANNEL_LABELS.LLAMADA).toBe('Llamada');
    expect(inquiryChannelLabel('REDES')).toBe('Redes sociales');
    expect(inquiryChannelLabel(null)).toBe('Sin canal');
    expect(inquiryChannelLabel('OTRO')).toBe('OTRO');
  });

  it('documentos requeridos por nacionalidad', () => {
    expect(fallbackRequiredDocuments('PERUANO')).toContain('RECIBO_AGUA_O_LUZ');
    expect(fallbackRequiredDocuments('EXTRANJERO')).toContain('CONSTANCIA_HOSPEDAJE');
    expect(requiredDocumentLabel('CONSTANCIA_HOSPEDAJE')).toBe('Constancia de hospedaje');
  });

  it('solo se ofrecen vehiculos con capacidad >= personas; sin capacidad registrada no se descarta', () => {
    expect(vehicleFitsParty({ passengerCapacity: 5 }, 5)).toBe(true);
    expect(vehicleFitsParty({ passengerCapacity: 4 }, 5)).toBe(false);
    expect(vehicleFitsParty({ passengerCapacity: null }, 8)).toBe(true);
    expect(vehicleFitsParty({ passengerCapacity: 2 }, null)).toBe(true);
  });

  it('mensajes claros para RESERVATION_EXCEEDS_GUARANTEE e INQUIRY_*', () => {
    const exceeds = new InquiryCommandError(422, { code: 'RESERVATION_EXCEEDS_GUARANTEE', detail: 'tecnico' });
    expect(inquiryCommandErrorMessage(exceeds, 'x')).toMatch(/no puede superar la garantía/);
    expect(inquiryCommandErrorMessage(exceeds, 'x')).toMatch(/No existe saldo a favor/);
    const req = new InquiryCommandError(422, { code: 'INQUIRY_REQUIRED' });
    expect(inquiryCommandErrorMessage(req, 'x')).toMatch(/nace de una Consulta/);
    const other = new InquiryCommandError(422, { code: 'OTRO', detail: 'detalle backend' });
    expect(inquiryCommandErrorMessage(other, 'x')).toBe('detalle backend');
    expect(inquiryCommandErrorMessage(new Error('boom'), 'x')).toBe('boom');
  });
});
