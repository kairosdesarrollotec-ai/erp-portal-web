import { useState } from 'react';
import type { ReturnReminderInboxItem } from './returns-types';
import { copyText, REMINDER_STATUS_LABELS, whatsappLink } from './return-reminders';
import { formatLimaDateTime } from '../shared/lima-time';
import styles from './ReturnAlerts.module.css';

interface CardProps {
  item: ReturnReminderInboxItem;
  canRegister: boolean;
  busy: boolean;
  errorMessage: string | null;
  onRegister: (item: ReturnReminderInboxItem, input: { result: 'SENT' | 'FAILED'; note?: string }) => Promise<boolean>;
}

const NOTE_MAX = 500;

/**
 * DEV-01 / BR-DEV-004 - tarjeta de un recordatorio. El envio por WhatsApp es MANUAL-ASISTIDO: el operador copia el
 * texto (o abre wa.me), lo envia por su cuenta y aqui registra el resultado. Un SENT es definitivo. Un FAILED solo se registra (BR-DEV-004): no hay escalamiento ni reintento automatico.
 *
 * Prototipo(s) aprobado(s): PROTO-DEV-01-BANDEJA y PROTO-DEV-02-RECORDATORIO-Y-RECEPCION (sin variante propia de la
 * tarjeta: se reutilizan los estilos de banner/tarjeta del modulo).
 */
export function ReturnReminderCard({ item, canRegister, busy, errorMessage, onRegister }: CardProps) {
  const { reminder } = item;
  const [copied, setCopied] = useState<'ok' | 'error' | null>(null);
  const [failing, setFailing] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(false);

  const link = whatsappLink(item.customerPhone, reminder.text);
  const final = reminder.status === 'SENT';
  const who = [item.vehiclePlate, item.customerName].filter(Boolean).join(' · ') || 'Devolución';

  async function handleCopy() {
    setCopied((await copyText(reminder.text)) ? 'ok' : 'error');
  }

  async function handleFail() {
    if (!note.trim()) {
      setNoteError(true);
      return;
    }
    setNoteError(false);
    const ok = await onRegister(item, { result: 'FAILED', note: note.trim() });
    if (ok) {
      setFailing(false);
      setNote('');
    }
  }

  return (
    <article className={styles.card} aria-label={`Recordatorio ${who}`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{who}</span>
        <span className={`${styles.badge} ${styles[`badge_${reminder.status}`] ?? ''}`}>{REMINDER_STATUS_LABELS[reminder.status]}</span>
      </div>
      <p className={styles.meta}>
        Devolución pactada: {formatLimaDateTime(item.scheduledAt)} · Enviar antes de: {formatLimaDateTime(reminder.dueAt)}
        {item.customerPhone ? ` · Tel. ${item.customerPhone}` : ' · Sin teléfono registrado'}
      </p>
      <p className={styles.message} data-testid="reminder-text">
        {reminder.text}
      </p>

      {reminder.status === 'FAILED' && reminder.note && <p className={styles.meta}>Último intento fallido: {reminder.note}</p>}
      {final && reminder.sentAt && <p className={styles.meta}>Enviado el {formatLimaDateTime(reminder.sentAt)}.</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={() => void handleCopy()}>
          Copiar mensaje
        </button>
        {link ? (
          <a className={styles.secondaryButton} href={link} target="_blank" rel="noopener noreferrer">
            Abrir en WhatsApp
          </a>
        ) : (
          <span className={styles.meta}>Sin teléfono: copia el mensaje y envíalo por otro medio.</span>
        )}
        {canRegister && !final && (
          <>
            <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => void onRegister(item, { result: 'SENT' })}>
              Marcar enviado
            </button>
            <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => setFailing((v) => !v)}>
              Marcar fallido
            </button>
          </>
        )}
      </div>
      {copied === 'ok' && (
        <p className={styles.meta} role="status">
          Mensaje copiado.
        </p>
      )}
      {copied === 'error' && (
        <p className={styles.error} role="alert">
          No pudimos copiar el mensaje. Selecciónalo y cópialo a mano.
        </p>
      )}

      {canRegister && !final && failing && (
        <div className={styles.failForm}>
          <label htmlFor={`reminder-note-${item.returnId}`}>Motivo del fallo (obligatorio)</label>
          <textarea
            id={`reminder-note-${item.returnId}`}
            className={styles.textarea}
            maxLength={NOTE_MAX}
            value={note}
            aria-invalid={noteError}
            onChange={(e) => setNote(e.target.value)}
          />
          {noteError && (
            <span className={styles.error} role="alert">
              Indica el motivo del fallo.
            </span>
          )}
          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => void handleFail()}>
              Confirmar fallo
            </button>
            <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => setFailing(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {errorMessage && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}
    </article>
  );
}

interface PanelProps {
  items: ReturnReminderInboxItem[];
  loading: boolean;
  loadError: boolean;
  busyId: string | null;
  actionError: { returnId: string; message: string } | null;
  canRegister: boolean;
  onRegister: CardProps['onRegister'];
}

export function ReturnRemindersPanel({ items, loading, loadError, busyId, actionError, canRegister, onRegister }: PanelProps) {
  if (!loading && !loadError && items.length === 0) return null;
  return (
    <section aria-labelledby="return-reminders-title" className={styles.section}>
      <h2 id="return-reminders-title" className={styles.sectionTitle}>
        Recordatorios de devolución
      </h2>
      {loadError && (
        <p className={styles.error} role="alert">
          No pudimos cargar los recordatorios. La bandeja sigue disponible.
        </p>
      )}
      {loading && items.length === 0 && <p className={styles.statusText}>Cargando recordatorios…</p>}
      {items.map((item) => (
        <ReturnReminderCard
          key={item.returnId}
          item={item}
          canRegister={canRegister}
          busy={busyId === item.returnId}
          errorMessage={actionError?.returnId === item.returnId ? actionError.message : null}
          onRegister={onRegister}
        />
      ))}
    </section>
  );
}
