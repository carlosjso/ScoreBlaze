import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { rolesQueryKeys, rolesService } from "@/features/roles/Roles.service";
import type { RoleFormMode, RoleFormValues } from "@/features/roles/Roles.types";
import { toRoleMutationPayload } from "@/features/roles/schemas/Roles.schema";
import { getApiGlobalErrorMessage } from "@/shared/api/client";

type SaveRoleArgs = {
  mode: RoleFormMode;
  roleId?: number;
  values: RoleFormValues;
};

type SaveRoleMutationArgs = {
  mode: RoleFormMode;
  roleId?: number;
  payload: ReturnType<typeof toRoleMutationPayload>;
};

export function useRolesMutations() {
  const queryClient = useQueryClient();
  const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({ mode, roleId, payload }: SaveRoleMutationArgs) => {
      if (mode === "create") {
        return rolesService.createRole(payload);
      }

      if (!roleId) {
        throw new Error("No se encontro el rol a editar.");
      }

      return rolesService.updateRole(roleId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId: number) => rolesService.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKeys.all });
    },
  });

  const clearMutationError = () => {
    saveMutation.reset();
    deleteMutation.reset();
  };

  const saveRole = async ({ mode, roleId, values }: SaveRoleArgs) => {
    clearMutationError();
    await saveMutation.mutateAsync({
      mode,
      roleId,
      payload: toRoleMutationPayload(values),
    });
  };

  const deleteRole = async (roleId: number) => {
    clearMutationError();
    setDeletingRoleId(roleId);

    try {
      await deleteMutation.mutateAsync(roleId);
    } finally {
      setDeletingRoleId(null);
    }
  };

  const mutationError = saveMutation.error ?? deleteMutation.error;
  const mutationErrorMessage = useMemo(
    () => (mutationError ? getApiGlobalErrorMessage(mutationError) : null),
    [mutationError],
  );

  return {
    submitting: saveMutation.isPending,
    deletingRoleId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveRole,
    deleteRole,
  };
}
