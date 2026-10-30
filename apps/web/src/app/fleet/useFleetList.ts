import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFirebaseAuth } from '../providers/firebase';
import {
  FleetApiError,
  FleetCommandError,
  GcsUploadError,
  FleetVehicle,
  VehicleStatus,
  createVehicle,
  listVehicles,
  requestPhotoUploadSession,
  updateVehicle,
  updateVehicleStatus,
  uploadPhotoToGcs,
} from './fleet-client';
import { useWorkContextForFleet } from './useWorkContextForFleet';

export type FleetListState = 'LOADING' | 'READY' | 'EMPTY' | 'RECOVERABLE_ERROR' | 'FORBIDDEN';

const FILTER_DEBOUNCE_MS = 400;
const FLEET_LIST_KEY = ['fleet', 'list'] as const;

export interface VehicleFormData {
  plate: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
  category?: string;
  status?: VehicleStatus;
  dailyRate?: number;
  /** Garantía (PEN). Opcional (se puede completar después). */
  depositMinimum?: number;
  /** Pasajeros que admiten el vehículo (1..60); tope de acompañantes (G-05). Obligatoria al registrar (DEC-FLT-CAP-001); en edición solo se envía si se informa. */
  passengerCapacity?: number;
  /** Precio del combustible por unidad (PEN). Opcional hasta que exista la tarifa. */
  fuelPrice?: number;
  suitableForTrocha?: boolean;
  rateNormal?: number;
  ratePlus?: number;
  rateLibre?: number;
  fuelPenaltyPerLine?: number;
  photoUrl?: string;
  photoFile?: File;
}

export interface VehicleEditFormData {
  brand: string;
  model: string;
  year?: number;
  color?: string;
  category?: string;
  dailyRate?: number;
  depositMinimum?: number;
  passengerCapacity?: number;
  fuelPrice?: number;
  /** Solo se informa cuando el usuario tiene FLEET.MANAGE_THIRD_PATH (Gerencia); si no, se omite y el back no cambia el valor. */
  thirdPathEligible?: boolean;
  suitableForTrocha?: boolean;
  rateNormal?: number;
  ratePlus?: number;
  rateLibre?: number;
  fuelPenaltyPerLine?: number;
  photoUrl?: string;
  photoFile?: File;
}

async function resolvePhotoUrl(
  idToken: string,
  context: { companyId: string; branchId: string },
  photoFile: File | undefined,
  photoUrl: string | undefined,
): Promise<string | undefined> {
  if (!photoFile) return photoUrl?.trim() || undefined;

  const mimeType = photoFile.type;
  if (mimeType !== 'image/jpeg' && mimeType !== 'image/webp') {
    throw new Error(`Tipo MIME no admitido: ${mimeType}. Solo se aceptan image/jpeg o image/webp.`);
  }
  const contentType = mimeType;

  const session = await requestPhotoUploadSession(idToken, {
    companyId: context.companyId,
    branchId: context.branchId,
    contentType,
    contentLength: photoFile.size,
  });

  await uploadPhotoToGcs(session.uploadUrl, photoFile);
  return session.objectUrl;
}

export function useFleetList() {
  const { context, loading: contextLoading } = useWorkContextForFleet();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'ALL'>('ALL');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedStatus, setDebouncedStatus] = useState<VehicleStatus | 'ALL'>('ALL');
  const [createError, setCreateError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedStatus(statusFilter);
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const queryKey = [
    ...FLEET_LIST_KEY,
    context?.companyId,
    context?.branchId,
    debouncedSearch,
    debouncedStatus,
  ] as const;

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('No hay sesión activa');
      const idToken = await user.getIdToken();
      return listVehicles(idToken, {
        companyId: context!.companyId,
        branchId: context!.branchId,
        status: debouncedStatus === 'ALL' ? undefined : debouncedStatus,
        search: debouncedSearch.trim() || undefined,
        limit: 100,
        offset: 0,
      });
    },
    enabled: !contextLoading && !!context,
    placeholderData: (prev) => prev,
  });

  const state: FleetListState = (() => {
    if (contextLoading || query.isLoading) return 'LOADING';
    if (!context) return 'RECOVERABLE_ERROR';
    if (query.isError) {
      const err = query.error;
      if (err instanceof FleetApiError && (err.status === 401 || err.status === 403)) {
        return 'FORBIDDEN';
      }
      return 'RECOVERABLE_ERROR';
    }
    if (query.data) {
      return query.data.items.length === 0 ? 'EMPTY' : 'READY';
    }
    return 'LOADING';
  })();

  const vehicles = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const invalidateList = useCallback(
    () => queryClient.invalidateQueries({ queryKey: FLEET_LIST_KEY }),
    [queryClient],
  );

  const {
    mutateAsync: createMutateAsync,
    isPending: creating,
  } = useMutation({
    mutationFn: async (formData: VehicleFormData) => {
      if (!context) throw new Error('Contexto no disponible');
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('No hay sesión activa.');
      const idToken = await user.getIdToken();
      const idempotencyKey = crypto.randomUUID();
      // DEC-FLT-CAP-001 (G-05): solo la capacidad de pasajeros es obligatoria al registrar.
      if (formData.passengerCapacity === undefined) {
        throw new Error('La capacidad de pasajeros es obligatoria.');
      }
      // Decisión de negocio 28-oct #1: el precio por línea de combustible es obligatorio al registrar un vehículo.
      const fuelPenaltyPerLine = formData.fuelPenaltyPerLine;
      if (fuelPenaltyPerLine === undefined || !(fuelPenaltyPerLine > 0)) {
        throw new Error('La multa de combustible por línea faltante es obligatoria.');
      }
      const photoUrl = await resolvePhotoUrl(idToken, context, formData.photoFile, formData.photoUrl);
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
          depositMinimum: formData.depositMinimum,
          passengerCapacity: formData.passengerCapacity,
          fuelPrice: formData.fuelPrice,
          suitableForTrocha: formData.suitableForTrocha ?? false,
          rateNormal: formData.rateNormal,
          ratePlus: formData.ratePlus,
          rateLibre: formData.rateLibre,
          fuelPenaltyPerLine,
          photoUrl,
        },
        idempotencyKey,
      );
    },
    onSuccess: () => {
      setCreateError(null);
      void invalidateList();
    },
    onError: (error) => {
      if (error instanceof FleetCommandError || error instanceof GcsUploadError) {
        setCreateError(error.message);
      } else {
        setCreateError('Ocurrió un error al registrar el vehículo. Intente nuevamente.');
      }
    },
  });

  const { mutateAsync: statusMutateAsync } = useMutation({
    mutationFn: async ({ vehicleId, newStatus }: { vehicleId: string; newStatus: VehicleStatus }) => {
      if (!context) throw new Error('Contexto no disponible');
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('No hay sesión activa.');
      const idToken = await user.getIdToken();
      await updateVehicleStatus(idToken, vehicleId, {
        companyId: context.companyId,
        branchId: context.branchId,
        status: newStatus,
      });
    },
    onSuccess: () => void invalidateList(),
  });

  const {
    mutateAsync: editMutateAsync,
    isPending: editSubmitting,
  } = useMutation({
    mutationFn: async ({
      vehicleId,
      formData,
    }: {
      vehicleId: string;
      formData: VehicleEditFormData;
    }) => {
      if (!context) throw new Error('Contexto no disponible');
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('No hay sesión activa.');
      const idToken = await user.getIdToken();
      const photoUrl = await resolvePhotoUrl(idToken, context, formData.photoFile, formData.photoUrl);
      await updateVehicle(idToken, vehicleId, {
        companyId: context.companyId,
        branchId: context.branchId,
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        year: formData.year || undefined,
        color: formData.color?.trim() || undefined,
        category: formData.category?.trim() || undefined,
        dailyRate: formData.dailyRate || undefined,
        depositMinimum: formData.depositMinimum,
        passengerCapacity: formData.passengerCapacity,
        fuelPrice: formData.fuelPrice,
        suitableForTrocha: formData.suitableForTrocha,
        rateNormal: formData.rateNormal,
        ratePlus: formData.ratePlus,
        rateLibre: formData.rateLibre,
        fuelPenaltyPerLine: formData.fuelPenaltyPerLine,
        ...(formData.thirdPathEligible !== undefined ? { thirdPathEligible: formData.thirdPathEligible } : {}),
        photoUrl,
      });
    },
    onSuccess: () => {
      setEditError(null);
      void invalidateList();
    },
    onError: (error) => {
      if (error instanceof FleetCommandError || error instanceof GcsUploadError) {
        setEditError(error.message);
      } else {
        setEditError('Ocurrió un error al editar el vehículo. Intente nuevamente.');
      }
    },
  });

  const addVehicle = useCallback(
    async (formData: VehicleFormData): Promise<boolean> => {
      setCreateError(null);
      try {
        await createMutateAsync(formData);
        return true;
      } catch {
        return false;
      }
    },
    [createMutateAsync],
  );

  const changeStatus = useCallback(
    async (vehicleId: string, newStatus: VehicleStatus): Promise<boolean> => {
      setUpdatingId(vehicleId);
      try {
        await statusMutateAsync({ vehicleId, newStatus });
        return true;
      } catch {
        return false;
      } finally {
        setUpdatingId(null);
      }
    },
    [statusMutateAsync],
  );

  const editVehicle = useCallback(
    async (vehicleId: string, formData: VehicleEditFormData): Promise<boolean> => {
      setEditError(null);
      try {
        await editMutateAsync({ vehicleId, formData });
        return true;
      } catch {
        return false;
      }
    },
    [editMutateAsync],
  );

  const deactivateVehicle = useCallback(
    (vehicleId: string) => changeStatus(vehicleId, 'OUT_OF_SERVICE'),
    [changeStatus],
  );

  const reload = useCallback(
    () => queryClient.invalidateQueries({ queryKey: FLEET_LIST_KEY }),
    [queryClient],
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
