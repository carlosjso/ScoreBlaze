import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { leagueMatchesQueryKeys, leagueMatchesService } from "@/features/leagues/LeagueMatches.service";
import { leaguesQueryKeys } from "@/features/leagues/Leagues.service";
import type { LeagueFinalPhaseFormatOption, LeagueGroupStanding, LeagueGroupWildcardRankingMetric, LeagueStandingRow } from "@/features/leagues/Leagues.types";
import type { ApiTeamOption, MatchFormMode, QuickMatchFormValues } from "@/features/quick-matches/QuickMatches.types";
import { quickMatchesQueryKeys } from "@/features/quick-matches/QuickMatches.service";
import { toQuickMatchMutationPayload } from "@/features/quick-matches/schemas/QuickMatches.schema";
import { getApiGlobalErrorMessage } from "@/shared/api/client";

type SaveLeagueMatchArgs = {
  mode: MatchFormMode;
  matchId?: number;
  leagueId: number;
  trackedStats?: string[];
  values: QuickMatchFormValues;
};

type SaveLeagueMatchMutationArgs = {
  mode: MatchFormMode;
  matchId?: number;
  leagueId: number;
  payload: ReturnType<typeof toQuickMatchMutationPayload>;
};

type GenerateBracketArgs = {
  leagueId: number;
  format: LeagueFinalPhaseFormatOption;
  qualifiedTeams: number;
  byes: number;
  playInSlots: number;
  teams: ApiTeamOption[];
  trackedStats: string[];
  seedMode?: BracketSeedMode;
  standings?: LeagueStandingRow[];
  confirmIncompleteRegularSeason?: boolean;
};

type DeleteAllLeagueMatchesArgs = {
  leagueId: number;
  matchIds: number[];
};

type BracketSeedMode = "STANDINGS" | "RANDOM" | "MANUAL";

function getUniqueTeams(teams: ApiTeamOption[]) {
  return Array.from(new Map(teams.map((team) => [team.id, team])).values());
}

function shuffleTeams(teams: ApiTeamOption[]) {
  const nextTeams = [...teams];

  for (let index = nextTeams.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextTeams[index], nextTeams[swapIndex]] = [nextTeams[swapIndex], nextTeams[index]];
  }

  return nextTeams;
}

export function orderTeamsByStandings(teams: ApiTeamOption[], standings: LeagueStandingRow[] | undefined) {
  if (!standings || standings.length === 0) {
    return [...teams].sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" }) || left.id - right.id);
  }

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const rankedTeamIds: number[] = [];
  const usedTeamIds = new Set<number>();

  standings.forEach((row) => {
    if (!teamById.has(row.teamId) || usedTeamIds.has(row.teamId)) {
      return;
    }

    rankedTeamIds.push(row.teamId);
    usedTeamIds.add(row.teamId);
  });

  const rankedTeams = rankedTeamIds
    .map((teamId) => teamById.get(teamId) ?? null)
    .filter((team): team is ApiTeamOption => team !== null);
  const fallbackTeams = teams
    .filter((team) => !usedTeamIds.has(team.id))
    .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" }) || left.id - right.id);

  return [...rankedTeams, ...fallbackTeams];
}

export function buildGroupQualificationOrder(
  groupStandings: LeagueGroupStanding[],
  qualifiersPerGroup: number,
  bestExtraSlots: number,
  wildcardTiebreakers: LeagueGroupWildcardRankingMetric[] = ["AVERAGE_POINT_DIFFERENCE", "AVERAGE_POINTS_FOR"],
) {
  const fixedQualifiers: LeagueStandingRow[] = [];
  const wildcardCandidates: LeagueStandingRow[] = [];

  for (let position = 0; position < qualifiersPerGroup; position += 1) {
    groupStandings.forEach((group) => {
      const row = group.standings[position];
      if (row) fixedQualifiers.push(row);
    });
  }

  groupStandings.forEach((group) => {
    wildcardCandidates.push(...group.standings.slice(qualifiersPerGroup));
  });

  wildcardCandidates.sort((left, right) => {
    const leftWinRate = left.matchesPlayed > 0 ? left.wins / left.matchesPlayed : 0;
    const rightWinRate = right.matchesPlayed > 0 ? right.wins / right.matchesPlayed : 0;
    const leftAverageDifference = left.matchesPlayed > 0 ? left.pointsDifference / left.matchesPlayed : 0;
    const rightAverageDifference = right.matchesPlayed > 0 ? right.pointsDifference / right.matchesPlayed : 0;
    const leftAveragePoints = left.matchesPlayed > 0 ? left.pointsFor / left.matchesPlayed : 0;
    const rightAveragePoints = right.matchesPlayed > 0 ? right.pointsFor / right.matchesPlayed : 0;
    let comparison = rightWinRate - leftWinRate;
    for (const criterion of wildcardTiebreakers) {
      if (comparison !== 0) break;
      if (criterion === "AVERAGE_POINT_DIFFERENCE") {
        comparison = rightAverageDifference - leftAverageDifference;
      } else if (criterion === "AVERAGE_POINTS_FOR") {
        comparison = rightAveragePoints - leftAveragePoints;
      }
    }
    return comparison
      || left.teamName.localeCompare(right.teamName, "es", { sensitivity: "base" })
      || left.teamId - right.teamId;
  });

  return [...fixedQualifiers, ...wildcardCandidates.slice(0, bestExtraSlots)].map((row, index) => ({
    ...row,
    position: index + 1,
  }));
}

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

  const deleteAllMutation = useMutation({
    mutationFn: async ({ matchIds }: DeleteAllLeagueMatchesArgs) => {
      const uniqueIds = Array.from(new Set(matchIds.filter((id) => Number.isInteger(id) && id > 0)));
      if (uniqueIds.length === 0) {
        return 0;
      }

      await Promise.all(uniqueIds.map((matchId) => leagueMatchesService.deleteMatch(matchId)));
      return uniqueIds.length;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: leagueMatchesQueryKeys.snapshot(variables.leagueId) }),
        queryClient.invalidateQueries({ queryKey: leaguesQueryKeys.detail(variables.leagueId) }),
        queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.all }),
      ]);
    },
  });

  const generateBracketMutation = useMutation({
    mutationFn: async (args: GenerateBracketArgs) => {
      const uniqueTeams = getUniqueTeams(args.teams);
      const orderedTeams = args.seedMode === "STANDINGS"
        ? orderTeamsByStandings(uniqueTeams, args.standings)
        : args.seedMode === "MANUAL"
          ? uniqueTeams
          : shuffleTeams(uniqueTeams);
      const qualifiedTeams = orderedTeams.slice(0, Math.min(args.qualifiedTeams, orderedTeams.length));
      if (qualifiedTeams.length < 2) {
        throw new Error("Necesitas al menos 2 equipos para sortear una llave.");
      }
      await leagueMatchesService.generateBracket(
        args.leagueId,
        qualifiedTeams.map((team) => team.id),
        args.seedMode ?? "RANDOM",
        args.confirmIncompleteRegularSeason ?? false,
      );
      return qualifiedTeams.length;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: leagueMatchesQueryKeys.snapshot(variables.leagueId) }),
        queryClient.invalidateQueries({ queryKey: leaguesQueryKeys.detail(variables.leagueId) }),
        queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.all }),
      ]);
    },
  });

  const resetBracketMutation = useMutation({
    mutationFn: (leagueId: number) => leagueMatchesService.resetBracket(leagueId),
    onSuccess: async (_, leagueId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: leagueMatchesQueryKeys.snapshot(leagueId) }),
        queryClient.invalidateQueries({ queryKey: leaguesQueryKeys.detail(leagueId) }),
        queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.all }),
      ]);
    },
  });

  const clearMutationError = () => {
    saveMutation.reset();
    deleteMutation.reset();
    deleteAllMutation.reset();
    generateBracketMutation.reset();
    resetBracketMutation.reset();
  };

  const saveMatch = async ({ mode, matchId, leagueId, trackedStats, values }: SaveLeagueMatchArgs) => {
    clearMutationError();
    await saveMutation.mutateAsync({
      mode,
      matchId,
      leagueId,
      payload: toQuickMatchMutationPayload(values, leagueId, trackedStats ?? []),
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

  const generateBracketMatches = async (args: GenerateBracketArgs) => {
    clearMutationError();
    await generateBracketMutation.mutateAsync(args);
  };

  const deleteAllLeagueMatches = async (leagueId: number, matchIds: number[]) => {
    clearMutationError();
    await deleteAllMutation.mutateAsync({ leagueId, matchIds });
  };

  const resetBracket = async (leagueId: number) => {
    clearMutationError();
    await resetBracketMutation.mutateAsync(leagueId);
  };

  const mutationError = saveMutation.error ?? deleteMutation.error ?? deleteAllMutation.error ?? generateBracketMutation.error ?? resetBracketMutation.error;
  const mutationErrorMessage = useMemo(
    () => (mutationError ? getApiGlobalErrorMessage(mutationError) : null),
    [mutationError],
  );

  return {
    submitting: saveMutation.isPending,
    generatingBracket: generateBracketMutation.isPending,
    deletingAllMatches: deleteAllMutation.isPending,
    resettingBracket: resetBracketMutation.isPending,
    deletingMatchId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveMatch,
    deleteMatch,
    deleteAllLeagueMatches,
    generateBracketMatches,
    resetBracket,
  };
}
