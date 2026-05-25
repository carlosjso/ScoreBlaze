import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { leagueMatchesQueryKeys, leagueMatchesService } from "@/features/leagues/LeagueMatches.service";
import { leaguesQueryKeys } from "@/features/leagues/Leagues.service";
import type { LeagueFinalPhaseFormatOption } from "@/features/leagues/Leagues.types";
import type { ApiTeamOption, MatchFormMode, MatchMutationPayload, QuickMatchFormValues } from "@/features/quick-matches/QuickMatches.types";
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
};

type DeleteAllLeagueMatchesArgs = {
  leagueId: number;
  matchIds: number[];
};

function shuffleTeams(teams: ApiTeamOption[]) {
  const nextTeams = [...teams];

  for (let index = nextTeams.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextTeams[index], nextTeams[swapIndex]] = [nextTeams[swapIndex], nextTeams[index]];
  }

  return nextTeams;
}

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRoundName(teamCount: number) {
  if (teamCount <= 2) return "Final";
  if (teamCount <= 4) return "Semifinal";
  if (teamCount <= 8) return "Cuartos de final";
  if (teamCount <= 16) return "Octavos de final";
  return "Ronda inicial";
}

function getMatchTime(index: number) {
  const DAY_MINUTES = 24 * 60;
  const MATCH_DURATION_MINUTES = 60;
  const FIRST_SLOT_MINUTES = 8 * 60;
  const SLOT_STEP_MINUTES = 50;
  const LAST_VALID_START_MINUTES = DAY_MINUTES - MATCH_DURATION_MINUTES - 1;
  const startMinutes = Math.min(FIRST_SLOT_MINUTES + index * SLOT_STEP_MINUTES, LAST_VALID_START_MINUTES);
  const endMinutes = startMinutes + MATCH_DURATION_MINUTES;
  const toTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
  };

  return {
    start_time: toTime(startMinutes),
    end_time: toTime(endMinutes),
  };
}

function resolveFirstRoundTeamCount(
  format: LeagueFinalPhaseFormatOption,
  qualifiedTeams: number,
  byes: number,
  playInSlots: number,
) {
  if (format === "PLAY_IN_PLUS_BRACKET") {
    return Math.min(playInSlots, qualifiedTeams);
  }

  return Math.max(0, qualifiedTeams - byes);
}

function buildBracketPayloads({ format, qualifiedTeams, byes, playInSlots, teams, trackedStats }: GenerateBracketArgs): MatchMutationPayload[] {
  const uniqueTeams = Array.from(new Map(teams.map((team) => [team.id, team])).values());
  const firstRoundTeamCount = resolveFirstRoundTeamCount(format, qualifiedTeams, byes, playInSlots);
  const requestedTeamCount = Math.min(firstRoundTeamCount, uniqueTeams.length);
  const normalizedTeamCount = requestedTeamCount % 2 === 0 ? requestedTeamCount : requestedTeamCount - 1;
  const selectedTeams = shuffleTeams(uniqueTeams).slice(0, normalizedTeamCount);
  const matchDate = getTodayInputValue();
  const roundName = format === "PLAY_IN_PLUS_BRACKET" ? "Play-In" : getRoundName(normalizedTeamCount);
  const payloads: MatchMutationPayload[] = [];
  const usedTeamIds = new Set<number>();

  for (let index = 0; index + 1 < selectedTeams.length; index += 2) {
    const teamA = selectedTeams[index];
    const teamB = selectedTeams[index + 1];
    if (!teamA || !teamB) {
      continue;
    }
    if (teamA.id === teamB.id || usedTeamIds.has(teamA.id) || usedTeamIds.has(teamB.id)) {
      continue;
    }

    const matchNumber = payloads.length + 1;
    const time = getMatchTime(matchNumber - 1);
    usedTeamIds.add(teamA.id);
    usedTeamIds.add(teamB.id);

    payloads.push({
      match_date: matchDate,
      start_time: time.start_time,
      end_time: time.end_time,
      team_a_id: teamA.id,
      team_b_id: teamB.id,
      league_id: null,
      score_team_a: null,
      score_team_b: null,
      winner_team_id: null,
      is_draw: false,
      court: null,
      tournament: `${roundName} ${matchNumber}`,
      tracked_stats: trackedStats,
      status: "scheduled",
    });
  }

  return payloads;
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
      const payloads = buildBracketPayloads(args);

      if (payloads.length === 0) {
        throw new Error("Necesitas al menos 2 equipos para sortear una llave.");
      }

      await Promise.all(payloads.map((payload) => leagueMatchesService.createMatch(args.leagueId, payload)));
      return payloads.length;
    },
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
    deleteAllMutation.reset();
    generateBracketMutation.reset();
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

  const mutationError = saveMutation.error ?? deleteMutation.error ?? deleteAllMutation.error ?? generateBracketMutation.error;
  const mutationErrorMessage = useMemo(
    () => (mutationError ? getApiGlobalErrorMessage(mutationError) : null),
    [mutationError],
  );

  return {
    submitting: saveMutation.isPending,
    generatingBracket: generateBracketMutation.isPending,
    deletingAllMatches: deleteAllMutation.isPending,
    deletingMatchId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveMatch,
    deleteMatch,
    deleteAllLeagueMatches,
    generateBracketMatches,
  };
}
