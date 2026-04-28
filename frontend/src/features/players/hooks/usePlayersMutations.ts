import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { playersQueryKeys, playersService } from "@/features/players/Players.service";
import type { PlayerFormMode, PlayerFormValues } from "@/features/players/Players.types";
import { toPlayerMutationPayload } from "@/features/players/schemas/Players.schema";

type SavePlayerArgs = {
  mode: PlayerFormMode;
  playerId?: number;
  values: PlayerFormValues;
};

type SavePlayerMutationArgs = {
  mode: PlayerFormMode;
  playerId?: number;
  payload: ReturnType<typeof toPlayerMutationPayload>;
};

export function usePlayersMutations() {
  const queryClient = useQueryClient();
  const [deletingPlayerId, setDeletingPlayerId] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({ mode, playerId, payload }: SavePlayerMutationArgs) => {
      if (mode === "create") {
        return playersService.createPlayer(payload);
      }

      if (!playerId) {
        throw new Error("No se encontro el jugador a editar.");
      }

      return playersService.updatePlayer(playerId, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playersQueryKeys.snapshot() }),
  });

  const deleteMutation = useMutation({
    mutationFn: (playerId: number) => playersService.deletePlayer(playerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playersQueryKeys.snapshot() }),
  });

  const clearMutationError = () => {
    saveMutation.reset();
    deleteMutation.reset();
  };

  const savePlayer = async ({ mode, playerId, values }: SavePlayerArgs) => {
    clearMutationError();
    await saveMutation.mutateAsync({
      mode,
      playerId,
      payload: toPlayerMutationPayload(values),
    });
  };

  const deletePlayer = async (playerId: number) => {
    clearMutationError();
    setDeletingPlayerId(playerId);

    try {
      await deleteMutation.mutateAsync(playerId);
    } finally {
      setDeletingPlayerId(null);
    }
  };

  const mutationError = useMemo(() => {
    const error = saveMutation.error ?? deleteMutation.error;
    return error instanceof Error ? error.message : null;
  }, [deleteMutation.error, saveMutation.error]);

  return {
    submitting: saveMutation.isPending,
    deletingPlayerId,
    mutationError,
    clearMutationError,
    savePlayer,
    deletePlayer,
  };
}

