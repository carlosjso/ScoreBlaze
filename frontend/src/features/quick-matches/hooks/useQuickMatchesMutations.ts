import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { quickMatchesQueryKeys, quickMatchesService } from "@/features/quick-matches/QuickMatches.service";
import { getDefaultQuickMatchTrackedStats } from "@/features/quick-matches/quickMatchSettings";
import type {
  MatchFormMode,
  QuickMatchFormValues,
  QuickMatchListItem,
} from "@/features/quick-matches/QuickMatches.types";
import {
  toQuickMatchFormValues,
  toQuickMatchMutationPayload,
} from "@/features/quick-matches/schemas/QuickMatches.schema";
import { getApiGlobalErrorMessage } from "@/shared/api/client";

type SaveQuickMatchArgs = {
  mode: MatchFormMode;
  matchId?: number;
  leagueId?: number | null;
  trackedStats?: string[];
  values: QuickMatchFormValues;
};

type SaveQuickMatchMutationArgs = {
  mode: MatchFormMode;
  matchId?: number;
  payload: ReturnType<typeof toQuickMatchMutationPayload>;
};

type UpdateTrackedStatsArgs = {
  match: QuickMatchListItem;
  trackedStats: string[];
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.all }),
  });

  const deleteMutation = useMutation({
    mutationFn: (matchId: number) => quickMatchesService.deleteMatch(matchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.all }),
  });

  const updateTrackedStatsMutation = useMutation({
    mutationFn: ({ match, trackedStats }: UpdateTrackedStatsArgs) =>
      quickMatchesService.updateMatch(
        match.id,
        toQuickMatchMutationPayload(
          toQuickMatchFormValues(match),
          match.leagueId,
          trackedStats,
        ),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.all }),
  });

  const clearMutationError = () => {
    saveMutation.reset();
    deleteMutation.reset();
    updateTrackedStatsMutation.reset();
  };

  const saveMatch = async ({ mode, matchId, leagueId, trackedStats, values }: SaveQuickMatchArgs) => {
    clearMutationError();
    const effectiveTrackedStats = leagueId
      ? trackedStats ?? []
      : trackedStats ?? getDefaultQuickMatchTrackedStats();
    await saveMutation.mutateAsync({
      mode,
      matchId,
      payload: toQuickMatchMutationPayload(values, leagueId ?? null, effectiveTrackedStats),
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

  const updateTrackedStats = async (match: QuickMatchListItem, trackedStats: string[]) => {
    clearMutationError();
    await updateTrackedStatsMutation.mutateAsync({ match, trackedStats });
  };

  const mutationError = saveMutation.error ?? deleteMutation.error ?? updateTrackedStatsMutation.error;
  const mutationErrorMessage = useMemo(
    () => (mutationError ? getApiGlobalErrorMessage(mutationError) : null),
    [mutationError],
  );

  return {
    submitting: saveMutation.isPending,
    deletingMatchId,
    updatingTrackedStatsMatchId: updateTrackedStatsMutation.isPending
      ? updateTrackedStatsMutation.variables?.match.id ?? null
      : null,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveMatch,
    deleteMatch,
    updateTrackedStats,
  };
}

