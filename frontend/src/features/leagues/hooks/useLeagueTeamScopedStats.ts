import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useLeagueMatchesData } from "@/features/leagues/hooks/useLeagueMatchesData";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import { buildLiveLeagueStandings } from "@/features/leagues/realtime/leagueStandingsRealtime";
import { buildLeagueTeamStats } from "@/features/teams/teamDetailStats";

type UseLeagueTeamScopedStatsOptions = {
  leagueId: number | null;
  leagueName: string | null;
  teamId: number | null;
};

export function useLeagueTeamScopedStats({ leagueId, leagueName, teamId }: UseLeagueTeamScopedStatsOptions) {
  const hasValidLeagueId = typeof leagueId === "number" && leagueId > 0;
  const shouldLoad = hasValidLeagueId && typeof teamId === "number" && teamId > 0;
  const liveMatchesSnapshot = useLeagueMatchesData(shouldLoad ? leagueId : null);

  const leagueStatsQuery = useQuery({
    queryKey: leaguesQueryKeys.stats(leagueId ?? 0),
    enabled: shouldLoad,
    queryFn: ({ signal }) => leaguesService.getLeagueStats(leagueId!, signal),
  });

  const liveStandingsSnapshot = useMemo(
    () => (leagueStatsQuery.data ? buildLiveLeagueStandings(leagueStatsQuery.data.standings, liveMatchesSnapshot.matches) : null),
    [leagueStatsQuery.data, liveMatchesSnapshot.matches],
  );

  const data = useMemo(() => {
    if (!shouldLoad || !leagueName) {
      return null;
    }

    const standingsRow =
      liveStandingsSnapshot?.rows.find((row) => row.teamId === teamId)
      ?? leagueStatsQuery.data?.standings.find((row) => row.teamId === teamId)
      ?? null;
    const hasAnySource = Boolean(standingsRow) || liveMatchesSnapshot.matches.length > 0;

    if (!hasAnySource && (leagueStatsQuery.isPending || liveMatchesSnapshot.loading)) {
      return null;
    }

    if (!hasAnySource && (leagueStatsQuery.error || liveMatchesSnapshot.error)) {
      return null;
    }

    return buildLeagueTeamStats({
      teamId: teamId!,
      leagueId: leagueId!,
      leagueName,
      matches: liveMatchesSnapshot.matches,
      standingsRow,
      updatedAt: leagueStatsQuery.data?.updatedAt ?? null,
    });
  }, [
    leagueId,
    leagueName,
    leagueStatsQuery.data?.standings,
    leagueStatsQuery.data?.updatedAt,
    leagueStatsQuery.error,
    leagueStatsQuery.isPending,
    liveMatchesSnapshot.error,
    liveMatchesSnapshot.loading,
    liveMatchesSnapshot.matches,
    liveStandingsSnapshot?.rows,
    shouldLoad,
    teamId,
  ]);

  return {
    data,
    loading: shouldLoad && (leagueStatsQuery.isPending || liveMatchesSnapshot.loading),
    error:
      data
        ? null
        : (leagueStatsQuery.error instanceof Error ? leagueStatsQuery.error.message : null) ?? liveMatchesSnapshot.error,
  };
}
