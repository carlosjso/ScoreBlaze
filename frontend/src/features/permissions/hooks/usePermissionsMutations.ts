import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { permissionsQueryKeys, permissionsService } from "@/features/permissions/Permissions.service";
import type {
  PermissionFormMode,
  PermissionFormValues,
} from "@/features/permissions/Permissions.types";
import { toPermissionMutationPayload } from "@/features/permissions/schemas/Permissions.schema";
import { getApiGlobalErrorMessage } from "@/shared/api/client";

type SavePermissionArgs = {
  mode: PermissionFormMode;
  permissionId?: number;
  values: PermissionFormValues;
};

type SavePermissionMutationArgs = {
  mode: PermissionFormMode;
  permissionId?: number;
  payload: ReturnType<typeof toPermissionMutationPayload>;
};

export function usePermissionsMutations() {
  const queryClient = useQueryClient();
  const [deletingPermissionId, setDeletingPermissionId] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({ mode, permissionId, payload }: SavePermissionMutationArgs) => {
      if (mode === "create") {
        return permissionsService.createPermission(payload);
      }

      if (!permissionId) {
        throw new Error("No se encontro el permiso a editar.");
      }

      return permissionsService.updatePermission(permissionId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionsQueryKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (permissionId: number) => permissionsService.deletePermission(permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionsQueryKeys.all });
    },
  });

  const clearMutationError = () => {
    saveMutation.reset();
    deleteMutation.reset();
  };

  const savePermission = async ({ mode, permissionId, values }: SavePermissionArgs) => {
    clearMutationError();
    await saveMutation.mutateAsync({
      mode,
      permissionId,
      payload: toPermissionMutationPayload(values),
    });
  };

  const deletePermission = async (permissionId: number) => {
    clearMutationError();
    setDeletingPermissionId(permissionId);

    try {
      await deleteMutation.mutateAsync(permissionId);
    } finally {
      setDeletingPermissionId(null);
    }
  };

  const mutationError = saveMutation.error ?? deleteMutation.error;
  const mutationErrorMessage = useMemo(
    () => (mutationError ? getApiGlobalErrorMessage(mutationError) : null),
    [mutationError],
  );

  return {
    submitting: saveMutation.isPending,
    deletingPermissionId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    savePermission,
    deletePermission,
  };
}
