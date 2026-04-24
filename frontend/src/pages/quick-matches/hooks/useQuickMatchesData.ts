import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { quickMatchesQueryKeys, quickMatchesService } from "@/pages/quick-matches/QuickMatches.service";
import { buildQuickMatchesView } from "@/pages/quick-matches/schemas/QuickMatches.schema";

export function useQuickMatchesData() {
  const snapshotQuery = useQuery({
    queryKey: quickMatchesQueryKeys.snapshot(),
    queryFn: ({ signal }) => quickMatchesService.getSnapshot(signal),
  });

  const snapshot = snapshotQuery.data;

  const matches = useMemo(
    () => buildQuickMatchesView(snapshot?.matches ?? [], snapshot?.teams ?? []),
    [snapshot?.matches, snapshot?.teams]
  );

  return {
    matches,
    teams: snapshot?.teams ?? [],
    loading: snapshotQuery.isPending,
    error: snapshotQuery.error instanceof Error ? snapshotQuery.error.message : null,
    reload: () => snapshotQuery.refetch(),
  };
}
