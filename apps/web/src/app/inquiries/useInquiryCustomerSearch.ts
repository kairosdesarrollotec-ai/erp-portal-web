import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import { listCustomers, createCustomer, type Customer, CustomerCommandError } from '../customers/customers-client';
import type { CustomerFormData } from '../customers/useCustomersList';

export function useInquiryCustomerSearch(
  context: { companyId: string; branchId: string } | null,
  onCustomerSelected: (customer: Customer) => void,
) {
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const q = customerSearchQuery.trim();
    if (q.length < 2 || !context) {
      // La lista y el indicador son derivados de una búsqueda inválida; se
      // restablecen juntos, sin dejar tareas pendientes tras una selección.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomerSearchResults((current) => (current.length === 0 ? current : []));
      setSearchingCustomers(false);
      return;
    }

    setSearchingCustomers(true);
    const timer = setTimeout(async () => {
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) return;
        const idToken = await user.getIdToken();
        const res = await listCustomers(idToken, {
          companyId: context.companyId,
          branchId: context.branchId,
          search: q,
          limit: 5,
        });
        setCustomerSearchResults(res.items);
      } catch {
        setCustomerSearchResults([]);
      } finally {
        setSearchingCustomers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchQuery, context]);

  const selectCustomer = useCallback(
    (customer: Customer) => {
      onCustomerSelected(customer);
      setCustomerSearchQuery('');
      setCustomerSearchResults([]);
    },
    [onCustomerSelected],
  );

  const openNewCustomerModal = useCallback(() => {
    setIsNewCustomerModalOpen(true);
    setModalError(null);
  }, []);

  const closeNewCustomerModal = useCallback(() => {
    setIsNewCustomerModalOpen(false);
    setModalError(null);
  }, []);

  const handleCreateCustomer = useCallback(
    async (data: CustomerFormData): Promise<boolean> => {
      if (!context) return false;
      setModalLoading(true);
      setModalError(null);
      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('Sesión no disponible.');
        const idToken = await user.getIdToken();
        const created = await createCustomer(idToken, {
          ...data,
          companyId: context.companyId,
          branchId: context.branchId,
        });
        selectCustomer(created);
        setIsNewCustomerModalOpen(false);
        return true;
      } catch (err) {
        setModalError(err instanceof CustomerCommandError ? err.message : 'No se pudo registrar el cliente.');
        return false;
      } finally {
        setModalLoading(false);
      }
    },
    [context, selectCustomer],
  );

  return {
    customerSearchQuery,
    setCustomerSearchQuery,
    customerSearchResults,
    searchingCustomers,
    selectCustomer,
    isNewCustomerModalOpen,
    modalLoading,
    modalError,
    openNewCustomerModal,
    closeNewCustomerModal,
    handleCreateCustomer,
  };
}
