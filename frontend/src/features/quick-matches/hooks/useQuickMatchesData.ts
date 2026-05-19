import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { applyRealtimeScoreboardToQuickMatch } from "@/features/quick-matches/realtime/quickMatchRealtime";
import { quickMatchesQueryKeys, quickMatchesService } from "@/features/quick-matches/QuickMatches.service";
import { buildQuickMatchesView } from "@/features/quick-matches/schemas/QuickMatches.schema";
import { useRealtimeScoreboards } from "@/features/scoreboard/hooks/useRealtimeScoreboards";

export function useQuickMatchesData() {
  const snapshotQuery = useQuery({
    queryKey: quickMatchesQueryKeys.snapshot(),
    queryFn: ({ signal }) => quickMatchesService.getSnapshot(signal),
  });

  const snapshot = snapshotQuery.data;

  const matches = useMemo(() => {
    const quickMatches = (snapshot?.matches ?? []).filter((match) => match.league_id === null);
    return buildQuickMatchesView(quickMatches, snapshot?.teams ?? []);
  }, [snapshot?.matches, snapshot?.teams]);
  const liveMatchIds = useMemo(
    () => matches.filter((match) => match.status === "live").map((match) => match.id),
    [matches],
  );
  const realtimeScoreboards = useRealtimeScoreboards(liveMatchIds);
  const liveMatches = useMemo(
    () =>
      matches.map((match) => {
        const realtimeState = realtimeScoreboards[match.id];
        return realtimeState
          ? applyRealtimeScoreboardToQuickMatch(match, realtimeState)
          : match;
      }),
    [matches, realtimeScoreboards],
  );

  return {
    matches: liveMatches,
    teams: snapshot?.teams ?? [],
    loading: snapshotQuery.isPending,
    error: snapshotQuery.error instanceof Error ? snapshotQuery.error.message : null,
    reload: () => snapshotQuery.refetch(),
  };
}

