import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { usersQueryKeys, usersService } from "@/features/users/Users.service";
import type { UserFormMode, UserFormValues } from "@/features/users/Users.types";
import { toUserMutationPayload } from "@/features/users/schemas/Users.schema";
import { getApiGlobalErrorMessage } from "@/shared/api/client";

type SaveUserArgs = {
  mode: UserFormMode;
  userId?: number;
  currentRoleName?: string;
  values: UserFormValues;
};

type SaveUserMutationArgs = {
  mode: UserFormMode;
  userId?: number;
  payload: ReturnType<typeof toUserMutationPayload>;
};

export function useUsersMutations() {
  const queryClient = useQueryClient();
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({ mode, userId, payload }: SaveUserMutationArgs) => {
      if (mode === "create") {
        return usersService.createUser(payload);
      }

      if (!userId) {
        throw new Error("No se encontro el usuario a editar.");
      }

      return usersService.updateUser(userId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => usersService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKeys.all });
    },
  });

  const clearMutationError = () => {
    saveMutation.reset();
    deleteMutation.reset();
  };

  const saveUser = async ({ mode, userId, currentRoleName, values }: SaveUserArgs) => {
    clearMutationError();
    await saveMutation.mutateAsync({
      mode,
      userId,
      payload: toUserMutationPayload(values, mode, currentRoleName),
    });
  };

  const deleteUser = async (userId: number) => {
    clearMutationError();
    setDeletingUserId(userId);

    try {
      await deleteMutation.mutateAsync(userId);
    } finally {
      setDeletingUserId(null);
    }
  };

  const mutationError = saveMutation.error ?? deleteMutation.error;
  const mutationErrorMessage = useMemo(
    () => (mutationError ? getApiGlobalErrorMessage(mutationError) : null),
    [mutationError],
  );

  return {
    submitting: saveMutation.isPending,
    deletingUserId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveUser,
    deleteUser,
  };
}
