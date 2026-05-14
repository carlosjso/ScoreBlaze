import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import type { LeagueFormMode, LeagueFormValues } from "@/features/leagues/Leagues.types";
import { toLeagueMutationPayload } from "@/features/leagues/schemas/Leagues.schema";
import { getApiGlobalErrorMessage } from "@/shared/api/client";

type SaveLeagueArgs = {
  mode: LeagueFormMode;
  leagueId?: number;
  values: LeagueFormValues;
};

type SaveLeagueMutationArgs = {
  mode: LeagueFormMode;
  leagueId?: number;
  payload: ReturnType<typeof toLeagueMutationPayload>;
};

export function useLeaguesMutations() {
  const queryClient = useQueryClient();
  const [deletingLeagueId, setDeletingLeagueId] = useState<number | null>(null);
  const [assigningTeamsLeagueId, setAssigningTeamsLeagueId] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({ mode, leagueId, payload }: SaveLeagueMutationArgs) => {
      if (mode === "create") {
        return leaguesService.createLeague(payload);
      }

      if (!leagueId) {
        throw new Error("No se encontro la liga a editar.");
      }

      return leaguesService.updateLeague(leagueId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaguesQueryKeys.all });
    },
  });

  const replaceTeamsMutation = useMutation({
    mutationFn: ({ leagueId, teamIds }: { leagueId: number; teamIds: number[] }) =>
      leaguesService.replaceLeagueTeams(leagueId, teamIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: leaguesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: leaguesQueryKeys.detail(variables.leagueId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (leagueId: number) => leaguesService.deleteLeague(leagueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaguesQueryKeys.all });
    },
  });

  const clearMutationError = () => {
    saveMutation.reset();
    replaceTeamsMutation.reset();
    deleteMutation.reset();
  };

  const saveLeague = async ({ mode, leagueId, values }: SaveLeagueArgs) => {
    clearMutationError();
    await saveMutation.mutateAsync({
      mode,
      leagueId,
      payload: toLeagueMutationPayload(values),
    });
  };

  const replaceLeagueTeams = async (leagueId: number, teamIds: number[]) => {
    clearMutationError();
    setAssigningTeamsLeagueId(leagueId);

    try {
      await replaceTeamsMutation.mutateAsync({ leagueId, teamIds });
    } finally {
      setAssigningTeamsLeagueId(null);
    }
  };

  const deleteLeague = async (leagueId: number) => {
    clearMutationError();
    setDeletingLeagueId(leagueId);

    try {
      await deleteMutation.mutateAsync(leagueId);
    } finally {
      setDeletingLeagueId(null);
    }
  };

  const mutationError = saveMutation.error ?? replaceTeamsMutation.error ?? deleteMutation.error;
  const mutationErrorMessage = useMemo(
    () => (mutationError ? getApiGlobalErrorMessage(mutationError) : null),
    [mutationError],
  );

  return {
    submitting: saveMutation.isPending || replaceTeamsMutation.isPending,
    deletingLeagueId,
    assigningTeamsLeagueId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveLeague,
    replaceLeagueTeams,
    deleteLeague,
  };
}
