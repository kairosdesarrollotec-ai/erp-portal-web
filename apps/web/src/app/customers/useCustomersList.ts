import { useCallback, useEffect, useRef, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import {
  Customer,
  CustomerApiError,
  CustomerCommandError,
  createCustomer,
  listCustomers,
  updateCustomer,
} from './customers-client';
import { useWorkContextForCustomers } from './useWorkContextForCustomers';

export type CustomersListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR' | 'FORBIDDEN';

const FILTER_DEBOUNCE_MS = 400;

export interface CustomerFormData {
  fullName: string;
  documentType: string;
  documentNumber: string;
  nationality?: 'PERUANO' | 'EXTRANJERO';
  countryEntryDate?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export function useCustomersList() {
  const { context, loading: contextLoading } = useWorkContextForCustomers();
  const [state, setState] = useState<CustomersListState>('LOADING');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    if (!context) return;
    const requestId = ++requestIdRef.current;
    setState('LOADING');

    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        if (requestId === requestIdRef.current) setState('RECOVERABLE_ERROR');
        return;
      }
      const idToken = await user.getIdToken();
      const result = await listCustomers(idToken, {
        companyId: context.companyId,
        branchId: context.branchId,
        search: search.trim() || undefined,
        limit: 100,
        offset: 0,
      });

      if (requestId !== requestIdRef.current) return;
      setCustomers(result.items);
      setTotal(result.total);
      setState(result.items.length === 0 ? 'EMPTY' : 'READY');
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (error instanceof CustomerApiError && (error.status === 401 || error.status === 403)) {
        setState('FORBIDDEN');
      } else {
        setState('RECOVERABLE_ERROR');
      }
    }
  }, [context, search]);

  useEffect(() => {
    if (contextLoading) return;
    if (!context) {
      queueMicrotask(() => setState('RECOVERABLE_ERROR'));
      return;
    }
    const timer = setTimeout(() => void reload(), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [context, contextLoading, search, reload]);

  const addCustomer = useCallback(
    async (formData: CustomerFormData): Promise<boolean> => {
      if (!context) return false;
      setCreating(true);
      setCreateError(null);

      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) {
          setCreateError('No hay sesión activa.');
          return false;
        }
        const idToken = await user.getIdToken();
        const idempotencyKey = crypto.randomUUID();

        await createCustomer(
          idToken,
          {
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
          },
          idempotencyKey,
        );

        await reload();
        return true;
      } catch (error) {
        if (error instanceof CustomerCommandError) {
          setCreateError(error.message);
        } else {
          setCreateError('Ocurrió un error al registrar el cliente. Intente nuevamente.');
        }
        return false;
      } finally {
        setCreating(false);
      }
    },
    [context, reload],
  );

  const startEditingCustomer = useCallback((customer: Customer) => {
    setUpdateError(null);
    setEditingCustomer(customer);
  }, []);

  const stopEditingCustomer = useCallback(() => {
    setEditingCustomer(null);
    setUpdateError(null);
  }, []);

  const editCustomer = useCallback(
    async (formData: CustomerFormData): Promise<boolean> => {
      if (!context || !editingCustomer) return false;
      setUpdating(true);
      setUpdateError(null);

      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) {
          setUpdateError('No hay sesión activa.');
          return false;
        }
        const idToken = await user.getIdToken();

        await updateCustomer(idToken, editingCustomer.id, {
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

        await reload();
        setEditingCustomer(null);
        return true;
      } catch (error) {
        if (error instanceof CustomerCommandError) {
          setUpdateError(error.message);
        } else {
          setUpdateError('Ocurrió un error al actualizar el cliente. Intente nuevamente.');
        }
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [context, editingCustomer, reload],
  );

  return {
    state,
    customers,
    total,
    context,
    search,
    setSearch,
    creating,
    createError,
    setCreateError,
    addCustomer,
    reload,
    editingCustomer,
    startEditingCustomer,
    stopEditingCustomer,
    editCustomer,
    updating,
    updateError,
  };
}
