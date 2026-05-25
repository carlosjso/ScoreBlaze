import { useQuery } from "@tanstack/react-query";

import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import type { CompetitionType } from "@/features/leagues/Leagues.types";

export function useLeaguesData(competitionType?: CompetitionType) {
  const leaguesQuery = useQuery({
    queryKey: leaguesQueryKeys.catalog(competitionType),
    queryFn: ({ signal }) => leaguesService.getCatalog(competitionType, signal),
  });

  return {
    leagues: leaguesQuery.data ?? [],
    loading: leaguesQuery.isPending,
    error: leaguesQuery.error instanceof Error ? leaguesQuery.error.message : null,
    reload: () => leaguesQuery.refetch(),
  };
}
