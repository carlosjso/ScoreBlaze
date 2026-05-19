import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { playersQueryKeys, playersService } from "@/features/players/Players.service";
import { buildHistoricalPlayerStats } from "@/features/players/playerDetailStats";
import type { PlayerListItem } from "@/features/players/Players.types";

export function usePlayerHistoricalStats(player: PlayerListItem | null) {
  const playerId = player?.id ?? null;
  const shouldLoad = typeof playerId === "number" && playerId > 0;

  const statsQuery = useQuery({
    queryKey: playersQueryKeys.stats(playerId ?? 0),
    enabled: shouldLoad,
    queryFn: ({ signal }) => playersService.getPlayerStats(playerId!, signal),
  });

  const data = useMemo(() => {
    if (!player) {
      return null;
    }

    return buildHistoricalPlayerStats(player, statsQuery.data ?? null);
  }, [player, statsQuery.data]);

  return {
    data,
    loading: shouldLoad && statsQuery.isPending,
    error: statsQuery.error instanceof Error ? statsQuery.error.message : null,
  };
}
