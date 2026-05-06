import { useQuery } from "@tanstack/react-query";

import { playersQueryKeys, playersService } from "@/features/players/Players.service";
import type { SortDir, SortKey, TeamFilterValue } from "@/features/players/Players.types";
import { teamsQueryKeys, teamsService } from "@/features/teams/Teams.service";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

type UsePlayersTableDataParams = {
  page: number;
  search: string;
  teamFilter: TeamFilterValue;
  sortKey: SortKey;
  sortDir: SortDir;
};

export function usePlayersTableData({
  page,
  search,
  teamFilter,
  sortKey,
  sortDir,
}: UsePlayersTableDataParams) {
  const playersQuery = useQuery({
    queryKey: playersQueryKeys.table({
      page,
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
      search,
      teamFilter,
      sortKey,
      sortDir,
    }),
    queryFn: ({ signal }) =>
      playersService.getTablePage(
        {
          page,
          pageSize: DEFAULT_TABLE_PAGE_SIZE,
          search,
          teamFilter,
          sortKey,
          sortDir,
        },
        signal,
      ),
  });

  const teamsQuery = useQuery({
    queryKey: teamsQueryKeys.catalog(),
    queryFn: ({ signal }) => teamsService.getCatalog(signal),
  });

  return {
    players: playersQuery.data?.items ?? [],
    teams: teamsQuery.data ?? [],
    page: playersQuery.data?.page ?? page,
    pageSize: playersQuery.data?.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
    totalItems: playersQuery.data?.totalItems ?? 0,
    totalPages: playersQuery.data?.totalPages ?? 1,
    loading: playersQuery.isPending || teamsQuery.isPending,
    error:
      (playersQuery.error instanceof Error ? playersQuery.error.message : null)
      ?? (teamsQuery.error instanceof Error ? teamsQuery.error.message : null),
  };
}
