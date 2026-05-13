import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { leagueMatchesQueryKeys, leagueMatchesService } from "@/features/leagues/LeagueMatches.service";
import { leaguesQueryKeys } from "@/features/leagues/Leagues.service";
import type { MatchFormMode, QuickMatchFormValues } from "@/features/quick-matches/QuickMatches.types";
import { quickMatchesQueryKeys } from "@/features/quick-matches/QuickMatches.service";
import { toQuickMatchMutationPayload } from "@/features/quick-matches/schemas/QuickMatches.schema";
import { getApiGlobalErrorMessage } from "@/shared/api/client";

type SaveLeagueMatchArgs = {
  mode: MatchFormMode;
  matchId?: number;
  leagueId: number;
  values: QuickMatchFormValues;
};

type SaveLeagueMatchMutationArgs = {
  mode: MatchFormMode;
  matchId?: number;
  leagueId: number;
  payload: ReturnType<typeof toQuickMatchMutationPayload>;
};

export function useLeagueMatchesMutations() {
  const queryClient = useQueryClient();
  const [deletingMatchId, setDeletingMatchId] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({ mode, matchId, leagueId, payload }: SaveLeagueMatchMutationArgs) => {
      if (mode === "create") {
        return leagueMatchesService.createMatch(leagueId, payload);
      }

      if (!matchId) {
        throw new Error("No se encontro el partido a editar.");
      }

      return leagueMatchesService.updateMatch(matchId, leagueId, payload);
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: leagueMatchesQueryKeys.snapshot(variables.leagueId) }),
        queryClient.invalidateQueries({ queryKey: leaguesQueryKeys.detail(variables.leagueId) }),
        queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.all }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ matchId }: { matchId: number; leagueId: number }) => leagueMatchesService.deleteMatch(matchId),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: leagueMatchesQueryKeys.snapshot(variables.leagueId) }),
        queryClient.invalidateQueries({ queryKey: leaguesQueryKeys.detail(variables.leagueId) }),
        queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.all }),
      ]);
    },
  });

  const clearMutationError = () => {
    saveMutation.reset();
    deleteMutation.reset();
  };

  const saveMatch = async ({ mode, matchId, leagueId, values }: SaveLeagueMatchArgs) => {
    clearMutationError();
    await saveMutation.mutateAsync({
      mode,
      matchId,
      leagueId,
      payload: toQuickMatchMutationPayload(values, leagueId),
    });
  };

  const deleteMatch = async (leagueId: number, matchId: number) => {
    clearMutationError();
    setDeletingMatchId(matchId);

    try {
      await deleteMutation.mutateAsync({ leagueId, matchId });
    } finally {
      setDeletingMatchId(null);
    }
  };

  const mutationError = saveMutation.error ?? deleteMutation.error;
  const mutationErrorMessage = useMemo(
    () => (mutationError ? getApiGlobalErrorMessage(mutationError) : null),
    [mutationError],
  );

  return {
    submitting: saveMutation.isPending,
    deletingMatchId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveMatch,
    deleteMatch,
  };
}
