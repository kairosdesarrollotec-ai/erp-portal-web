import type { ReturnReminderStatus } from './returns-types';

export const REMINDER_STATUS_LABELS: Record<ReturnReminderStatus, string> = {
  PENDING: 'Pendiente de envío',
  SENT: 'Enviado',
  FAILED: 'Envío fallido',
};

/**
 * Telefono para wa.me: solo digitos con codigo de pais. Un celular peruano de 9 digitos (9XXXXXXXX)
 * se completa con el prefijo 51. `null` si no hay telefono utilizable.
 */
export function whatsappPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '').replace(/^00/, '');
  if (digits.length < 8) return null;
  if (digits.length === 9 && digits.startsWith('9')) return `51${digits}`;
  return digits;
}

/** Enlace `https://wa.me/<telefono>?text=<mensaje>`; `null` si no hay telefono. */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const normalized = whatsappPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

/** Copia al portapapeles; con fallback a `execCommand` cuando la API moderna no esta disponible. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // cae al fallback
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
