import { useCallback, useEffect, useRef, useState } from 'react';
import { getFirebaseAuth } from '../providers/firebase';
import {
  FleetApiError,
  FleetCommandError,
  FleetVehicle,
  VehicleStatus,
  createVehicle,
  listVehicles,
  updateVehicle,
  updateVehicleStatus,
} from './fleet-client';
import { useWorkContextForFleet } from './useWorkContextForFleet';

export type FleetListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR' | 'FORBIDDEN';

const FILTER_DEBOUNCE_MS = 400;

export interface VehicleFormData {
  plate: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  category?: string;
  status?: VehicleStatus;
  dailyRate?: number;
  photoUrl?: string;
}

export interface VehicleEditFormData {
  brand: string;
  model: string;
  year?: number;
  color?: string;
  category?: string;
  dailyRate?: number;
  photoUrl?: string;
}

export function useFleetList() {
  const { context, loading: contextLoading } = useWorkContextForFleet();
  const [state, setState] = useState<FleetListState>('LOADING');
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
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
      const result = await listVehicles(idToken, {
        companyId: context.companyId,
        branchId: context.branchId,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
        limit: 100,
        offset: 0,
      });

      if (requestId !== requestIdRef.current) return;
      setVehicles(result.items);
      setTotal(result.total);
      setState(result.items.length === 0 ? 'EMPTY' : 'READY');
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (error instanceof FleetApiError && (error.status === 401 || error.status === 403)) {
        setState('FORBIDDEN');
      } else {
        setState('RECOVERABLE_ERROR');
      }
    }
  }, [context, search, statusFilter]);

  useEffect(() => {
    if (contextLoading) return;
    if (!context) {
      setState('RECOVERABLE_ERROR');
      return;
    }
    const timer = setTimeout(() => void reload(), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [context, contextLoading, search, statusFilter, reload]);

  const addVehicle = useCallback(
    async (formData: VehicleFormData): Promise<boolean> => {
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

        await createVehicle(
          idToken,
          {
            companyId: context.companyId,
            branchId: context.branchId,
            plate: formData.plate.trim().toUpperCase(),
            brand: formData.brand.trim(),
            model: formData.model.trim(),
            year: formData.year || undefined,
            color: formData.color?.trim() || undefined,
            category: formData.category?.trim() || 'SEDAN',
            status: formData.status ?? 'AVAILABLE',
            dailyRate: formData.dailyRate || undefined,
            photoUrl: formData.photoUrl?.trim() || undefined,
          },
          idempotencyKey,
        );

        await reload();
        return true;
      } catch (error) {
        if (error instanceof FleetCommandError) {
          setCreateError(error.message);
        } else {
          setCreateError('Ocurrió un error al registrar el vehículo. Intente nuevamente.');
        }
        return false;
      } finally {
        setCreating(false);
      }
    },
    [context, reload],
  );

  const changeStatus = useCallback(
    async (vehicleId: string, newStatus: VehicleStatus): Promise<boolean> => {
      if (!context) return false;
      setUpdatingId(vehicleId);

      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) return false;
        const idToken = await user.getIdToken();

        await updateVehicleStatus(idToken, vehicleId, {
          companyId: context.companyId,
          branchId: context.branchId,
          status: newStatus,
        });

        await reload();
        return true;
      } catch {
        return false;
      } finally {
        setUpdatingId(null);
      }
    },
    [context, reload],
  );

  const editVehicle = useCallback(
    async (vehicleId: string, formData: VehicleEditFormData): Promise<boolean> => {
      if (!context) return false;
      setEditSubmitting(true);
      setEditError(null);

      try {
        const user = getFirebaseAuth().currentUser;
        if (!user) {
          setEditError('No hay sesión activa.');
          return false;
        }
        const idToken = await user.getIdToken();

        await updateVehicle(idToken, vehicleId, {
          companyId: context.companyId,
          branchId: context.branchId,
          brand: formData.brand.trim(),
          model: formData.model.trim(),
          year: formData.year || undefined,
          color: formData.color?.trim() || undefined,
          category: formData.category?.trim() || undefined,
          dailyRate: formData.dailyRate || undefined,
          photoUrl: formData.photoUrl?.trim() || undefined,
        });

        await reload();
        return true;
      } catch (error) {
        if (error instanceof FleetCommandError) {
          setEditError(error.message);
        } else {
          setEditError('Ocurrió un error al editar el vehículo. Intente nuevamente.');
        }
        return false;
      } finally {
        setEditSubmitting(false);
      }
    },
    [context, reload],
  );

  const deactivateVehicle = useCallback(
    (vehicleId: string) => changeStatus(vehicleId, 'OUT_OF_SERVICE'),
    [changeStatus],
  );

  return {
    state,
    vehicles,
    total,
    context,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    creating,
    createError,
    setCreateError,
    updatingId,
    addVehicle,
    changeStatus,
    editingVehicle,
    setEditingVehicle,
    editSubmitting,
    editError,
    setEditError,
    editVehicle,
    deactivateVehicle,
    reload,
  };
}
