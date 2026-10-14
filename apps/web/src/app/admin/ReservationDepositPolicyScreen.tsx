import { useState } from 'react';
import { useReservationDepositPolicy } from './useReservationDepositPolicy';
import { AppHeader } from '../shared/AppHeader';
import styles from './ReservationDepositPolicyScreen.module.css';
import { formatLimaDateTime } from '../shared/lima-time';

function formatAmount(amount: string, currency: string): string {
  return `${currency === 'PEN' ? 'S/' : currency} ${amount}`;
}

/**
 * ADM-03 (parámetros) — monto de reserva.
 * TPL-TODO-002: la gestión de plantillas de documentos se migró al módulo
 * independiente en /admin/plantillas (DocumentTemplatesScreen, ADM-03 plantillas).
 */
export function ReservationDepositPolicyScreen() {
  const { state, policy, saving, saveError, save } = useReservationDepositPolicy();
  const [mode, setMode] = useState<'VIEW' | 'EDIT' | 'CONFIRM'>('VIEW');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'PEN' | 'USD'>('PEN');

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
                    ? ` — vigente desde ${formatLimaDateTime(policy.current.effectiveFrom)}`
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
                    <td>{item.effectiveFrom ? formatLimaDateTime(item.effectiveFrom) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className={styles.sectionTitle}>Plantillas de documentos</h2>
            <p className={styles.helperNote}>
              Las plantillas de contrato se gestionan en{' '}
              <a href="/admin/plantillas" className={styles.linkButton}>
                Gestión de plantillas
              </a>
              .
            </p>

            <p className={styles.helperNote}>
              Tarifas y formatos todavía no tienen datos reales — se agregan cuando exista ese módulo.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
