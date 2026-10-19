import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFirebaseAuth } from '../providers/firebase';
import {
  FleetApiError,
  FleetCommandError,
  GcsUploadError,
  getVehicle,
  updateVehicle,
  updateVehicleStatus,
  requestPhotoUploadSession,
  uploadPhotoToGcs,
  type FleetVehicle,
  type VehicleStatus,
} from './fleet-client';
import { useWorkContextForFleet } from './useWorkContextForFleet';
import type { VehicleEditFormData } from './useFleetList';

export type VehicleDetailState = 'LOADING' | 'READY' | 'RECOVERABLE_ERROR' | 'FORBIDDEN';

const VEHICLE_DETAIL_KEY = (id: string) => ['fleet', 'vehicle', id] as const;

export function useVehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const { context, loading: contextLoading } = useWorkContextForFleet();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: id ? VEHICLE_DETAIL_KEY(id) : (['fleet', 'vehicle', 'none'] as const),
    queryFn: async () => {
      if (!id || !context) throw new Error('Contexto o ID no disponible');
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('No hay sesión activa');
      const idToken = await user.getIdToken();
      return getVehicle(idToken, id, context.companyId, context.branchId);
    },
    enabled: !contextLoading && !!context && !!id,
  });

  const state: VehicleDetailState = (() => {
    if (contextLoading || query.isLoading) return 'LOADING';
    if (!context || !id) return 'RECOVERABLE_ERROR';
    if (query.isError) {
      const err = query.error;
      if (err instanceof FleetApiError && (err.status === 401 || err.status === 403)) {
        return 'FORBIDDEN';
      }
      return 'RECOVERABLE_ERROR';
    }
    if (query.data) return 'READY';
    return 'LOADING';
  })();

  const { mutateAsync: statusMutateAsync, isPending: changingStatus, error: statusError } =
    useMutation({
      mutationFn: async (newStatus: VehicleStatus) => {
        if (!id || !context) throw new Error('Contexto no disponible');
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('No hay sesión activa.');
        const idToken = await user.getIdToken();
        return updateVehicleStatus(idToken, id, {
          companyId: context.companyId,
          branchId: context.branchId,
          status: newStatus,
        });
      },
      onSuccess: (updated) => {
        if (id) {
          queryClient.setQueryData(VEHICLE_DETAIL_KEY(id), updated);
        }
      },
    });

  const { mutateAsync: editMutateAsync, isPending: editSubmitting, error: editError } =
    useMutation({
      mutationFn: async (formData: VehicleEditFormData) => {
        if (!id || !context) throw new Error('Contexto no disponible');
        const user = getFirebaseAuth().currentUser;
        if (!user) throw new Error('No hay sesión activa.');
        const idToken = await user.getIdToken();
        let photoUrl = formData.photoUrl?.trim() || undefined;
        if (formData.photoFile) {
          const mimeType = formData.photoFile.type;
          if (mimeType !== 'image/jpeg' && mimeType !== 'image/webp') {
            throw new Error(`Tipo MIME no admitido: ${mimeType}. Solo se aceptan image/jpeg o image/webp.`);
          }
          const session = await requestPhotoUploadSession(idToken, {
            companyId: context.companyId,
            branchId: context.branchId,
            contentType: mimeType,
            contentLength: formData.photoFile.size,
          });
          await uploadPhotoToGcs(session.uploadUrl, formData.photoFile);
          photoUrl = session.objectUrl;
        }
        return updateVehicle(idToken, id, {
          companyId: context.companyId,
          branchId: context.branchId,
          brand: formData.brand.trim(),
          model: formData.model.trim(),
          year: formData.year || undefined,
          color: formData.color?.trim() || undefined,
          category: formData.category?.trim() || undefined,
          dailyRate: formData.dailyRate || undefined,
          // Antes se omitían: la edición desde el detalle no guardaba garantía, capacidad ni combustible.
          depositMinimum: formData.depositMinimum,
          passengerCapacity: formData.passengerCapacity,
          fuelPrice: formData.fuelPrice,
          photoUrl,
        });
      },
      onSuccess: (updated) => {
        if (id) {
          queryClient.setQueryData(VEHICLE_DETAIL_KEY(id), updated);
        }
      },
    });

  const changeStatus = useCallback(
    async (newStatus: VehicleStatus): Promise<boolean> => {
      try {
        await statusMutateAsync(newStatus);
        return true;
      } catch {
        return false;
      }
    },
    [statusMutateAsync],
  );

  const editVehicle = useCallback(
    async (formData: VehicleEditFormData): Promise<boolean> => {
      try {
        await editMutateAsync(formData);
        return true;
      } catch {
        return false;
      }
    },
    [editMutateAsync],
  );

  const reload = useCallback(
    () => id ? queryClient.invalidateQueries({ queryKey: VEHICLE_DETAIL_KEY(id) }) : undefined,
    [queryClient, id],
  );

  const statusErrorMessage = statusError instanceof FleetCommandError || statusError instanceof GcsUploadError
    ? statusError.message
    : statusError ? 'No se pudo cambiar el estado del vehículo.' : null;

  const editErrorMessage = editError instanceof FleetCommandError || editError instanceof GcsUploadError
    ? editError.message
    : editError ? 'No se pudo guardar los cambios.' : null;

  return {
    state,
    vehicle: query.data as FleetVehicle | undefined,
    context,
    changingStatus,
    statusErrorMessage,
    editSubmitting,
    editErrorMessage,
    changeStatus,
    editVehicle,
    reload,
  };
}
