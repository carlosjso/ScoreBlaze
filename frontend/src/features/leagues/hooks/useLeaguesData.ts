import { useQuery } from "@tanstack/react-query";

import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";

export function useLeaguesData() {
  const leaguesQuery = useQuery({
    queryKey: leaguesQueryKeys.catalog(),
    queryFn: ({ signal }) => leaguesService.getCatalog(signal),
  });

  return {
    leagues: leaguesQuery.data ?? [],
    loading: leaguesQuery.isPending,
    error: leaguesQuery.error instanceof Error ? leaguesQuery.error.message : null,
    reload: () => leaguesQuery.refetch(),
  };
}
