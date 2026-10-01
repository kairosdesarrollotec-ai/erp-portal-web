import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFirebaseAuth } from '../providers/firebase';
import { getCustomer, updateCustomer, CustomerApiError } from './customers-client';
import { useWorkContextForCustomers } from './useWorkContextForCustomers';
import type { CustomerFormData } from './useCustomersList';

export type CustomerDetailState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR' | 'FORBIDDEN';

const CUSTOMER_DETAIL_KEY = (id: string, companyId: string) =>
  ['customers', 'detail', id, companyId] as const;

export function useCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { context, loading: contextLoading } = useWorkContextForCustomers();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: id && context
      ? CUSTOMER_DETAIL_KEY(id, context.companyId)
      : (['customers', 'detail', 'none'] as const),
    queryFn: async () => {
      const user = getFirebaseAuth().currentUser;
      if (!user || !id || !context) throw new Error('No auth or context');
      const idToken = await user.getIdToken();
      return getCustomer(idToken, id, context.companyId, context.branchId);
    },
    enabled: !contextLoading && !!context && !!id,
    retry: false,
  });

  const editMutation = useMutation({
    mutationFn: async (formData: CustomerFormData) => {
      const user = getFirebaseAuth().currentUser;
      if (!user || !id || !context) throw new Error('No auth or context');
      const idToken = await user.getIdToken();
      return updateCustomer(idToken, id, {
        companyId: context.companyId,
        branchId: context.branchId,
        fullName: formData.fullName.trim(),
        documentType: formData.documentType.trim(),
        documentNumber: formData.documentNumber.trim(),
        nationality: formData.nationality,
        countryEntryDate: formData.countryEntryDate || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
      });
    },
    onSuccess: (updated) => {
      if (id && context) {
        queryClient.setQueryData(CUSTOMER_DETAIL_KEY(id, context.companyId), updated);
      }
    },
  });

  let state: CustomerDetailState = 'LOADING';
  if (contextLoading || query.isPending) {
    state = 'LOADING';
  } else if (query.isError) {
    const err = query.error;
    if (err instanceof CustomerApiError && (err.status === 403 || err.status === 401)) {
      state = 'FORBIDDEN';
    } else {
      state = 'RECOVERABLE_ERROR';
    }
  } else if (query.isSuccess) {
    state = 'READY';
  }

  async function editCustomer(formData: CustomerFormData): Promise<boolean> {
    try {
      await editMutation.mutateAsync(formData);
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
    customer: query.data ?? null,
    context,
    editSubmitting: editMutation.isPending,
    editErrorMessage: editMutation.error
      ? editMutation.error instanceof Error
        ? editMutation.error.message
        : 'Error al actualizar el cliente.'
      : null,
    editCustomer,
    reload,
  };
}
