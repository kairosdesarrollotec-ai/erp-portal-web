import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Pencil } from 'lucide-react';
import { useCustomerDetail } from './useCustomerDetail';
import { NewCustomerModal } from './NewCustomerModal';
import type { CustomerFormData } from './useCustomersList';
import styles from './CustomerDetailScreen.module.css';

/**
 * CLI-02 — Ficha 360 del cliente.
 * Prototipo: PROTO-CLI-02-FICHA-360-CLIENTE (estado READY, 1440px).
 *
 * Secciones de semáforo de riesgo, documentos adjuntos e historial de
 * alquileres/reservas requieren endpoints no disponibles en customers.yaml v0.1.0.
 * Se muestran como placeholders hasta que dichos módulos existan.
 */

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function CustomerDetailScreen() {
  const navigate = useNavigate();
  const { state, customer, context, editSubmitting, editErrorMessage, editCustomer, reload } =
    useCustomerDetail();

  const [editModalOpen, setEditModalOpen] = useState(false);

  async function handleEditSubmit(data: CustomerFormData): Promise<boolean> {
    const ok = await editCustomer(data);
    if (ok) setEditModalOpen(false);
    return ok;
  }

  if (state === 'LOADING') {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>Cargando ficha del cliente…</p>
      </main>
    );
  }

  if (state === 'FORBIDDEN') {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>No tienes permisos para ver este cliente.</p>
        <div className={styles.statusActions}>
          <button type="button" className={styles.linkButton} onClick={() => navigate('/clientes')}>
            Volver a Clientes
          </button>
        </div>
      </main>
    );
  }

  if (state === 'RECOVERABLE_ERROR' || !customer) {
    return (
      <main className={styles.wrapper}>
        <p className={styles.statusText}>No pudimos cargar la ficha de este cliente.</p>
        <div className={styles.statusActions}>
          <button type="button" className={styles.retryButton} onClick={reload}>
            Reintentar
          </button>
          <button type="button" className={styles.linkButton} onClick={() => navigate('/clientes')}>
            Volver a Clientes
          </button>
        </div>
      </main>
    );
  }

  const initials = getInitials(customer.fullName);

  return (
    <main className={styles.wrapper}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/clientes', { state: context ?? undefined })}
          aria-label="Volver a la bandeja de clientes"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Volver a Clientes
        </button>
        <div className={styles.topBarDivider} aria-hidden="true" />
        <span className={styles.topBarMeta}>
          {customer.documentType}: <strong>{customer.documentNumber}</strong>
        </span>
        <div className={styles.topBarActions}>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => setEditModalOpen(true)}
          >
            <Pencil size={13} aria-hidden="true" />
            Editar datos
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Header card */}
        <div className={styles.headerCard}>
          <div className={styles.headerMain}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatar} aria-hidden="true">
                {initials}
              </div>
            </div>
            <div className={styles.headerInfo}>
              <h1 className={styles.customerName}>{customer.fullName}</h1>
              <div className={styles.headerMeta}>
                <span>
                  <span className={styles.metaLabel}>{customer.documentType}:</span>{' '}
                  <strong className={styles.metaValue}>{customer.documentNumber}</strong>
                </span>
                {customer.phone && (
                  <>
                    <span className={styles.metaDot}>•</span>
                    <span>
                      <span className={styles.metaLabel}>Celular:</span>{' '}
                      <strong className={styles.metaValue}>{customer.phone}</strong>
                    </span>
                  </>
                )}
                {customer.email && (
                  <>
                    <span className={styles.metaDot}>•</span>
                    <span className={styles.metaValue}>{customer.email}</span>
                  </>
                )}
                {customer.nationality && (
                  <>
                    <span className={styles.metaDot}>•</span>
                    <span className={styles.metaLabel}>
                      {customer.nationality === 'EXTRANJERO' ? 'Extranjero' : 'Peruano'}
                    </span>
                  </>
                )}
              </div>
              {customer.address && (
                <p className={styles.headerAddress}>{customer.address}</p>
              )}
            </div>
          </div>

          <div className={styles.headerFooter}>
            <span className={styles.footerMeta}>
              Registrado el{' '}
              <strong>{new Date(customer.createdAt).toLocaleDateString('es-PE')}</strong>
            </span>
            {customer.updatedAt !== customer.createdAt && (
              <span className={styles.footerMeta}>
                Última actualización:{' '}
                <strong>{new Date(customer.updatedAt).toLocaleDateString('es-PE')}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Placeholders for sections not available in customers.yaml v0.1.0 */}
        <div className={styles.placeholderSection} aria-label="Semáforo de riesgo no disponible">
          <p className={styles.placeholderTitle}>Semáforo de riesgo crediticio</p>
          <p className={styles.placeholderDesc}>
            Disponible cuando exista el módulo de calificación de riesgo con sus endpoints en customers.yaml.
          </p>
        </div>

        <div className={styles.placeholderSection} aria-label="Documentos del cliente no disponibles">
          <p className={styles.placeholderTitle}>Documentos del cliente</p>
          <p className={styles.placeholderDesc}>
            Disponible cuando exista el módulo de documentos adjuntos con sus endpoints en customers.yaml.
          </p>
        </div>

        <div className={styles.placeholderSection} aria-label="Historial de alquileres no disponible">
          <p className={styles.placeholderTitle}>Historial de alquileres y reservas</p>
          <p className={styles.placeholderDesc}>
            Disponible cuando exista el módulo de historial con sus endpoints en customers.yaml.
          </p>
        </div>
      </div>

      {/* Edit modal */}
      <NewCustomerModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        loading={editSubmitting}
        error={editErrorMessage}
        mode="edit"
        initialData={
          customer
            ? {
                fullName: customer.fullName,
                documentType: customer.documentType,
                documentNumber: customer.documentNumber,
                nationality: customer.nationality ?? undefined,
                countryEntryDate: customer.countryEntryDate
                  ? new Date(customer.countryEntryDate).toISOString().split('T')[0]
                  : undefined,
                email: customer.email ?? undefined,
                phone: customer.phone ?? undefined,
                address: customer.address ?? undefined,
              }
            : undefined
        }
      />
    </main>
  );
}
