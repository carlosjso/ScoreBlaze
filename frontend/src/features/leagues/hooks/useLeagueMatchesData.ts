import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { leagueMatchesQueryKeys, leagueMatchesService } from "@/features/leagues/LeagueMatches.service";
import { applyRealtimeScoreboardToQuickMatch } from "@/features/quick-matches/realtime/quickMatchRealtime";
import { buildQuickMatchesView } from "@/features/quick-matches/schemas/QuickMatches.schema";
import { useRealtimeScoreboards } from "@/features/scoreboard/hooks/useRealtimeScoreboards";

export function useLeagueMatchesData(leagueId: number | null) {
  const snapshotQuery = useQuery({
    queryKey: leagueMatchesQueryKeys.snapshot(leagueId ?? 0),
    enabled: Boolean(leagueId),
    queryFn: ({ signal }) => leagueMatchesService.getSnapshot(leagueId!, signal),
  });

  const snapshot = snapshotQuery.data;
  const matches = useMemo(
    () => buildQuickMatchesView(snapshot?.matches ?? [], snapshot?.teams ?? []),
    [snapshot?.matches, snapshot?.teams],
  );
  const liveMatchIds = useMemo(
    () => matches.filter((match) => match.status === "live").map((match) => match.id),
    [matches],
  );
  const realtimeScoreboards = useRealtimeScoreboards(liveMatchIds);
  const liveMatches = useMemo(
    () =>
      matches.map((match) => {
        const realtimeState = realtimeScoreboards[match.id];
        return realtimeState ? applyRealtimeScoreboardToQuickMatch(match, realtimeState) : match;
      }),
    [matches, realtimeScoreboards],
  );

  return {
    league: snapshot?.league ?? null,
    matches: liveMatches,
    teams: snapshot?.teams ?? [],
    loading: snapshotQuery.isPending,
    error: snapshotQuery.error instanceof Error ? snapshotQuery.error.message : null,
    reload: () => snapshotQuery.refetch(),
  };
}
