import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { teamsQueryKeys, teamsService } from "@/pages/teams/Teams.service";
import { buildTeamsView } from "@/pages/teams/schemas/Teams.schema";

export function useTeamsData() {
  const snapshotQuery = useQuery({
    queryKey: teamsQueryKeys.snapshot(),
    queryFn: ({ signal }) => teamsService.getSnapshot(signal),
  });

  const snapshot = snapshotQuery.data;

  const teams = useMemo(
    () => buildTeamsView(snapshot?.teams ?? [], snapshot?.players ?? [], snapshot?.memberships ?? []),
    [snapshot?.memberships, snapshot?.players, snapshot?.teams]
  );

  return {
    teams,
    players: snapshot?.players ?? [],
    loading: snapshotQuery.isPending,
    error: snapshotQuery.error instanceof Error ? snapshotQuery.error.message : null,
    reload: () => snapshotQuery.refetch(),
  };
}
