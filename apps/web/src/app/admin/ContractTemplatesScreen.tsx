import { useState } from 'react';
import { useContractTemplates } from './useContractTemplates';
import { AppHeader } from '../shared/AppHeader';
import styles from './ContractTemplatesScreen.module.css';

/** Unico tipo de plantilla de contrato que existe hoy (ver domain/contract-template-type.ts del backend). */
const RENTAL_CONTRACT_TEMPLATE_TYPE = 'RENTAL_CONTRACT';

/**
 * Administracion de plantillas de contrato (TDD-ALQ-001.md seccion 9.3 /
 * BR-DOC-002). Crear una version nueva retira automaticamente la version
 * ACTIVE previa del mismo tipo - solo puede haber 1 ACTIVE a la vez, y
 * formalize-contract la resuelve automaticamente cuando no se indica una
 * plantilla especifica.
 */
export function ContractTemplatesScreen() {
  const { state, templates, saving, saveError, createVersion } = useContractTemplates();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const active = templates.find((t) => t.status === 'ACTIVE');

  async function handleCreate() {
    const ok = await createVersion(RENTAL_CONTRACT_TEMPLATE_TYPE);
    if (ok) setConfirmOpen(false);
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Plantillas de contrato" />

      <div className={styles.content}>
        {state === 'LOADING' && <p className={styles.statusText}>Cargando plantillas…</p>}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>No pudimos cargar las plantillas. Intenta de nuevo en unos segundos.</p>
        )}

        {state === 'READY' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Plantilla vigente</h2>

            <div className={styles.card}>
              {saveError && <p className={styles.errorText}>{saveError}</p>}
              {active ? (
                <p className={styles.helperNote}>
                  Version {active.version} — vigente desde {new Date(active.effectiveFrom).toLocaleString('es-PE')}. Es la
                  que usa automaticamente la formalizacion de contrato cuando no se indica una plantilla especifica.
                </p>
              ) : (
                <p className={styles.helperNote}>
                  No hay una plantilla vigente configurada — la formalizacion de contrato fallara hasta que se cree una.
                </p>
              )}

              {!confirmOpen && (
                <button type="button" className={styles.primaryButton} onClick={() => setConfirmOpen(true)}>
                  Crear nueva version
                </button>
              )}

              {confirmOpen && (
                <div className={styles.formActions}>
                  <button type="button" className={styles.primaryButton} disabled={saving} onClick={() => void handleCreate()}>
                    {saving ? 'Creando…' : 'Confirmar nueva version'}
                  </button>
                  <button type="button" className={styles.primaryButton} disabled={saving} onClick={() => setConfirmOpen(false)}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <h2 className={styles.sectionTitle}>Historial de versiones</h2>
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
          </section>
        )}
      </div>
    </main>
  );
}
