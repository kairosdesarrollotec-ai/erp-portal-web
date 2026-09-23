import { useNavigate } from 'react-router-dom';
import { useNewInquiry } from './useNewInquiry';
import { INQUIRY_CHANNEL_LABELS } from './inquiry-status';
import styles from './NewInquiryScreen.module.css';

/**
 * CON-02 - Nueva Consulta. Fuente: PANTALLAS-V3-B-CONSULTA.md. Registra
 * canal, datos del cliente, necesidad de viaje y uso turistico. Revelado
 * progresivo: documento de hospedaje solo si nacionalidad = Extranjero
 * (punto 17). Si el uso turistico se rechaza, ofrece cierre inmediato en
 * vez de "Continuar" (caso de prueba obligatorio del TDD-CON-001).
 *
 * Hallazgo de revision PR#11 (Critico #2): el indicador ya no dice
 * "Guardado" a secas (podia leerse como "guardado en el servidor", que es
 * falso en este corte de HU-26) - dice "Guardado en este dispositivo",
 * que es lo que realmente ocurre (ver useNewInquiry.ts).
 */
export function NewInquiryScreen() {
  const { form, state, autosave, error, fieldErrors, updateForm, submit, closeWithoutTouristUse } = useNewInquiry();
  const navigate = useNavigate();

  const rejectsTouristUse = form.touristUse === false;
  const saving = state === 'SAVING';

  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.brand}>VeloxRent</span>
        <h1 className={styles.title}>Nueva Consulta</h1>
        {autosave !== 'idle' && (
          <span className={styles.autosave}>
            {autosave === 'saving' ? 'Guardando…' : 'Guardado en este dispositivo'}
          </span>
        )}
      </header>

      <div className={styles.content}>
        {error && <p className={styles.errorText}>{error}</p>}
        <p className={styles.helperNote}>
          El nombre, documento, nacionalidad, destino, fecha y personas se envían al registrar la consulta. La fecha
          de ingreso al país (clientes extranjeros) todavía no tiene un campo propio en este formulario.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Modalidad</h2>
          <div className={styles.chipGroup} role="radiogroup" aria-label="Modalidad de exhibición">
            {(['PRESENCIAL', 'VIRTUAL'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`${styles.chip} ${form.displayMode === mode ? styles.chipSelected : ''}`}
                aria-pressed={form.displayMode === mode}
                onClick={() => updateForm({ displayMode: mode })}
              >
                {mode === 'PRESENCIAL' ? 'Presencial' : 'Virtual'}
              </button>
            ))}
          </div>

          <label className={styles.field}>
            <span>Canal de contacto</span>
            <select
              className={styles.input}
              value={form.channel}
              onChange={(event) => updateForm({ channel: event.target.value as typeof form.channel })}
            >
              {Object.entries(INQUIRY_CHANNEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Datos del cliente</h2>
          <label className={styles.field}>
            <span>Nombre</span>
            <input
              className={styles.input}
              type="text"
              value={form.customerName}
              onChange={(event) => updateForm({ customerName: event.target.value })}
              aria-invalid={Boolean(fieldErrors.customerName)}
            />
            {fieldErrors.customerName && <span className={styles.fieldError}>{fieldErrors.customerName}</span>}
          </label>
          <label className={styles.field}>
            <span>Documento</span>
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              value={form.document}
              onChange={(event) => updateForm({ document: event.target.value })}
              aria-invalid={Boolean(fieldErrors.document)}
            />
            {fieldErrors.document && <span className={styles.fieldError}>{fieldErrors.document}</span>}
          </label>
          <label className={styles.field}>
            <span>Nacionalidad</span>
            <select
              className={styles.input}
              value={form.nationality}
              onChange={(event) => updateForm({ nationality: event.target.value as typeof form.nationality })}
            >
              <option value="PERUANO">Peruano</option>
              <option value="EXTRANJERO">Extranjero</option>
            </select>
          </label>

          {form.nationality === 'EXTRANJERO' && (
            <label className={`${styles.field} ${styles.revealed}`}>
              <span>Documento de hospedaje</span>
              <input
                className={styles.input}
                type="text"
                value={form.hospedajeDocument}
                onChange={(event) => updateForm({ hospedajeDocument: event.target.value })}
                aria-invalid={Boolean(fieldErrors.hospedajeDocument)}
              />
              {fieldErrors.hospedajeDocument && (
                <span className={styles.fieldError}>{fieldErrors.hospedajeDocument}</span>
              )}
            </label>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Necesidad de viaje</h2>
          <label className={styles.field}>
            <span>Destino</span>
            <input
              className={styles.input}
              type="text"
              value={form.destination}
              onChange={(event) => updateForm({ destination: event.target.value })}
              aria-invalid={Boolean(fieldErrors.destination)}
            />
            {fieldErrors.destination && <span className={styles.fieldError}>{fieldErrors.destination}</span>}
          </label>
          <label className={styles.field}>
            <span>Fecha</span>
            <input
              className={styles.input}
              type="date"
              value={form.travelDate}
              onChange={(event) => updateForm({ travelDate: event.target.value })}
              aria-invalid={Boolean(fieldErrors.travelDate)}
            />
            {fieldErrors.travelDate && <span className={styles.fieldError}>{fieldErrors.travelDate}</span>}
          </label>
          <label className={styles.field}>
            <span>Número de personas</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              value={form.travelers}
              onChange={(event) => updateForm({ travelers: Number(event.target.value) || 1 })}
            />
          </label>
          <label className={styles.field}>
            <span>Días estimados</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              value={form.travelDays}
              onChange={(event) => updateForm({ travelDays: Number(event.target.value) || 1 })}
            />
          </label>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Uso turístico</h2>
          <div className={styles.chipGroup} role="radiogroup" aria-label="¿El uso es turístico?">
            <button
              type="button"
              className={`${styles.chip} ${form.touristUse === true ? styles.chipSelected : ''}`}
              aria-pressed={form.touristUse === true}
              onClick={() => updateForm({ touristUse: true })}
            >
              Sí
            </button>
            <button
              type="button"
              className={`${styles.chip} ${form.touristUse === false ? styles.chipSelected : ''}`}
              aria-pressed={form.touristUse === false}
              onClick={() => updateForm({ touristUse: false })}
            >
              No
            </button>
          </div>

          {rejectsTouristUse && (
            <p className={styles.warningText}>
              El cliente no confirma uso turístico: esta consulta se cierra sin cotizar (no continúa a CON-03).
            </p>
          )}
        </section>

        <div className={styles.actions}>
          {rejectsTouristUse ? (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={saving}
              onClick={() => void closeWithoutTouristUse()}
            >
              {saving ? 'Cerrando…' : 'Cerrar consulta'}
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={saving || form.touristUse === null}
              onClick={() => void submit()}
            >
              {saving ? 'Guardando…' : 'Continuar'}
            </button>
          )}
          <button type="button" className={styles.secondaryButton} onClick={() => navigate('/consultas')}>
            Cerrar
          </button>
        </div>
      </div>
    </main>
  );
}
