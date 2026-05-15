import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import { useLeagueMatchesData } from "@/features/leagues/hooks/useLeagueMatchesData";

type UseLeaguePlayerParticipationOptions = {
  leagueId: number | null;
  leagueName: string | null;
  teamId: number | null;
  teamName: string | null;
  playerId: number | null;
};

export type LeaguePlayerParticipation = {
  leagueId: number;
  leagueName: string;
  teamId: number;
  teamName: string;
  playerId: number;
  playerMatchesPlayed: number;
  teamMatchesPlayed: number;
  participationRate: number | null;
  rankingPosition: number | null;
  totalPoints: number;
  made1pt: number;
  made2pt: number;
  made3pt: number;
  missedShots: number;
  totalAssists: number;
  totalRebounds: number;
  totalFouls: number;
  trackedStats: string[];
};

export function useLeaguePlayerParticipation({
  leagueId,
  leagueName,
  teamId,
  teamName,
  playerId,
}: UseLeaguePlayerParticipationOptions) {
  const hasValidLeagueId = typeof leagueId === "number" && leagueId > 0;
  const shouldLoad =
    hasValidLeagueId
    && typeof teamId === "number"
    && teamId > 0
    && typeof playerId === "number"
    && playerId > 0;
  const liveMatchesSnapshot = useLeagueMatchesData(shouldLoad ? leagueId : null);

  const leagueStatsQuery = useQuery({
    queryKey: leaguesQueryKeys.stats(leagueId ?? 0),
    enabled: shouldLoad,
    queryFn: ({ signal }) => leaguesService.getLeagueStats(leagueId!, signal),
  });

  const data = useMemo(() => {
    if (!shouldLoad || !leagueName || !teamName) {
      return null;
    }

    const teamMatchesPlayed = liveMatchesSnapshot.matches.filter(
      (match) =>
        (match.teamAId === teamId || match.teamBId === teamId)
        && (match.status === "live" || match.status === "finished"),
    ).length;

    const playerRanking =
      leagueStatsQuery.data?.playerRankings.find(
        (row) => row.playerId === playerId && row.teamId === teamId,
      ) ?? null;
    const playerMatchesPlayed = playerRanking?.matchesPlayed ?? 0;

    return {
      leagueId: leagueId!,
      leagueName,
      teamId: teamId!,
      teamName,
      playerId: playerId!,
      playerMatchesPlayed,
      teamMatchesPlayed,
      participationRate: teamMatchesPlayed > 0 ? (playerMatchesPlayed / teamMatchesPlayed) * 100 : null,
      rankingPosition: playerRanking?.position ?? null,
      totalPoints: playerRanking?.totalPoints ?? 0,
      made1pt: playerRanking?.made1pt ?? 0,
      made2pt: playerRanking?.made2pt ?? 0,
      made3pt: playerRanking?.made3pt ?? 0,
      missedShots: playerRanking?.missedShots ?? 0,
      totalAssists: playerRanking?.totalAssists ?? 0,
      totalRebounds: playerRanking?.totalRebounds ?? 0,
      totalFouls: playerRanking?.totalFouls ?? 0,
      trackedStats: leagueStatsQuery.data?.trackedStats ?? [],
    } satisfies LeaguePlayerParticipation;
  }, [leagueId, leagueName, leagueStatsQuery.data?.playerRankings, leagueStatsQuery.data?.trackedStats, liveMatchesSnapshot.matches, playerId, shouldLoad, teamId, teamName]);

  return {
    data,
    loading: shouldLoad && (leagueStatsQuery.isPending || liveMatchesSnapshot.loading),
    error:
      data
        ? null
        : (leagueStatsQuery.error instanceof Error ? leagueStatsQuery.error.message : null) ?? liveMatchesSnapshot.error,
  };
}
