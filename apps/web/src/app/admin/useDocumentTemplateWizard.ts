import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getFirebaseAuth } from '../providers/firebase';
import {
  createTemplate,
  requestUploadUrl,
  activateTemplate,
  TemplateCommandError,
} from './document-templates-client';
import type { TemplateType, TemplateDocumentFormat } from './document-templates-client';

export type WizardStep = 1 | 2 | 3 | 4 | null;

export interface WizardFormData {
  name: string;
  type: TemplateType;
  effectiveFrom?: string;
  file: File;
}

interface WizardState {
  step: WizardStep;
  isSubmitting: boolean;
  error: string | null;
  /** ID de la plantilla en DRAFT (disponible a partir del paso 2) */
  draftId: string | null;
  /** URL pública del objeto en GCS (disponible en paso 3) */
  objectUrl: string | null;
  /** Formato del documento subido */
  documentFormat: TemplateDocumentFormat | null;
  /** Resumen de la plantilla activada (paso 4) */
  activatedTemplate: { name: string; type: string; version: number | null } | null;
}

/**
 * Orquesta el wizard de 3 pasos de creación de plantilla:
 * 1. createTemplate (DRAFT)
 * 2. requestUploadUrl + PUT al signed URL de GCS
 * 3. activateTemplate
 * ADM-03 — TDD-KAIROS-MVP-002-TPL v1.0 §6.1–6.3.
 */
export function useDocumentTemplateWizard(companyId: string, branchId: string) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<WizardState>({
    step: null,
    isSubmitting: false,
    error: null,
    draftId: null,
    objectUrl: null,
    documentFormat: null,
    activatedTemplate: null,
  });

  function open() {
    setState({
      step: 1,
      isSubmitting: false,
      error: null,
      draftId: null,
      objectUrl: null,
      documentFormat: null,
      activatedTemplate: null,
    });
  }

  function reset() {
    setState({
      step: null,
      isSubmitting: false,
      error: null,
      draftId: null,
      objectUrl: null,
      documentFormat: null,
      activatedTemplate: null,
    });
  }

  /** Paso 1 → 2: crear plantilla en DRAFT */
  async function submitStep1(data: { name: string; type: TemplateType; effectiveFrom?: string }) {
    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const idempotencyKey = crypto.randomUUID();
      const template = await createTemplate(
        idToken,
        {
          companyId,
          branchId,
          type: data.type,
          name: data.name,
          effectiveFrom: data.effectiveFrom ?? null,
        },
        idempotencyKey,
      );
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        draftId: template.id,
        step: 2,
      }));
    } catch (err) {
      const message =
        err instanceof TemplateCommandError
          ? `No se pudo registrar la plantilla (error ${err.status}).`
          : 'Ocurrió un error al crear la plantilla.';
      setState((prev) => ({ ...prev, isSubmitting: false, error: message }));
    }
  }

  /** Paso 2 → 3: solicitar URL firmada y subir el archivo directamente a GCS */
  async function submitStep2(file: File) {
    if (!state.draftId) return;
    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();

      const contentType =
        file.type === 'application/pdf'
          ? ('application/pdf' as const)
          : ('application/vnd.openxmlformats-officedocument.wordprocessingml.document' as const);

      const idempotencyKey = crypto.randomUUID();
      const uploadUrlResponse = await requestUploadUrl(
        idToken,
        state.draftId,
        { companyId, branchId, contentType, contentLength: file.size },
        idempotencyKey,
      );

      // PUT directo a GCS — no transita por el servidor (TDD-TPL §6.2)
      const putResponse = await globalThis.fetch(uploadUrlResponse.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!putResponse.ok) {
        throw new Error(`Error al subir el archivo (${putResponse.status}).`);
      }

      const documentFormat: TemplateDocumentFormat = contentType === 'application/pdf' ? 'PDF' : 'DOCX';

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        objectUrl: uploadUrlResponse.objectUrl,
        documentFormat,
        step: 3,
      }));
    } catch (err) {
      const message =
        err instanceof TemplateCommandError
          ? `No se pudo obtener la URL de subida (error ${err.status}).`
          : err instanceof Error
            ? err.message
            : 'Ocurrió un error al subir el archivo.';
      setState((prev) => ({ ...prev, isSubmitting: false, error: message }));
    }
  }

  /** Paso 3 → 4: activar la plantilla */
  async function submitStep3() {
    if (!state.draftId || !state.objectUrl || !state.documentFormat) return;
    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      const idempotencyKey = crypto.randomUUID();
      const activated = await activateTemplate(
        idToken,
        state.draftId,
        { companyId, branchId, objectUrl: state.objectUrl, documentFormat: state.documentFormat },
        idempotencyKey,
      );
      // Invalida la lista de plantillas para reflejar el cambio
      await queryClient.invalidateQueries({ queryKey: ['templates', companyId, branchId] });
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        step: 4,
        activatedTemplate: {
          name: activated.name,
          type: activated.type,
          version: activated.version,
        },
      }));
    } catch (err) {
      const message =
        err instanceof TemplateCommandError
          ? err.status === 409
            ? 'La plantilla ya no está en estado Borrador. Recarga la pantalla e inténtalo de nuevo.'
            : `No se pudo activar la plantilla (error ${err.status}).`
          : 'Ocurrió un error al activar la plantilla.';
      setState((prev) => ({ ...prev, isSubmitting: false, error: message }));
    }
  }

  return {
    step: state.step,
    isSubmitting: state.isSubmitting,
    error: state.error,
    draftId: state.draftId,
    objectUrl: state.objectUrl,
    documentFormat: state.documentFormat,
    activatedTemplate: state.activatedTemplate,
    open,
    reset,
    submitStep1,
    submitStep2,
    submitStep3,
  };
}
