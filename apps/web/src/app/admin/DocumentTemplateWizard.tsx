import { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, CheckCircle, AlertTriangle, Upload, FileText, ChevronRight } from 'lucide-react';
import type { TemplateType } from './document-templates-client';
import type { useDocumentTemplateWizard } from './useDocumentTemplateWizard';
import styles from './DocumentTemplateWizard.module.css';

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  RENTAL_CONTRACT: 'Contrato de alquiler',
  RESERVATION_CONTRACT: 'Contrato de reserva',
  RETURN_RESPONSIBILITY: 'Documento de responsabilidad',
};

const step1Schema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio.')
    .max(200, 'Máximo 200 caracteres.'),
  type: z.enum(['RENTAL_CONTRACT', 'RESERVATION_CONTRACT', 'RETURN_RESPONSIBILITY'], {
    errorMap: () => ({ message: 'Selecciona un tipo de plantilla.' }),
  }),
  effectiveFrom: z.string().optional(),
});

type Step1Fields = z.infer<typeof step1Schema>;

interface Props {
  wizard: ReturnType<typeof useDocumentTemplateWizard>;
  companyName: string;
  branchName: string;
}

function StepIndicator({
  index,
  label,
  state,
}: {
  index: number;
  label: string;
  state: 'done' | 'current' | 'pending';
}) {
  return (
    <div className={styles.stepItem}>
      <div
        className={
          state === 'done'
            ? styles.stepCircleDone
            : state === 'current'
              ? styles.stepCircleCurrent
              : styles.stepCirclePending
        }
        aria-current={state === 'current' ? 'step' : undefined}
      >
        {state === 'done' ? '✓' : index}
      </div>
      <span
        className={
          state === 'done'
            ? styles.stepLabelDone
            : state === 'current'
              ? styles.stepLabelCurrent
              : styles.stepLabelPending
        }
      >
        {label}
      </span>
    </div>
  );
}

export function DocumentTemplateWizard({ wizard, companyName, branchName }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<Step1Fields>({
    resolver: zodResolver(step1Schema),
    defaultValues: { type: 'RENTAL_CONTRACT', name: '', effectiveFrom: '' },
  });

  const watchedType = watch('type');
  const watchedName = watch('name');

  function getStepState(stepNum: number): 'done' | 'current' | 'pending' {
    const current = wizard.step ?? 1;
    if (current === 4) return 'done';
    if (stepNum < current) return 'done';
    if (stepNum === current) return 'current';
    return 'pending';
  }

  const isOpen = wizard.step !== null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) wizard.reset(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-label="Nueva plantilla de documento"
        >
          {/* Header */}
          <div className={styles.header}>
            <div>
              <Dialog.Title className={styles.title}>Nueva plantilla de documento</Dialog.Title>
              <p className={styles.subtitle}>3 pasos: Metadatos → Subir archivo → Activar</p>
            </div>
            <Dialog.Close asChild>
              <button type="button" className={styles.closeButton} aria-label="Cerrar wizard">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {/* Step indicators (solo pasos 1-3) */}
          {wizard.step !== 4 && (
            <div className={styles.stepBar} role="list" aria-label="Progreso del wizard">
              <div className={styles.stepBarLine} aria-hidden="true" />
              <StepIndicator index={1} label="Metadatos" state={getStepState(1)} />
              <StepIndicator index={2} label="Subir archivo" state={getStepState(2)} />
              <StepIndicator index={3} label="Activar" state={getStepState(3)} />
            </div>
          )}

          {/* Paso 1 */}
          {wizard.step === 1 && (
            <form
              className={styles.stepContent}
              onSubmit={handleSubmit((data) =>
                void wizard.submitStep1({
                  name: data.name,
                  type: data.type,
                  effectiveFrom: data.effectiveFrom || undefined,
                }),
              )}
              noValidate
            >
              <h3 className={styles.stepTitle}>Paso 1 — Registrar metadatos</h3>

              <div className={styles.fieldGroup}>
                <label htmlFor="wiz-type" className={styles.label}>
                  Tipo de plantilla <span className={styles.required}>*</span>
                </label>
                <select id="wiz-type" className={styles.select} {...register('type')}>
                  {(Object.entries(TEMPLATE_TYPE_LABELS) as [TemplateType, string][]).map(([value, label]) => (
                    <option key={value} value={value}>
                      {value} — {label}
                    </option>
                  ))}
                </select>
                {errors.type && <span className={styles.fieldError}>{errors.type.message}</span>}
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="wiz-name" className={styles.label}>
                  Nombre descriptivo <span className={styles.required}>*</span>
                </label>
                <input
                  id="wiz-name"
                  type="text"
                  className={styles.input}
                  placeholder="Ej: Contrato Marco de Arrendamiento v2026-11"
                  aria-describedby={errors.name ? 'wiz-name-error' : undefined}
                  {...register('name')}
                />
                {errors.name && (
                  <span id="wiz-name-error" className={styles.fieldError}>
                    {errors.name.message}
                  </span>
                )}
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Empresa</label>
                  <div className={styles.readonlyField}>{companyName}</div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Sede de gestión</label>
                  <div className={styles.readonlyField}>{branchName}</div>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="wiz-effective" className={styles.label}>
                  Vigente desde (opcional)
                </label>
                <input
                  id="wiz-effective"
                  type="date"
                  className={styles.input}
                  {...register('effectiveFrom')}
                />
                <p className={styles.fieldHint}>Informativo — no bloquea la activación.</p>
              </div>

              {wizard.error && (
                <div className={styles.errorBanner} role="alert">
                  <AlertTriangle size={14} />
                  <span>{wizard.error}</span>
                </div>
              )}

              <div className={styles.actions}>
                <Dialog.Close asChild>
                  <button type="button" className={styles.secondaryButton}>
                    Cancelar
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={wizard.isSubmitting}
                >
                  {wizard.isSubmitting ? 'Guardando…' : 'Guardar y continuar'}
                  {!wizard.isSubmitting && <ChevronRight size={14} />}
                </button>
              </div>
            </form>
          )}

          {/* Paso 2 */}
          {wizard.step === 2 && (
            <div className={styles.stepContent}>
              {wizard.draftId && (
                <div className={styles.successBanner}>
                  <CheckCircle size={14} />
                  <span>
                    Borrador creado: <strong>{watchedName}</strong>
                  </span>
                </div>
              )}

              <h3 className={styles.stepTitle}>Paso 2 — Subir archivo</h3>
              <p className={styles.stepDescription}>
                El sistema generará una URL firmada PUT directa a GCS. El archivo no transita por el servidor. Máximo
                20 MB.
              </p>

              {/* Drop zone */}
              <div
                className={styles.dropZone}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                aria-label="Seleccionar archivo PDF o DOCX para subir"
              >
                <Upload size={36} className={styles.dropZoneIcon} />
                <p className={styles.dropZonePrimary}>Arrastra el archivo aquí o haz clic</p>
                <p className={styles.dropZoneSecondary}>PDF o DOCX · Máximo 20 MB</p>
                <p className={styles.dropZoneHint}>
                  Tipos permitidos: application/pdf · application/vnd.openxmlformats-officedocument.wordprocessingml.document
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className={styles.hiddenFileInput}
                aria-label="Archivo de plantilla"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  selectedFileRef.current = file;
                  // Force re-render to show file name
                  e.target.form?.dispatchEvent(new Event('change'));
                }}
              />

              {/* File selected indicator */}
              {selectedFileRef.current && (
                <div className={styles.fileSelected}>
                  <FileText size={14} className={styles.fileSelectedIcon} />
                  <span className={styles.fileSelectedName}>{selectedFileRef.current.name}</span>
                  <span className={styles.fileSelectedSize}>
                    ({Math.round(selectedFileRef.current.size / 1024)} KB)
                  </span>
                </div>
              )}

              {wizard.error && (
                <div className={styles.errorBanner} role="alert">
                  <AlertTriangle size={14} />
                  <span>{wizard.error}</span>
                </div>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => wizard.reset()}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={wizard.isSubmitting}
                  onClick={() => {
                    const file = selectedFileRef.current;
                    if (!file) return;
                    void wizard.submitStep2(file);
                  }}
                >
                  {wizard.isSubmitting ? 'Subiendo…' : 'Subir y continuar'}
                  {!wizard.isSubmitting && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* Paso 3 */}
          {wizard.step === 3 && (
            <div className={styles.stepContent}>
              {wizard.objectUrl && (
                <div className={styles.successBanner}>
                  <CheckCircle size={14} />
                  <span>
                    Archivo subido: <strong className={styles.mono}>{wizard.objectUrl}</strong>
                  </span>
                </div>
              )}

              <h3 className={styles.stepTitle}>Paso 3 — Activar plantilla</h3>

              {/* Summary */}
              <div className={styles.summaryBox}>
                <p className={styles.summaryTitle}>Resumen de activación</p>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Tipo</span>
                  <span className={styles.summaryValueMono}>{watchedType}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Nombre</span>
                  <span className={styles.summaryValue}>{watchedName || '—'}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Formato</span>
                  <span className={styles.summaryValueMono}>{wizard.documentFormat ?? '—'}</span>
                </div>
              </div>

              {/* Warning */}
              <div className={styles.warningBanner}>
                <AlertTriangle size={14} className={styles.warningIcon} />
                <div>
                  Al activar esta plantilla, la versión vigente actual pasará automáticamente a estado{' '}
                  <strong>Archivada</strong>. Esta acción queda registrada en auditoría y no puede deshacerse.
                </div>
              </div>

              {wizard.error && (
                <div className={styles.errorBanner} role="alert">
                  <AlertTriangle size={14} />
                  <span>{wizard.error}</span>
                </div>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => wizard.reset()}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.activateButton}
                  disabled={wizard.isSubmitting}
                  onClick={() => void wizard.submitStep3()}
                >
                  {wizard.isSubmitting ? 'Activando…' : (
                    <>
                      <CheckCircle size={14} />
                      Confirmar activación
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Paso 4: Éxito */}
          {wizard.step === 4 && (
            <div className={styles.successStep}>
              <div className={styles.successCircle}>
                <CheckCircle size={32} className={styles.successIcon} />
              </div>
              <h3 className={styles.successTitle}>Plantilla activada correctamente</h3>
              <p className={styles.successDescription}>
                «{wizard.activatedTemplate?.name}» ahora es la versión vigente
                {wizard.activatedTemplate?.version !== null && wizard.activatedTemplate?.version !== undefined
                  ? ` (v${wizard.activatedTemplate.version})`
                  : ''}
                . La versión anterior ha sido archivada.
              </p>
              <div className={styles.successMeta}>
                Tipo: <strong className={styles.mono}>{wizard.activatedTemplate?.type}</strong> · Estado:{' '}
                <strong className={styles.activeLabel}>ACTIVE</strong>
              </div>
              <Dialog.Close asChild>
                <button type="button" className={styles.primaryButton} onClick={wizard.reset}>
                  Cerrar y volver al listado
                </button>
              </Dialog.Close>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
