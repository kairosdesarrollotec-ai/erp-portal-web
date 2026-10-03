import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFirebaseAuth } from '../providers/firebase';
import {
  ContractTemplateCommandError,
  createContractTemplate,
  listContractTemplates,
} from './contract-templates-client';
import { useWorkContextForAdmin } from './useWorkContextForAdmin';

export type ContractTemplatesState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR';

const TEMPLATES_KEY = (companyId: string, branchId: string) =>
  ['contract-templates', companyId, branchId] as const;

export function useContractTemplates() {
  const { context, loading: contextLoading } = useWorkContextForAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: context
      ? TEMPLATES_KEY(context.companyId, context.branchId)
      : (['contract-templates', 'none'] as const),
    queryFn: async () => {
      const user = getFirebaseAuth().currentUser;
      if (!user || !context) throw new Error('No auth or context');
      const idToken = await user.getIdToken();
      return listContractTemplates(idToken, context.companyId, context.branchId);
    },
    enabled: !contextLoading && !!context,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (type: string) => {
      const user = getFirebaseAuth().currentUser;
      if (!user || !context) throw new Error('No auth or context');
      const idToken = await user.getIdToken();
      return createContractTemplate(idToken, context.companyId, context.branchId, type);
    },
    onSuccess: () => {
      if (context) {
        void queryClient.invalidateQueries({
          queryKey: TEMPLATES_KEY(context.companyId, context.branchId),
        });
      }
    },
  });

  let state: ContractTemplatesState = 'LOADING';
  if (contextLoading || query.isPending) {
    state = 'LOADING';
  } else if (query.isError) {
    state = 'RECOVERABLE_ERROR';
  } else if (query.isSuccess) {
    state = 'READY';
  }

  async function createVersion(type: string): Promise<boolean> {
    try {
      await createMutation.mutateAsync(type);
      return true;
    } catch {
      return false;
    }
  }

  function reload() {
    void query.refetch();
  }

  return {
    state,
    templates: query.data ?? [],
    context,
    saving: createMutation.isPending,
    saveError: createMutation.error
      ? createMutation.error instanceof ContractTemplateCommandError
        ? createMutation.error.message
        : 'No se pudo crear la nueva versión.'
      : null,
    createVersion,
    reload,
  };
}
