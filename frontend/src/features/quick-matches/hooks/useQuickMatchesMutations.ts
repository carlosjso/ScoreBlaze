import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { quickMatchesQueryKeys, quickMatchesService } from "@/features/quick-matches/QuickMatches.service";
import type { MatchFormMode, QuickMatchFormValues } from "@/features/quick-matches/QuickMatches.types";
import { toQuickMatchMutationPayload } from "@/features/quick-matches/schemas/QuickMatches.schema";

type SaveQuickMatchArgs = {
  mode: MatchFormMode;
  matchId?: number;
  values: QuickMatchFormValues;
};

type SaveQuickMatchMutationArgs = {
  mode: MatchFormMode;
  matchId?: number;
  payload: ReturnType<typeof toQuickMatchMutationPayload>;
};

export function useQuickMatchesMutations() {
  const queryClient = useQueryClient();
  const [deletingMatchId, setDeletingMatchId] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({ mode, matchId, payload }: SaveQuickMatchMutationArgs) => {
      if (mode === "create") {
        return quickMatchesService.createMatch(payload);
      }

      if (!matchId) {
        throw new Error("No se encontro el partido a editar.");
      }

      return quickMatchesService.updateMatch(matchId, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.snapshot() }),
  });

  const deleteMutation = useMutation({
    mutationFn: (matchId: number) => quickMatchesService.deleteMatch(matchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.snapshot() }),
  });

  const clearMutationError = () => {
    saveMutation.reset();
    deleteMutation.reset();
  };

  const saveMatch = async ({ mode, matchId, values }: SaveQuickMatchArgs) => {
    clearMutationError();
    await saveMutation.mutateAsync({
      mode,
      matchId,
      payload: toQuickMatchMutationPayload(values),
    });
  };

  const deleteMatch = async (matchId: number) => {
    clearMutationError();
    setDeletingMatchId(matchId);

    try {
      await deleteMutation.mutateAsync(matchId);
    } finally {
      setDeletingMatchId(null);
    }
  };

  const mutationError = useMemo(() => {
    const error = saveMutation.error ?? deleteMutation.error;
    return error instanceof Error ? error.message : null;
  }, [deleteMutation.error, saveMutation.error]);

  return {
    submitting: saveMutation.isPending,
    deletingMatchId,
    mutationError,
    clearMutationError,
    saveMatch,
    deleteMatch,
  };
}

