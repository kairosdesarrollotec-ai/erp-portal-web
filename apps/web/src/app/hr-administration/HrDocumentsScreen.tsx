import { useState, type FormEvent } from 'react';
import { HrFrame } from './HrFrame';
import {
  confirmHrDocumentRead,
  listActiveHrDocuments,
  publishHrDocument,
  type HrDocument,
  type HrDocumentCategory,
} from './hr-client';
import { useHrPermissions } from './hr-permissions';
import { useHrCommand } from './useHrCommand';
import { useHrResource } from './useHrResource';
import { formatDate } from './hr-format';
import styles from './HrFlow.module.css';

const CATEGORY_LABELS: Record<HrDocumentCategory, string> = {
  REGULATION: 'Reglamento',
  POLICY: 'Política',
  FORMAT: 'Formato',
};

/**
 * HU-31: Documentación de Talento Humano con versión vigente.
 * Permite a los colaboradores consultar reglamentos, políticas y formatos vigentes,
 * confirmar su lectura de forma auditada, y a Gerencia General publicar o actualizar versiones.
 */
export function HrDocumentsScreen() {
  const { can } = useHrPermissions();
  const [selectedCategory, setSelectedCategory] = useState<HrDocumentCategory | 'ALL'>('ALL');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Formulario de publicación (Gerencia)
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<HrDocumentCategory>('REGULATION');
  const [fileUrl, setFileUrl] = useState('');
  const [publishSubmitted, setPublishSubmitted] = useState(false);

  const { state, data, context, reload, setData } = useHrResource<HrDocument[]>(
    (token, scope) => listActiveHrDocuments(token, scope),
    'hr-documents',
  );

  const command = useHrCommand({ context, reload });

  async function handlePublish(event: FormEvent) {
    event.preventDefault();
    setPublishSubmitted(true);
    if (!code.trim() || !title.trim() || !fileUrl.trim()) return;

    const res = await command.run(
      (token) =>
        publishHrDocument(token, {
          companyId: context!.companyId,
          code: code.trim().toUpperCase(),
          title: title.trim(),
          category,
          fileUrl: fileUrl.trim(),
        }),
      'No pudimos publicar el documento. Intenta de nuevo.',
    );

    if (res.ok) {
      await reload();
      setCode('');
      setTitle('');
      setFileUrl('');
      setPublishSubmitted(false);
      command.setNotice(`Documento «${res.value.title}» publicado como versión vigente v${res.value.version}.`);
    }
  }

  async function handleConfirmRead(doc: HrDocument) {
    setConfirmingId(doc.id);
    const res = await command.run(
      (token) => confirmHrDocumentRead(token, doc.id),
      'No pudimos registrar la confirmación de lectura. Intenta de nuevo.',
    );
    setConfirmingId(null);

    if (res.ok) {
      setData((current) =>
        (current ?? []).map((d) =>
          d.id === doc.id ? { ...d, hasRead: true, readAt: res.value.readAt } : d,
        ),
      );
      command.setNotice(`Lectura confirmada para «${doc.title}». Registro guardado en auditoría.`);
    }
  }

  const documents = (data ?? []).filter((doc) =>
    selectedCategory === 'ALL' ? true : doc.category === selectedCategory,
  );

  return (
    <HrFrame
      pageTitle="Documentos de Talento Humano"
      back={{ label: 'Volver a Personal', to: '/personal' }}
      context={context}
      state={state}
      hasData={!!data}
      subject="los documentos"
      busy={command.saving}
    >
      {command.notice && (
        <div className={styles.notice} role="status" data-testid="documents-notice">
          <p>{command.notice}</p>
        </div>
      )}
      {command.error && (
        <p className={styles.errorBanner} role="alert" data-testid="documents-error">
          {command.error}
        </p>
      )}

      {can('MANAGE_HR_DOCUMENTS') && (
        <section className={styles.card} aria-labelledby="publish-doc-title">
          <h2 id="publish-doc-title" className={styles.sectionTitle}>
            Publicar documento o nueva versión
          </h2>
          <p className={styles.hint}>
            Al publicar un documento con un código existente, la versión anterior se desactiva automáticamente y se incrementa el número de versión.
          </p>
          <form onSubmit={(e) => void handlePublish(e)} className={styles.formGrid}>
            <div>
              <label htmlFor="doc-code">Código único *</label>
              <input
                id="doc-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej. RIT, POL-SST, FMT-VAC"
                className={styles.input}
              />
              {publishSubmitted && !code.trim() && (
                <span className={styles.fieldError}>Ingresa el código del documento</span>
              )}
            </div>

            <div>
              <label htmlFor="doc-category">Categoría *</label>
              <select
                id="doc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as HrDocumentCategory)}
                className={styles.input}
              >
                <option value="REGULATION">Reglamento</option>
                <option value="POLICY">Política</option>
                <option value="FORMAT">Formato</option>
              </select>
            </div>

            <div>
              <label htmlFor="doc-title">Título del documento *</label>
              <input
                id="doc-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Reglamento Interno de Trabajo 2026"
                className={styles.input}
              />
              {publishSubmitted && !title.trim() && (
                <span className={styles.fieldError}>Ingresa el título</span>
              )}
            </div>

            <div>
              <label htmlFor="doc-url">URL del archivo / documento *</label>
              <input
                id="doc-url"
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://.../documento.pdf"
                className={styles.input}
              />
              {publishSubmitted && !fileUrl.trim() && (
                <span className={styles.fieldError}>Ingresa la URL del documento</span>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={command.saving}
                className={styles.primaryButton}
                data-testid="publish-doc-button"
              >
                {command.saving ? 'Publicando…' : 'Publicar versión vigente'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={styles.card} aria-labelledby="docs-list-title">
        <div className={styles.cardHeader}>
          <h2 id="docs-list-title" className={styles.sectionTitle}>
            Documentos institucionales vigentes
          </h2>
          <div className={styles.filterBar} role="group" aria-label="Filtrar por categoría">
            {(['ALL', 'REGULATION', 'POLICY', 'FORMAT'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                className={selectedCategory === cat ? styles.filterActive : styles.filterButton}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'ALL' ? 'Todos' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {documents.length === 0 ? (
          <p className={styles.emptyNotice}>No hay documentos vigentes en esta categoría.</p>
        ) : (
          <div className={styles.documentsGrid} data-testid="documents-list">
            {documents.map((doc) => (
              <article key={doc.id} className={styles.documentCard} data-testid={`doc-${doc.code}`}>
                <div className={styles.docHeader}>
                  <span className={`${styles.badge} ${styles.badgeInfo}`}>{CATEGORY_LABELS[doc.category]}</span>
                  <span className={styles.versionBadge}>v{doc.version}</span>
                </div>
                <h3 className={styles.docTitle}>{doc.title}</h3>
                <p className={styles.docCode}>Código: <strong>{doc.code}</strong></p>
                <p className={styles.docDate}>Publicado: {formatDate(doc.publishedAt)}</p>

                <div className={styles.docActions}>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkButton}
                  >
                    Ver documento
                  </a>

                  {doc.hasRead ? (
                    <span className={`${styles.badge} ${styles.badgeSuccess}`} data-testid={`read-status-${doc.id}`}>
                      ✓ Lectura confirmada {doc.readAt ? formatDate(doc.readAt) : ''}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={confirmingId === doc.id || command.saving}
                      onClick={() => void handleConfirmRead(doc)}
                      className={styles.secondaryButton}
                      data-testid={`confirm-read-${doc.id}`}
                    >
                      {confirmingId === doc.id ? 'Confirmando…' : 'Confirmar lectura'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </HrFrame>
  );
}
