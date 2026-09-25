import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import type { LeagueDetail, LeagueFormMode, LeagueFormSubmitOptions, LeagueFormValues } from "@/features/leagues/Leagues.types";
import { toLeagueMutationPayload } from "@/features/leagues/schemas/Leagues.schema";
import { getApiGlobalErrorMessage } from "@/shared/api/client";

type SaveLeagueArgs = {
  mode: LeagueFormMode;
  leagueId?: number;
  values: LeagueFormValues;
  options?: LeagueFormSubmitOptions;
};

type SaveLeagueMutationArgs = {
  mode: LeagueFormMode;
  leagueId?: number;
  payload: ReturnType<typeof toLeagueMutationPayload>;
};

type ConvertLeagueArgs = {
  leagueId: number;
  values: LeagueFormValues;
  orderedTeamIds: number[];
  expectedMatchIds: number[];
  seedMode: "STANDINGS" | "RANDOM" | "MANUAL";
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
    onSuccess: (savedLeague) => {
      // Keep the destination editor in sync when we save and navigate immediately afterwards.
      queryClient.setQueryData<LeagueDetail>(leaguesQueryKeys.detail(savedLeague.id), (currentLeague) =>
        currentLeague ? { ...currentLeague, ...savedLeague } : currentLeague,
      );
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

  const conversionMutation = useMutation({
    mutationFn: ({ leagueId, values, orderedTeamIds, expectedMatchIds, seedMode }: ConvertLeagueArgs) =>
      leaguesService.convertToElimination(
        leagueId,
        toLeagueMutationPayload(values),
        orderedTeamIds,
        expectedMatchIds,
        seedMode,
      ),
    onSuccess: (savedLeague) => {
      queryClient.setQueryData<LeagueDetail>(leaguesQueryKeys.detail(savedLeague.id), (currentLeague) =>
        currentLeague ? { ...currentLeague, ...savedLeague } : currentLeague,
      );
      queryClient.invalidateQueries({ queryKey: leaguesQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["league-matches", "snapshot", savedLeague.id] });
      queryClient.invalidateQueries({ queryKey: ["quick-matches"] });
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
    conversionMutation.reset();
    deleteMutation.reset();
  };

  const saveLeague = async ({ mode, leagueId, values, options }: SaveLeagueArgs) => {
    clearMutationError();
    return saveMutation.mutateAsync({
      mode,
      leagueId,
      payload: toLeagueMutationPayload(values, options),
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

  const convertLeagueToElimination = async (args: ConvertLeagueArgs) => {
    clearMutationError();
    return conversionMutation.mutateAsync(args);
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

  const mutationError = saveMutation.error ?? replaceTeamsMutation.error ?? conversionMutation.error ?? deleteMutation.error;
  const mutationErrorMessage = useMemo(
    () => (mutationError ? getApiGlobalErrorMessage(mutationError) : null),
    [mutationError],
  );

  return {
    submitting: saveMutation.isPending || replaceTeamsMutation.isPending,
    convertingLeague: conversionMutation.isPending,
    deletingLeagueId,
    assigningTeamsLeagueId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveLeague,
    convertLeagueToElimination,
    replaceLeagueTeams,
    deleteLeague,
  };
}
