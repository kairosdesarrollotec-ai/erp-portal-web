import { useState } from 'react';
import { Plus, AlertTriangle, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { AppHeader } from '../shared/AppHeader';
import { useWorkContextForAdmin } from './useWorkContextForAdmin';
import { useDocumentTemplates } from './useDocumentTemplates';
import { useDocumentTemplateWizard } from './useDocumentTemplateWizard';
import { DocumentTemplateWizard } from './DocumentTemplateWizard';
import type { TemplateType, TemplateResponse } from './document-templates-client';
import styles from './DocumentTemplatesScreen.module.css';
import { formatLimaDate } from '../shared/lima-time';

/**
 * ADM-03 — Gestión de plantillas de documentos (VeloxRent ERP).
 * PROTO-ID: PROTO-ADM-03-LISTA-DESKTOP (APPROVED 2026-10-09).
 * TDD-KAIROS-MVP-002-TPL v1.0.
 */

const TABS: { type: TemplateType; label: string }[] = [
  { type: 'RENTAL_CONTRACT', label: 'Contrato de alquiler (genérico)' },
  { type: 'RENTAL_CONTRACT_NATURAL', label: 'Alquiler: persona natural, sin conductor' },
  { type: 'RENTAL_CONTRACT_NATURAL_DRIVER', label: 'Alquiler: persona natural, con conductor' },
  { type: 'RENTAL_CONTRACT_LEGAL', label: 'Alquiler: persona jurídica, sin conductor' },
  { type: 'RENTAL_CONTRACT_LEGAL_DRIVER', label: 'Alquiler: persona jurídica, con conductor' },
  { type: 'RESERVATION_CONTRACT', label: 'Contrato de reserva' },
  { type: 'RETURN_RESPONSIBILITY', label: 'Responsabilidad por devolución' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return formatLimaDate(iso);
}

function TemplateBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return (
      <span className={styles.badgeActive}>
        <span className={styles.badgeDot} aria-hidden="true" />
        Vigente
      </span>
    );
  }
  if (status === 'DRAFT') {
    return <span className={styles.badgeDraft}>Borrador</span>;
  }
  return <span className={styles.badgeRetired}>Archivada</span>;
}

function TemplateCard({ template }: { template: TemplateResponse }) {
  const isActive = template.status === 'ACTIVE';
  const isDraft = template.status === 'DRAFT';

  return (
    <article
      className={isActive ? styles.cardActive : isDraft ? styles.cardDraft : styles.cardRetired}
      aria-label={`Plantilla: ${template.name}`}
    >
      <div className={styles.cardMain}>
        <div className={styles.cardInfo}>
          <div className={styles.cardTitleRow}>
            <FileText size={16} className={styles.cardFileIcon} aria-hidden="true" />
            <span className={isActive ? styles.cardTitleActive : styles.cardTitle}>{template.name}</span>
            <TemplateBadge status={template.status} />
            {template.version !== null && template.version !== undefined && (
              <span className={styles.versionBadge}>v{template.version}</span>
            )}
          </div>
          <div className={styles.cardMeta}>
            {template.documentFormat && (
              <span>
                Formato: <strong>{template.documentFormat}</strong>
              </span>
            )}
            {template.effectiveFrom && (
              <span>
                Vigente desde: <strong>{formatDate(template.effectiveFrom)}</strong>
              </span>
            )}
            {template.createdBy && (
              <span>
                Creado por: <strong>{template.createdBy}</strong>
              </span>
            )}
            <span>
              Creado: <strong>{formatDate(template.createdAt)}</strong>
            </span>
          </div>
        </div>
        <div className={styles.cardActions}>
          {isActive && (
            <span className={styles.inUseLabel} aria-label="Plantilla en uso activo">
              <CheckCircle size={14} />
              En uso
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function TabBadge({ templates, type }: { templates: TemplateResponse[]; type: TemplateType }) {
  const forType = templates.filter((t) => t.type === type);
  const hasActive = forType.some((t) => t.status === 'ACTIVE');
  if (hasActive) {
    return <span className={styles.tabBadgeActive}>1 vigente</span>;
  }
  if (forType.length > 0) {
    return <span className={styles.tabBadgeWarning}>Sin vigente</span>;
  }
  return null;
}

export function DocumentTemplatesScreen() {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const [activeTab, setActiveTab] = useState<TemplateType>('RENTAL_CONTRACT');

  const { data: allTemplates, isLoading, isError, refetch } = useDocumentTemplates({
    companyId: context?.companyId ?? null,
    branchId: context?.branchId ?? null,
  });

  const wizard = useDocumentTemplateWizard(
    context?.companyId ?? '',
    context?.branchId ?? '',
  );

  const tabTemplates = (allTemplates ?? []).filter((t) => t.type === activeTab);

  const contextReady = !contextLoading && context !== null;

  return (
    <main className={styles.wrapper}>
      <AppHeader pageTitle="Plantillas de documentos" />

      <div className={styles.content}>
        {/* Page title bar */}
        <div className={styles.titleBar}>
          <div className={styles.titleSection}>
            <div className={styles.titleRow}>
              <h1 className={styles.pageTitle}>Plantillas de documentos</h1>
              <span className={styles.moduleBadge}>Módulo Administración</span>
              <span className={styles.uxBadge}>ADM-03 / TPL</span>
            </div>
            <p className={styles.pageDescription}>
              Gestión de plantillas base para contratos de alquiler, reserva y documentos de responsabilidad. Una
              sola versión vigente por tipo y empresa.
            </p>
          </div>
          <div className={styles.titleActions}>
            {context && (
              <div className={styles.contextIndicator}>
                {context.companyName} — {context.branchName}
              </div>
            )}
            <button
              type="button"
              className={styles.primaryCta}
              onClick={wizard.open}
              disabled={!contextReady}
              aria-label="Crear nueva plantilla de documento"
            >
              <Plus size={14} aria-hidden="true" />
              Nueva plantilla
            </button>
          </div>
        </div>

        {/* Governance notice — TDD-TPL-ADR-003 */}
        <div className={styles.governanceNotice} role="note" aria-label="Aviso normativo">
          <AlertTriangle size={16} className={styles.governanceIcon} aria-hidden="true" />
          <div>
            <strong className={styles.governanceTitle}>Aviso normativo (TDD-TPL-ADR-003):</strong> Solo puede existir{' '}
            <strong>una única plantilla vigente</strong> por tipo y empresa en todo momento. Activar una nueva versión{' '}
            <strong>retira automáticamente</strong> la versión vigente actual. Esta acción queda registrada en
            auditoría.
          </div>
        </div>

        {/* Loading state */}
        {(contextLoading || (contextReady && isLoading)) && (
          <div className={styles.loadingState} role="status" aria-label="Cargando plantillas">
            <div className={styles.spinner} aria-hidden="true" />
            <span>Cargando plantillas…</span>
          </div>
        )}

        {/* Error state */}
        {!contextLoading && !isLoading && (isError || (!contextLoading && !context)) && (
          <div className={styles.errorState} role="alert">
            <AlertTriangle size={16} />
            <span>No se pudieron cargar las plantillas.</span>
            <button type="button" className={styles.retryButton} onClick={() => void refetch()}>
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        )}

        {/* Ready state */}
        {contextReady && !isLoading && !isError && allTemplates !== undefined && (
          <>
            {/* Type tabs */}
            <nav className={styles.tabs} aria-label="Tipos de plantilla">
              {TABS.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === type}
                  className={activeTab === type ? styles.tabActive : styles.tab}
                  onClick={() => setActiveTab(type)}
                >
                  <FileText size={15} aria-hidden="true" />
                  <span>{label}</span>
                  <TabBadge templates={allTemplates} type={type} />
                </button>
              ))}
            </nav>

            {/* Panel */}
            <section role="tabpanel" aria-label={`Plantillas de tipo ${activeTab}`}>
              {/* Summary line */}
              <div className={styles.panelSummaryLine}>
                <span className={styles.panelTypeLabel}>
                  Tipo: <strong>{activeTab}</strong>
                  {' · '}
                  {tabTemplates.filter((t) => t.status === 'ACTIVE').length} vigente(s)
                  {' · '}
                  {tabTemplates.filter((t) => t.status === 'DRAFT').length} borrador(es)
                  {' · '}
                  {tabTemplates.filter((t) => t.status === 'RETIRED').length} archivada(s)
                </span>
              </div>

              {/* Template list */}
              {tabTemplates.length > 0 ? (
                <div className={styles.templateList}>
                  {tabTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              ) : (
                /* Empty state */
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <FileText size={28} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className={styles.emptyTitle}>Sin plantilla de {TABS.find((t) => t.type === activeTab)?.label.toLowerCase()}</h3>
                    <p className={styles.emptyDescription}>
                      Esta empresa aún no tiene una plantilla vigente para este tipo. Crea una nueva plantilla y
                      súbela para activarla.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.primaryCta}
                    onClick={wizard.open}
                    aria-label="Crear primera plantilla de documento"
                  >
                    <Plus size={14} aria-hidden="true" />
                    Crear primera plantilla
                  </button>
                </div>
              )}

              {/* Footer summary bar */}
              <div className={styles.summaryBar}>
                <div className={styles.summaryBarLeft}>
                  {tabTemplates.some((t) => t.status === 'ACTIVE') ? (
                    <CheckCircle size={15} className={styles.summaryBarIconGreen} aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={15} className={styles.summaryBarIconAmber} aria-hidden="true" />
                  )}
                  <span>
                    {tabTemplates.filter((t) => t.status === 'ACTIVE').length} vigente(s) en producción
                    {tabTemplates.filter((t) => t.status === 'DRAFT').length > 0 &&
                      ` · ${tabTemplates.filter((t) => t.status === 'DRAFT').length} borrador(es) pendiente(s)`}
                    {tabTemplates.filter((t) => t.status === 'RETIRED').length > 0 &&
                      ` · ${tabTemplates.filter((t) => t.status === 'RETIRED').length} archivada(s)`}
                  </span>
                </div>
                <span className={styles.summaryBarRight}>
                  {activeTab} · {context?.companyName} {context?.branchName}
                </span>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Wizard modal */}
      {context && (
        <DocumentTemplateWizard
          wizard={wizard}
          companyName={context.companyName}
          branchName={context.branchName}
        />
      )}
    </main>
  );
}
