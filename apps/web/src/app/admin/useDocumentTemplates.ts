import { useQuery } from '@tanstack/react-query';
import { getFirebaseAuth } from '../providers/firebase';
import { listTemplates } from './document-templates-client';
import type { TemplateType, TemplateStatus } from './document-templates-client';

interface UseDocumentTemplatesParams {
  companyId: string | null;
  branchId: string | null;
  type?: TemplateType;
  status?: TemplateStatus;
}

/**
 * TanStack Query: lista de plantillas de documentos con filtros.
 * ADM-03 — TDD-KAIROS-MVP-002-TPL v1.0 §6.4.
 */
export function useDocumentTemplates({ companyId, branchId, type, status }: UseDocumentTemplatesParams) {
  return useQuery({
    queryKey: ['templates', companyId, branchId, type, status],
    enabled: companyId !== null && branchId !== null,
    queryFn: async () => {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Sesión no disponible.');
      const idToken = await user.getIdToken();
      return listTemplates(idToken, {
        companyId: companyId!,
        branchId: branchId!,
        ...(type !== undefined ? { type } : {}),
        ...(status !== undefined ? { status } : {}),
      });
    },
  });
}
