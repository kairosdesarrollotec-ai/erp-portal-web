import { useNavigate } from 'react-router-dom';
import { useNewInquiry } from './useNewInquiry';
import { INQUIRY_CHANNEL_LABELS, fallbackRequiredDocuments, requiredDocumentLabel } from './inquiry-status';
import { AppHeader } from '../shared/AppHeader';
import { NewCustomerModal } from '../customers/NewCustomerModal';
import styles from './NewInquiryScreen.module.css';
import { limaToday } from '../shared/lima-time';

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
  const {
    form,
    state,
    autosave,
    error,
    fieldErrors,
    updateForm,
    submit,
    closeWithoutTouristUse,
    customerSearchQuery,
    setCustomerSearchQuery,
    customerSearchResults,
    searchingCustomers,
    selectCustomer,
    clearSelectedCustomer,
    isNewCustomerModalOpen,
    modalLoading,
    modalError,
    openNewCustomerModal,
    closeNewCustomerModal,
    handleCreateCustomer,
  } = useNewInquiry();
  const navigate = useNavigate();

  const rejectsTouristUse = form.touristUse === false;
  const saving = state === 'SAVING';
  // Fecha minima del selector nativo = hoy, para no dejar elegir una fecha
  // pasada. No reemplaza la validacion de submit (inquiries-validation.ts):
  // el valor se puede pegar/editar a mano y saltarse el `min` del input.
  const todayISODate = limaToday();

  return (
    <main className={styles.wrapper}>
      <AppHeader
        pageTitle="Nueva Consulta"
        actions={
          autosave !== 'idle' ? (
            <span className={styles.autosave}>
              {autosave === 'saving' ? 'Guardando…' : 'Guardado en este dispositivo'}
            </span>
          ) : undefined
        }
      />

      <div className={styles.content}>
        {error && <p className={styles.errorText}>{error}</p>}

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

          {/*
           * Rediseño CON-02: "canal de contacto" (WhatsApp/Redes/etc, como
           * llego el cliente) solo aplica cuando la modalidad es VIRTUAL -
           * en modalidad PRESENCIAL el cliente ya esta frente al asesor y
           * el campo no tiene sentido (confirmado con inquiry-status.ts:
           * `channel` y `displayMode` son datos distintos, este cambio
           * solo afecta cuando se pide el primero, no el significado de
           * ninguno de los dos).
           */}
          {form.displayMode === 'VIRTUAL' && (
            <label className={styles.field}>
              <span>Canal de contacto</span>
              <select
                className={styles.input}
                value={form.channel}
                onChange={(event) => updateForm({ channel: event.target.value as typeof form.channel })}
              >
                {Object.entries(INQUIRY_CHANNEL_LABELS)
                  .filter(([value]) => value !== 'PRESENCIAL')
                  .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Datos del cliente</h2>
            <button
              type="button"
              className={styles.newCustomerButton}
              onClick={openNewCustomerModal}
            >
              + Registrar nuevo cliente
            </button>
          </div>

          {form.customerId ? (
            <div className={styles.selectedCustomerBox}>
              <div className={styles.selectedCustomerInfo}>
                <span className={styles.selectedCustomerBadge}>Cliente vinculado</span>
                <strong className={styles.selectedCustomerName}>{form.customerName}</strong>
                <span className={styles.selectedCustomerDoc}>
                  {form.documentType}: {form.document} ({form.nationality})
                </span>
              </div>
              <button
                type="button"
                className={styles.deselectCustomerButton}
                onClick={clearSelectedCustomer}
                aria-label="Desvincular cliente"
              >
                Desvincular
              </button>
            </div>
          ) : (
            <div className={styles.customerSearchContainer}>
              <label className={styles.field}>
                <span>Buscar cliente registrado</span>
                <input
                  className={styles.input}
                  type="search"
                  placeholder="Buscar por nombre o número de documento…"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  aria-label="Buscar cliente existente"
                />
              </label>
              {searchingCustomers && (
                <span className={styles.searchLoading}>Buscando clientes…</span>
              )}
              {customerSearchResults.length > 0 && (
                <ul className={styles.customerSearchResults} role="listbox" aria-label="Clientes encontrados">
                  {customerSearchResults.map((cust) => (
                    <li
                      key={cust.id}
                      className={styles.customerSearchResultItem}
                      role="option"
                      aria-selected={false}
                      tabIndex={0}
                      onClick={() => selectCustomer(cust)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectCustomer(cust);
                        }
                      }}
                    >
                      <div className={styles.customerResultName}>{cust.fullName}</div>
                      <div className={styles.customerResultMeta}>
                        {cust.documentType}: {cust.documentNumber} · {cust.nationality ?? 'PERUANO'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/*
           * Rediseño CON-02: Nombre/Tipo de documento/Numero de
           * documento/Nacionalidad ya no se capturan a mano aqui - esa
           * identidad vive en el modulo Clientes (busqueda de cliente
           * existente arriba, o "+ Registrar nuevo cliente"). Decision de
           * negocio (a confirmar con el usuario, ver reporte): sin estos
           * campos manuales ya no existe forma de capturar un "prospecto"
           * suelto, asi que ahora SIEMPRE se exige un cliente vinculado
           * (buscado o recien creado) antes de poder continuar - antes se
           * permitia registrar la consulta sin cliente formal via
           * `prospect`. Ver fieldErrors.customerId mas abajo.
           */}
          {fieldErrors.customerId && form.customerRiskStatus !== 'ROJO' && (
            <span className={styles.fieldError}>{fieldErrors.customerId}</span>
          )}
          {form.customerId && form.customerRiskStatus === 'ROJO' && (
            <span className={styles.fieldError} role="alert" data-testid="customer-rojo-block">
              El cliente está en estado ROJO: no se atiende en ningún proceso (consulta, reserva ni alquiler). Elige otro cliente.
            </span>
          )}

          {form.customerId && (
            <div className={`${styles.field} ${styles.revealed}`} data-testid="required-documents">
              <span>
                Documentos que se pedirán al alquilar ({form.nationality === 'EXTRANJERO' ? 'cliente extranjero' : 'cliente peruano'})
              </span>
              <ul>
                {fallbackRequiredDocuments(form.nationality).map((code) => (
                  <li key={code}>{requiredDocumentLabel(code)}</li>
                ))}
              </ul>
            </div>
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
              min={todayISODate}
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
              onChange={(event) => updateForm({ travelers: Number(event.target.value) })}
              aria-invalid={Boolean(fieldErrors.travelers)}
            />
            {fieldErrors.travelers && <span className={styles.fieldError}>{fieldErrors.travelers}</span>}
          </label>
          <label className={styles.field}>
            <span>Días estimados</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              value={form.travelDays}
              onChange={(event) => updateForm({ travelDays: Number(event.target.value) })}
              aria-invalid={Boolean(fieldErrors.travelDays)}
            />
            {fieldErrors.travelDays && <span className={styles.fieldError}>{fieldErrors.travelDays}</span>}
          </label>
          <label className={styles.field}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isDirtRoad}
                onChange={(event) => updateForm({ isDirtRoad: event.target.checked })}
              />
              Trocha / afirmado (ruta no asfaltada)
            </span>
          </label>
          <div className={styles.field}>
            <span>Plan tarifario deseado</span>
            <div className={styles.chipGroup} role="radiogroup" aria-label="Plan tarifario deseado">
              {(['NORMAL', 'PLUS', 'LIBRE'] as const).map((planKey) => (
                <button
                  key={planKey}
                  type="button"
                  className={`${styles.chip} ${form.plan === planKey ? styles.chipSelected : ''}`}
                  aria-pressed={form.plan === planKey}
                  onClick={() => updateForm({ plan: planKey })}
                >
                  {planKey === 'NORMAL' ? 'Normal' : planKey === 'PLUS' ? 'Plus' : 'Libre'}
                </button>
              ))}
            </div>
          </div>
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
              Por políticas de cobertura de seguros y términos de servicio de la flota, el alquiler está destinado exclusivamente a uso turístico. Al indicar que no tiene fin turístico, la consulta se registrará como cerrada sin cotización comercial.
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

      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={closeNewCustomerModal}
        onSubmit={handleCreateCustomer}
        loading={modalLoading}
        error={modalError}
      />
    </main>
  );
}
