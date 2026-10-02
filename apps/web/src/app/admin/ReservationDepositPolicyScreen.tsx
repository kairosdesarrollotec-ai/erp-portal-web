import { useState } from 'react';
import { useReservationDepositPolicy } from './useReservationDepositPolicy';
import { useContractTemplates } from './useContractTemplates';
import { AppHeader } from '../shared/AppHeader';
import styles from './ReservationDepositPolicyScreen.module.css';

/** Unico tipo de plantilla de contrato que existe hoy (ver domain/contract-template-type.ts del backend). */
const RENTAL_CONTRACT_TEMPLATE_TYPE = 'RENTAL_CONTRACT';

function formatAmount(amount: string, currency: string): string {
  return `${currency === 'PEN' ? 'S/' : currency} ${amount}`;
}

/**
 * ADM-03 - Catálogos y parámetros. Fuente: PANTALLAS-V2-B-SOPORTE.md.
 * Estados READY, DIRTY, SAVING (contrato punto 9). "Cambiar un parametro
 * contractual... requiere confirmacion explicita, mostrando desde
 * cuando aplica" (contrato punto 10) - se implementa como un paso de
 * revision antes de guardar.
 *
 * Correccion (oct 2026, a pedido de Russbel): el contrato UX de ADM-03
 * describe "monto de reserva, tarifas, plantillas y formatos" como
 * parte de UNA sola pantalla - el campo 6 lista "plantillas" junto al
 * monto de reserva, y el punto 8 (BR-DOC-002, "solo una version
 * contractual vigente a la vez") es justo la regla de negocio de las
 * plantillas de contrato. Hasta esta correccion, "Plantillas de
 * contrato" vivia como una pantalla propia y huerfana
 * (`/admin/plantillas-contrato`, `ContractTemplatesScreen`), nunca
 * enlazada desde el Tablero ni desde ningun otro lugar de la app -
 * Russbel la encontro solo por URL directa, y como su contexto de
 * empresa/sede nunca llegaba por navegacion, caia siempre en el flujo
 * de seleccion de empresa (TR-05) sin forma de volver. Se fusiona aqui,
 * como pide el contrato: plantillas de contrato pasa a ser una segunda
 * seccion de ADM-03, con el mismo backend que ya tenia
 * (`useContractTemplates`/`contract-templates-client.ts`, sin cambios).
 *
 * Alcance real, no sobre-declarado: tarifas y formatos siguen sin un
 * dato real ni un consumidor en el backend (las tarifas de Flota se
 * gestionan por vehiculo en FLO-02, no aqui - ver Plan Maestro seccion
 * 2.3). Esta pantalla gestiona los 2 parametros que si existen de
 * verdad: monto de reserva y plantillas de contrato.
 */
export function ReservationDepositPolicyScreen() {
  const { state, policy, saving, saveError, save } = useReservationDepositPolicy();
  const [mode, setMode] = useState<'VIEW' | 'EDIT' | 'CONFIRM'>('VIEW');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'PEN' | 'USD'>('PEN');

  const {
    state: templatesState,
    templates,
    saving: savingTemplate,
    saveError: templateSaveError,
    createVersion,
  } = useContractTemplates();
  const [confirmTemplateOpen, setConfirmTemplateOpen] = useState(false);

  const activeTemplate = templates.find((t) => t.status === 'ACTIVE');

  function startEdit() {
    if (!policy) return;
    setAmount(policy.current.amount);
    setCurrency(policy.current.currency as 'PEN' | 'USD');
    setMode('EDIT');
  }

  async function handleConfirm() {
    const ok = await save(amount, currency);
    if (ok) setMode('VIEW');
  }

  async function handleCreateTemplate() {
    const ok = await createVersion(RENTAL_CONTRACT_TEMPLATE_TYPE);
    if (ok) setConfirmTemplateOpen(false);
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Catálogos y parámetros" />

      <div className={styles.content}>
        {state === 'LOADING' && <p className={styles.statusText}>Cargando parámetros…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>No pudimos cargar los parámetros. Intenta de nuevo en unos segundos.</p>
        )}

        {state === 'READY' && policy && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Monto de reserva</h2>

            {mode === 'VIEW' && (
              <div className={styles.card}>
                <div className={styles.currentValue}>{formatAmount(policy.current.amount, policy.current.currency)}</div>
                <p className={styles.helperNote}>
                  Versión {policy.current.version}
                  {policy.current.effectiveFrom
                    ? ` — vigente desde ${new Date(policy.current.effectiveFrom).toLocaleString('es-PE')}`
                    : ' — valor por defecto (nunca se cambió desde Administración)'}
                  .
                </p>
                <button type="button" className={styles.primaryButton} onClick={startEdit}>
                  Cambiar
                </button>
              </div>
            )}

            {mode === 'EDIT' && (
              <div className={styles.card}>
                {saveError && <p className={styles.errorText}>{saveError}</p>}
                <label className={styles.field}>
                  <span>Nuevo monto</span>
                  <input
                    className={styles.input}
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span>Moneda</span>
                  <select
                    className={styles.input}
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value as 'PEN' | 'USD')}
                  >
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </label>
                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={!amount}
                    onClick={() => setMode('CONFIRM')}
                  >
                    Continuar
                  </button>
                  <button type="button" className={styles.linkButton} onClick={() => setMode('VIEW')}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {mode === 'CONFIRM' && (
              <div className={styles.card}>
                {saveError && <p className={styles.errorText}>{saveError}</p>}
                <p className={styles.confirmText}>
                  Vas a cambiar el monto de reserva de {formatAmount(policy.current.amount, policy.current.currency)} a{' '}
                  <strong>{formatAmount(amount, currency)}</strong>. Esto aplica de inmediato a las reservas nuevas — la
                  versión anterior (v{policy.current.version}) queda en el historial de auditoría, no se pierde.
                </p>
                <div className={styles.formActions}>
                  <button type="button" className={styles.primaryButton} disabled={saving} onClick={() => void handleConfirm()}>
                    {saving ? 'Guardando…' : 'Confirmar cambio'}
                  </button>
                  <button type="button" className={styles.linkButton} onClick={() => setMode('EDIT')}>
                    Volver
                  </button>
                </div>
              </div>
            )}

            <h2 className={styles.sectionTitle}>Historial de versiones</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Versión</th>
                  <th>Monto</th>
                  <th>Vigente desde</th>
                </tr>
              </thead>
              <tbody>
                {policy.history.map((item) => (
                  <tr key={item.version}>
                    <td>{item.version}</td>
                    <td>{formatAmount(item.amount, item.currency)}</td>
                    <td>{item.effectiveFrom ? new Date(item.effectiveFrom).toLocaleString('es-PE') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className={styles.sectionTitle}>Plantillas de contrato</h2>

            {templatesState === 'LOADING' && <p className={styles.statusText}>Cargando plantillas…</p>}

            {templatesState === 'RECOVERABLE_ERROR' && (
              <p className={styles.statusText}>No pudimos cargar las plantillas. Intenta de nuevo en unos segundos.</p>
            )}

            {templatesState === 'READY' && (
              <>
                <div className={styles.card}>
                  {templateSaveError && <p className={styles.errorText}>{templateSaveError}</p>}
                  {activeTemplate ? (
                    <p className={styles.helperNote}>
                      Versión {activeTemplate.version} — vigente desde{' '}
                      {new Date(activeTemplate.effectiveFrom).toLocaleString('es-PE')}. Es la que usa automáticamente la
                      formalización de contrato cuando no se indica una plantilla específica.
                    </p>
                  ) : (
                    <p className={styles.helperNote}>
                      No hay una plantilla vigente configurada — la formalización de contrato fallará hasta que se cree
                      una.
                    </p>
                  )}

                  {!confirmTemplateOpen && (
                    <button type="button" className={styles.primaryButton} onClick={() => setConfirmTemplateOpen(true)}>
                      Crear nueva versión
                    </button>
                  )}

                  {confirmTemplateOpen && (
                    <div className={styles.formActions}>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={savingTemplate}
                        onClick={() => void handleCreateTemplate()}
                      >
                        {savingTemplate ? 'Creando…' : 'Confirmar nueva versión'}
                      </button>
                      <button type="button" className={styles.linkButton} onClick={() => setConfirmTemplateOpen(false)}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Versión</th>
                      <th>Estado</th>
                      <th>Vigente desde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((item) => (
                      <tr key={item.id}>
                        <td>{item.type}</td>
                        <td>{item.version}</td>
                        <td>
                          <span className={item.status === 'ACTIVE' ? styles.badgeActive : styles.badgeRetired}>
                            {item.status === 'ACTIVE' ? 'Vigente' : 'Retirada'}
                          </span>
                        </td>
                        <td>{new Date(item.effectiveFrom).toLocaleString('es-PE')}</td>
                      </tr>
                    ))}
                    {templates.length === 0 && (
                      <tr>
                        <td colSpan={4} className={styles.helperNote}>
                          Todavía no hay plantillas creadas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}

            <p className={styles.helperNote}>
              Tarifas y formatos todavía no tienen datos reales — se agregan cuando exista ese módulo.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
