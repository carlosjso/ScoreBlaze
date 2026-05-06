import { useQuery } from "@tanstack/react-query";

import { playersQueryKeys, playersService } from "@/features/players/Players.service";
import type { SortDir, SortKey } from "@/features/players/Players.types";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

type UsePlayersTableDataParams = {
  page: number;
  search: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

export function usePlayersTableData({
  page,
  search,
  sortKey,
  sortDir,
}: UsePlayersTableDataParams) {
  const playersQuery = useQuery({
    queryKey: playersQueryKeys.table({
      page,
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
      search,
      sortKey,
      sortDir,
    }),
    queryFn: ({ signal }) =>
      playersService.getTablePage(
        {
          page,
          pageSize: DEFAULT_TABLE_PAGE_SIZE,
          search,
          sortKey,
          sortDir,
        },
        signal,
      ),
  });

  return {
    players: playersQuery.data?.items ?? [],
    page: playersQuery.data?.page ?? page,
    pageSize: playersQuery.data?.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
    totalItems: playersQuery.data?.totalItems ?? 0,
    totalPages: playersQuery.data?.totalPages ?? 1,
    loading: playersQuery.isPending,
    error: playersQuery.error instanceof Error ? playersQuery.error.message : null,
  };
}
