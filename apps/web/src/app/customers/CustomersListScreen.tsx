import { useState } from 'react';
import { Search } from 'lucide-react';
import { useCustomersList } from './useCustomersList';
import { NewCustomerModal } from './NewCustomerModal';
import { AppHeader } from '../shared/AppHeader';
import styles from './CustomersListScreen.module.css';

export function CustomersListScreen() {
  const {
    state,
    customers,
    total,
    context,
    search,
    setSearch,
    creating,
    createError,
    addCustomer,
  } = useCustomersList();

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className={styles.wrapper}>
      <AppHeader
        pageTitle="Clientes"
        actions={
          context ? (
            <button
              type="button"
              className={styles.newButton}
              onClick={() => setModalOpen(true)}
            >
              Nuevo Cliente
            </button>
          ) : undefined
        }
      />

      <div className={styles.content}>
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Buscar por nombre, documento o teléfono…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar clientes"
            />
          </div>
          {state === 'READY' && (
            <span className={styles.countText}>
              {total} {total === 1 ? 'cliente registrado' : 'clientes registrados'}
            </span>
          )}
        </div>

        {state === 'LOADING' && <p className={styles.statusText}>Cargando clientes…</p>}

        {state === 'FORBIDDEN' && (
          <p className={styles.statusText}>
            No tienes permisos para ver el directorio de clientes de esta sede o empresa.
          </p>
        )}

        {state === 'RECOVERABLE_ERROR' && (
          <p className={styles.statusText}>
            No pudimos cargar la lista de clientes. Intenta de nuevo en unos segundos.
          </p>
        )}

        {state === 'EMPTY' && (
          <p className={styles.statusText}>
            {search.trim()
              ? 'No se encontraron clientes que coincidan con la búsqueda.'
              : 'Todavía no hay clientes registrados en esta empresa.'}
          </p>
        )}

        {state === 'READY' && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Nacionalidad</th>
                  <th>Fecha de registro</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className={styles.customerName}>{c.fullName}</span>
                      {c.address && <div className={styles.textMuted}>{c.address}</div>}
                    </td>
                    <td>
                      <span className={styles.docBadge}>{c.documentType}</span>
                      <span>{c.documentNumber}</span>
                    </td>
                    <td>
                      {c.phone && <div>{c.phone}</div>}
                      {c.email && <div className={styles.textMuted}>{c.email}</div>}
                      {!c.phone && !c.email && <span className={styles.textMuted}>—</span>}
                    </td>
                    <td>
                      {c.nationality === 'EXTRANJERO' ? (
                        <span>
                          Extranjero
                          {c.countryEntryDate && (
                            <span className={styles.textMuted}> (Ingreso: {c.countryEntryDate})</span>
                          )}
                        </span>
                      ) : (
                        <span>Peruano</span>
                      )}
                    </td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewCustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={addCustomer}
        loading={creating}
        error={createError}
      />
    </main>
  );
}
