import { useEffect, useMemo, useState } from 'react';
import { NotificationChannel } from './notification-templates-client';
import { useNotificationTemplates } from './useNotificationTemplates';
import { AppHeader } from '../shared/AppHeader';
import styles from './NotificationTemplatesScreen.module.css';

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  EMAIL: 'Correo',
  PUSH: 'Push',
  SMS: 'SMS',
};

/**
 * ADM-05 - Configuración de notificaciones. Fuente:
 * PANTALLAS-V2-B-SOPORTE.md. Editor de plantilla por evento (contrato
 * punto 6: texto + canal + vigencia), variables permitidas siempre
 * visibles junto al editor (criterio de aceptación punto 14: nunca
 * aparece `{dni_completo}` ni similares como opción - solo las que el
 * backend valida como seguras).
 *
 * Estados READY/DIRTY/SAVING (contrato punto 9): "Guardar plantilla" se
 * habilita solo si el texto o los canales cambiaron respecto a la
 * versión vigente.
 *
 * ALCANCE REAL (nota visible en pantalla, no oculta): esto guarda el
 * texto y canal(es) de la plantilla - no envía ninguna notificación
 * real todavía (TR-07, el envío real via outbox, sigue sin construirse).
 */
export function NotificationTemplatesScreen() {
  const { state, data, saving, saveError, save } = useNotificationTemplates();
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [draftChannels, setDraftChannels] = useState<NotificationChannel[]>([]);

  const selectedEntry = useMemo(
    () => data?.templates.find((t) => t.eventType === selectedEventType) ?? null,
    [data, selectedEventType],
  );

  useEffect(() => {
    if (data && !selectedEventType && data.templates.length > 0) {
      setSelectedEventType(data.templates[0].eventType);
    }
  }, [data, selectedEventType]);

  useEffect(() => {
    if (selectedEntry) {
      setDraftBody(selectedEntry.current?.body ?? '');
      setDraftChannels(selectedEntry.current?.channels ?? []);
    }
  }, [selectedEntry]);

  const dirty = useMemo(() => {
    if (!selectedEntry) return false;
    const currentBody = selectedEntry.current?.body ?? '';
    const currentChannels = selectedEntry.current?.channels ?? [];
    return (
      draftBody !== currentBody ||
      draftChannels.length !== currentChannels.length ||
      draftChannels.some((c) => !currentChannels.includes(c))
    );
  }, [selectedEntry, draftBody, draftChannels]);

  function toggleChannel(channel: NotificationChannel) {
    setDraftChannels((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]));
  }

  function insertVariable(variable: string) {
    setDraftBody((prev) => `${prev}{${variable}}`);
  }

  async function handleSave() {
    if (!selectedEventType) return;
    await save(selectedEventType, draftChannels, draftBody);
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Notificaciones" />

      <div className={styles.content}>
        <p className={styles.scopeNote}>
          Esta pantalla guarda el texto y el canal de cada plantilla - todavía no envía ninguna notificación real
          (el envío efectivo depende de una pieza de infraestructura que aún no está construida).
        </p>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando plantillas…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>No pudimos cargar las plantillas de notificación. Intenta de nuevo en unos segundos.</p>
        )}

        {state === 'READY' && data && (
          <div className={styles.layout}>
            <nav className={styles.eventList} aria-label="Eventos con plantilla">
              {data.templates.map((entry) => (
                <button
                  key={entry.eventType}
                  type="button"
                  className={entry.eventType === selectedEventType ? styles.eventItemActive : styles.eventItem}
                  onClick={() => setSelectedEventType(entry.eventType)}
                >
                  {entry.label}
                  {!entry.current && <span className={styles.emptyBadge}>Sin plantilla</span>}
                </button>
              ))}
            </nav>

            {selectedEntry && (
              <section className={styles.editor}>
                <h2 className={styles.editorTitle}>Plantilla: {selectedEntry.label}</h2>

                <label className={styles.field}>
                  <span>Texto de la plantilla</span>
                  <textarea
                    className={styles.textarea}
                    value={draftBody}
                    onChange={(event) => setDraftBody(event.target.value)}
                    rows={5}
                  />
                </label>

                <fieldset className={styles.channelGroup}>
                  <legend>Canal</legend>
                  {data.channels.map((channel) => (
                    <label key={channel} className={styles.channelOption}>
                      <input
                        type="checkbox"
                        checked={draftChannels.includes(channel)}
                        onChange={() => toggleChannel(channel)}
                      />
                      {CHANNEL_LABELS[channel]}
                    </label>
                  ))}
                </fieldset>

                <div className={styles.variables}>
                  <span className={styles.variablesLabel}>Variables permitidas</span>
                  <div className={styles.variableButtons}>
                    {data.allowedVariables.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        className={styles.variableButton}
                        onClick={() => insertVariable(variable)}
                      >
                        {`{${variable}}`}
                      </button>
                    ))}
                  </div>
                </div>

                {saveError && <p className={styles.errorText}>{saveError}</p>}

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleSave}
                    disabled={!dirty || saving || draftChannels.length === 0}
                  >
                    {saving ? 'Guardando…' : 'Guardar plantilla'}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
