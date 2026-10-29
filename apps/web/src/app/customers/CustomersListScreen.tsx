import { CUSTOMER_RISK_LABELS } from '../returns/return-status';
import { useState } from 'react';
import { Search, Pencil, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomersList } from './useCustomersList';
import { NewCustomerModal } from './NewCustomerModal';
import { AppHeader } from '../shared/AppHeader';
import { useRolePermissions } from '../shared/useRolePermissions';
import styles from './CustomersListScreen.module.css';
import { formatLimaDate } from '../shared/lima-time';

const RISK_SYMBOLS = { NORMAL: '●', AMBAR: '▲', ROJO: '■' } as const;

export function CustomersListScreen() {
  const navigate = useNavigate();
  const { can } = useRolePermissions();
  const canWrite = can('CUSTOMER', 'WRITE');
  const {
    state,
    customers,
    total,
    context,
    search,
    setSearch,
    creating,
    createError,
    duplicateCustomer,
    clearDuplicateCustomer,
    addCustomer,
    editingCustomer,
    startEditingCustomer,
    stopEditingCustomer,
    editCustomer,
    updating,
    updateError,
  } = useCustomersList();

  const [modalOpen, setModalOpen] = useState(false);

  function handleNewModalClose() {
    setModalOpen(false);
    clearDuplicateCustomer();
  }

  return (
    <main className={styles.wrapper}>
      <AppHeader
        pageTitle="Clientes"
        actions={
          context && canWrite ? (
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
                  <th>Semáforo</th>
                  <th>Fecha de registro</th>
                  <th aria-label="Acciones"></th>
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
                    <td data-testid={`customer-risk-${c.id}`} title={c.riskReason ?? undefined}>
                      <span aria-hidden="true">{RISK_SYMBOLS[c.riskStatus ?? 'NORMAL']}</span>{' '}
                      {CUSTOMER_RISK_LABELS[c.riskStatus ?? 'NORMAL']}
                      {c.riskStatus && c.riskStatus !== 'NORMAL' && (
                        <small data-testid={`customer-risk-reason-${c.id}`} style={{ display: 'block' }}>
                          {c.riskReason ?? 'Sin motivo registrado (anterior al registro de motivos)'}
                        </small>
                      )}
                    </td>
                    <td>{formatLimaDate(c.createdAt)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => navigate(`/clientes/${c.id}`, { state: context ?? undefined })}
                          aria-label={`Ver ficha de ${c.fullName}`}
                        >
                          <Eye size={14} />
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => startEditingCustomer(c)}
                            aria-label={`Editar cliente ${c.fullName}`}
                          >
                            <Pencil size={14} /> Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewCustomerModal
        isOpen={modalOpen}
        onClose={handleNewModalClose}
        onSubmit={addCustomer}
        loading={creating}
        error={createError}
        duplicateCustomer={duplicateCustomer}
        onViewExistingCustomer={(id) => navigate(`/clientes/${id}`)}
        onClearDuplicate={clearDuplicateCustomer}
      />

      <NewCustomerModal
        isOpen={editingCustomer !== null}
        onClose={stopEditingCustomer}
        onSubmit={editCustomer}
        loading={updating}
        error={updateError}
        mode="edit"
        initialData={
          editingCustomer
            ? {
                fullName: editingCustomer.fullName,
                documentType: editingCustomer.documentType,
                documentNumber: editingCustomer.documentNumber,
                nationality: editingCustomer.nationality ?? undefined,
                countryEntryDate: editingCustomer.countryEntryDate ?? undefined,
                email: editingCustomer.email ?? undefined,
                phone: editingCustomer.phone ?? undefined,
                address: editingCustomer.address ?? undefined,
              }
            : undefined
        }
      />
    </main>
  );
}
