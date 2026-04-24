import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { playersQueryKeys, playersService } from "@/pages/players/Players.service";
import { buildPlayersView } from "@/pages/players/schemas/Players.schema";

export function usePlayersData() {
  const snapshotQuery = useQuery({
    queryKey: playersQueryKeys.snapshot(),
    queryFn: ({ signal }) => playersService.getSnapshot(signal),
  });

  const snapshot = snapshotQuery.data;

  const players = useMemo(
    () => buildPlayersView(snapshot?.players ?? [], snapshot?.teams ?? [], snapshot?.memberships ?? []),
    [snapshot?.memberships, snapshot?.players, snapshot?.teams]
  );

  return {
    players,
    teams: snapshot?.teams ?? [],
    loading: snapshotQuery.isPending,
    error: snapshotQuery.error instanceof Error ? snapshotQuery.error.message : null,
    reload: () => snapshotQuery.refetch(),
  };
}
